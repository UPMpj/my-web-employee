import { Router } from "express";
import multer from "multer";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { allow } from "../middleware/role";
import { uploadToCloudinary, deleteFromCloudinary } from "../cloudinary";
import { validateUpload } from "../utils/validateFile";

const router = Router();
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
