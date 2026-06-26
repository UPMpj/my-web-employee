import { Router } from "express";
import { authenticator } from "otplib";
import bcrypt from "bcrypt";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { logAudit } from "../utils/auditLog";
import { generateBackupCodes } from "../utils/twofaCodes";

const router = Router();

/* GET /api/2fa/status — current user's enrollment state */
router.get("/status", auth, async (req: any, res) => {
  try {
    const r = await pool.query(`SELECT totp_enabled FROM users WHERE user_id=$1`, [req.user.user_id]);
    res.json({ enabled: r.rows[0]?.totp_enabled || false });
  } catch (err) {
    console.error("2FA STATUS ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* POST /api/2fa/setup — generate a pending secret + QR data (not enabled until /confirm) */
router.post("/setup", auth, async (req: any, res) => {
  try {
    const userRes = await pool.query(`SELECT email FROM users WHERE user_id=$1`, [req.user.user_id]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: "User not found" });

    const secret = authenticator.generateSecret();
    await pool.query(`UPDATE users SET totp_secret=$1 WHERE user_id=$2`, [secret, req.user.user_id]);
    const otpauth_url = authenticator.keyuri(userRes.rows[0].email, "CCMS", secret);
    res.json({ secret, otpauth_url });
  } catch (err) {
    console.error("2FA SETUP ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* POST /api/2fa/confirm — verify the first code, enable 2FA, issue backup codes once */
router.post("/confirm", auth, async (req: any, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "ກະລຸນາໃສ່ລະຫັດ" });

    const userRes = await pool.query(`SELECT totp_secret FROM users WHERE user_id=$1`, [req.user.user_id]);
    const secret = userRes.rows[0]?.totp_secret;
    if (!secret) return res.status(400).json({ message: "ກະລຸນາ scan QR code ກ່ອນ" });
    if (!authenticator.verify({ token: code, secret })) {
      return res.status(401).json({ message: "ລະຫັດບໍ່ຖືກຕ້ອງ" });
    }

    const { plain, hashed } = await generateBackupCodes();
    await pool.query(
      `UPDATE users SET totp_enabled=true, totp_backup_codes=$1 WHERE user_id=$2`,
      [JSON.stringify(hashed), req.user.user_id]
    );
    logAudit({ userId: req.user.user_id, action: "2FA_ENABLED", entityType: "user", entityId: req.user.user_id });
    res.json({ ok: true, backupCodes: plain });
  } catch (err) {
    console.error("2FA CONFIRM ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* POST /api/2fa/disable — requires current password as a safety check */
router.post("/disable", auth, async (req: any, res) => {
  try {
    const { current_password } = req.body;
    const userRes = await pool.query(`SELECT password_hash FROM users WHERE user_id=$1`, [req.user.user_id]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(current_password || "", userRes.rows[0].password_hash);
    if (!match) return res.status(400).json({ message: "ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ" });

    await pool.query(
      `UPDATE users SET totp_secret=NULL, totp_enabled=false, totp_backup_codes=NULL WHERE user_id=$1`,
      [req.user.user_id]
    );
    logAudit({ userId: req.user.user_id, action: "2FA_DISABLED", entityType: "user", entityId: req.user.user_id });
    res.json({ ok: true });
  } catch (err) {
    console.error("2FA DISABLE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
