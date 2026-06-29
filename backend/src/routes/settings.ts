import { Router } from "express";
import multer from "multer";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { allow } from "../middleware/role";
import { uploadToCloudinary, deleteFromCloudinary, getBackupDownloadUrl } from "../cloudinary";
import { validateUpload } from "../utils/validateFile";
import { logAudit, invalidateAuditCache } from "../utils/auditLog";
import { runExpiryAlertCheck } from "../utils/expiryAlerts";
import { runBackupNow } from "../utils/backupRun";
import { restoreFromBackup } from "../utils/restoreRun";

const router = Router();

const FEATURE_KEYS = [
  "audit_logging_enabled", "id_card_expiry_alerts_enabled", "id_card_expiry_alert_days",
  "require_2fa", "auto_backup_enabled", "auto_backup_hour_ict", "admin_email",
  "about_company_name", "about_email", "about_contact",
];

/* GET /api/settings/features — any authenticated role can read current toggle states */
router.get("/features", auth, async (_req, res) => {
  try {
    const r = await pool.query(`SELECT key, value FROM app_settings WHERE key = ANY($1)`, [FEATURE_KEYS]);
    const data: Record<string, string> = {};
    r.rows.forEach(row => { data[row.key] = row.value; });
    res.json(data);
  } catch (err) {
    console.error("GET FEATURES ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* PUT /api/settings/features/:key — Super Admin only — generic allowlisted toggle/value setter */
router.put("/features/:key", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { key } = req.params;
    if (!FEATURE_KEYS.includes(key)) return res.status(400).json({ message: "Unknown setting key" });
    const value = String(req.body.value ?? "");
    await pool.query(
      `INSERT INTO app_settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
      [key, value]
    );
    if (key === "audit_logging_enabled") invalidateAuditCache();
    logAudit({ userId: req.user.user_id, action: "UPDATE_SETTING", entityType: "app_settings", entityId: key });
    res.json({ ok: true, key, value });
  } catch (err) {
    console.error("SAVE FEATURE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* POST /api/settings/run-expiry-check — Super Admin only — manual "Check Now" trigger */
router.post("/run-expiry-check", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const result = await runExpiryAlertCheck();
    logAudit({ userId: req.user.user_id, action: "EXPIRY_ALERT_CHECK", entityType: "employee_permits", entityId: `sent_${result.alertsSent}` });
    res.json(result);
  } catch (err) {
    console.error("RUN EXPIRY CHECK ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* POST /api/settings/backup/run-now — Super Admin only — manual "Backup Now" trigger */
router.post("/backup/run-now", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const result = await runBackupNow("manual");
    res.json(result);
  } catch (err) {
    console.error("RUN BACKUP ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* GET /api/settings/backup/history — Super Admin only */
router.get("/backup/history", auth, allow("Super Admin"), async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, status, file_size_kb, triggered_by, error_message, started_at, finished_at
       FROM backup_history ORDER BY started_at DESC LIMIT 30`
    );
    res.json(r.rows);
  } catch (err) {
    console.error("BACKUP HISTORY ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* POST /api/settings/backup/:id/restore — Super Admin only — DESTRUCTIVE: wipes current
   data and replaces it with the chosen backup. Requires the literal confirm text "RESTORE"
   so this can't be triggered by an accidental click or a replayed request. */
router.post("/backup/:id/restore", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    if (req.body?.confirm !== "RESTORE") {
      return res.status(400).json({ message: "Confirmation text did not match" });
    }
    const r = await pool.query(`SELECT file_public_id FROM backup_history WHERE id=$1 AND status='success'`, [req.params.id]);
    if (r.rows.length === 0 || !r.rows[0].file_public_id) return res.status(404).json({ message: "Backup not found" });

    const result = await restoreFromBackup(Number(req.params.id), r.rows[0].file_public_id);
    res.json(result);
  } catch (err) {
    console.error("RESTORE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* GET /api/settings/backup/:id/download — Super Admin only — mints a fresh signed URL and redirects */
router.get("/backup/:id/download", auth, allow("Super Admin"), async (req, res) => {
  try {
    const r = await pool.query(`SELECT file_public_id FROM backup_history WHERE id=$1 AND status='success'`, [req.params.id]);
    if (r.rows.length === 0 || !r.rows[0].file_public_id) return res.status(404).json({ message: "Backup not found" });
    const url = getBackupDownloadUrl(r.rows[0].file_public_id);
    res.redirect(url);
  } catch (err) {
    console.error("BACKUP DOWNLOAD ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed for the logo") as any, false);
  },
});

/* GET /api/settings — public: sys_name + logo_url */
router.get("/", async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT key, value FROM app_settings WHERE key IN ('sys_name', 'logo_url')`
    );
    const data: Record<string, string> = {};
    r.rows.forEach(row => { data[row.key] = row.value; });
    res.json({ sys_name: data.sys_name || "CCMS", logo_url: data.logo_url || null });
  } catch {
    res.json({ sys_name: "CCMS", logo_url: null });
  }
});

/* PUT /api/settings/sys-name — Super Admin only */
router.put("/sys-name", auth, allow("Super Admin"), async (req, res) => {
  try {
    const value = ((req.body.sys_name as string) || "CCMS").trim().substring(0, 50);
    await pool.query(
      `INSERT INTO app_settings (key, value) VALUES ('sys_name', $1)
       ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()`,
      [value]
    );
    res.json({ ok: true, sys_name: value });
  } catch (err) {
    console.error("SAVE SYS NAME ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* PUT /api/settings/logo — Super Admin only — upload to Cloudinary */
router.put("/logo", auth, allow("Super Admin"), upload.single("logo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "ກະລຸນາເລືອກໄຟລ໌" });
    const fileErr = validateUpload(req.file.buffer, "image");
    if (fileErr) return res.status(400).json({ message: fileErr });

    const old = await pool.query(`SELECT value FROM app_settings WHERE key='logo_url'`);
    if (old.rows[0]?.value) await deleteFromCloudinary(old.rows[0].value).catch(() => {});

    const logo_url = await uploadToCloudinary(req.file.buffer, "logos");
    await pool.query(
      `INSERT INTO app_settings (key, value) VALUES ('logo_url', $1)
       ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()`,
      [logo_url]
    );
    res.json({ ok: true, logo_url });
  } catch (err) {
    console.error("SAVE LOGO ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE /api/settings/logo — Super Admin only */
router.delete("/logo", auth, allow("Super Admin"), async (_req, res) => {
  try {
    const old = await pool.query(`SELECT value FROM app_settings WHERE key='logo_url'`);
    if (old.rows[0]?.value) await deleteFromCloudinary(old.rows[0].value).catch(() => {});
    await pool.query(`DELETE FROM app_settings WHERE key='logo_url'`);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE LOGO ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
