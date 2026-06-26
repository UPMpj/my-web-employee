import { Router } from "express";
import { pool } from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { auth, JWT_SECRET } from "../middleware/auth";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { authenticator } from "otplib";
import { logAudit } from "../utils/auditLog";
import { generateBackupCodes, consumeBackupCode } from "../utils/twofaCodes";

/* ── Rate limiters ── */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "ລອງໃໝ່ໃນ 15 ນາທີ (ລ็ອກອິນຫຼາຍຄັ້ງເກີນໄປ)" },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 ຊົ່ວໂມງ
  max: 3,                      // max 3 ຄັ້ງ/ຊົ່ວໂມງ
  message: { message: "ຮ້ອງຂໍ reset ເກີນ 3 ຄັ້ງ/ຊົ່ວໂມງ — ລອງໃໝ່ພາຍຫຼັງ" },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.email || ipKeyGenerator(req.ip || ''),
});

/* ── Password strength validator ── */
function validatePassword(pw: string): string | null {
  if (pw.length < 8)                       return "ລະຫັດຜ່ານຕ້ອງຢ່າງໜ້ອຍ 8 ຕົວ";
  if (!/[A-Z]/.test(pw))                   return "ຕ້ອງມີຕົວອັກສອນພິມໃຫຍ່ຢ່າງໜ້ອຍ 1 ໂຕ";
  if (!/[0-9]/.test(pw))                   return "ຕ້ອງມີຕົວເລກຢ່າງໜ້ອຍ 1 ໂຕ";
  if (!/[^A-Za-z0-9]/.test(pw))            return "ຕ້ອງມີຕົວອັກສອນພິເສດຢ່າງໜ້ອຍ 1 ໂຕ (@, #, !, ...)";
  return null;
}

/* ── Email regex ── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ── Mailer helper ── */
function createTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });
}

const router = Router();

/* ── Issue the real session (cookie + JSON body) once auth (incl. 2FA, if any) is fully done ── */
function issueSession(res: any, user: any) {
  const token = jwt.sign(
    { user_id: user.user_id, role: user.role_name, jti: crypto.randomUUID() },
    JWT_SECRET(),
    { expiresIn: "1d" }
  );
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    path: "/",
  });
  return {
    token, // still returned so existing clients don't break
    user: {
      user_id: user.user_id,
      fullname: user.fullname,
      email: user.email,
      role: user.role_name,
    },
  };
}

/* Single-purpose tokens for the 2FA login flow — 5 min, rejected by the main `auth`
   middleware (purpose claim), so they can never be used as a real session. */
function signPurposeToken(purpose: string, user_id: number) {
  return jwt.sign({ purpose, user_id }, JWT_SECRET(), { expiresIn: "5m" });
}
function verifyPurposeToken(token: string, purpose: string): { user_id: number } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET()) as any;
    if (payload.purpose !== purpose) return null;
    return { user_id: payload.user_id };
  } catch {
    return null;
  }
}

/* ══════════════════════════════════════════════
   POST /api/auth/login
══════════════════════════════════════════════ */
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    if (!EMAIL_RE.test(email))
      return res.status(400).json({ message: "Email format invalid" });

    const result = await pool.query(
      `SELECT u.*, r.role_name
       FROM users u
       LEFT JOIN role r ON r.role_id = u.role_id
       WHERE LOWER(u.email) = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ message: "Invalid email or password" });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ message: "Invalid email or password" });

    /* Already enrolled in 2FA — must verify a code before getting a real session */
    if (user.totp_enabled) {
      return res.json({ requires_2fa: true, challenge_token: signPurposeToken("2fa_challenge", user.user_id) });
    }

    /* Super Admin + org-wide 2FA requirement, but this account hasn't enrolled yet —
       let them in just far enough to set it up, not all the way to the dashboard. */
    if (user.role_name === "Super Admin") {
      const requireRow = await pool.query(`SELECT value FROM app_settings WHERE key='require_2fa'`);
      if (requireRow.rows[0]?.value === "true") {
        return res.json({ setup_2fa_required: true, setup_token: signPurposeToken("2fa_setup", user.user_id) });
      }
    }

    logAudit({ userId: user.user_id, action: "LOGIN", entityType: "user", entityId: user.user_id });
    return res.json(issueSession(res, user));
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ══════════════════════════════════════════════
   POST /api/auth/login/2fa — complete login for an account that already has 2FA enabled
══════════════════════════════════════════════ */
router.post("/login/2fa", loginLimiter, async (req, res) => {
  try {
    const { challenge_token, code, backup_code } = req.body;
    if (!challenge_token || (!code && !backup_code))
      return res.status(400).json({ message: "ຂໍ້ມູນບໍ່ຄົບ" });

    const payload = verifyPurposeToken(challenge_token, "2fa_challenge");
    if (!payload) return res.status(401).json({ message: "Session ໝົດອາຍຸ, ກະລຸນາ login ໃໝ່" });

    const result = await pool.query(
      `SELECT u.*, r.role_name FROM users u LEFT JOIN role r ON r.role_id=u.role_id WHERE u.user_id=$1`,
      [payload.user_id]
    );
    if (result.rows.length === 0) return res.status(401).json({ message: "User not found" });
    const user = result.rows[0];

    const ok = code
      ? authenticator.verify({ token: code, secret: user.totp_secret })
      : await consumeBackupCode(user.user_id, user.totp_backup_codes, backup_code);
    if (!ok) return res.status(401).json({ message: "ລະຫັດບໍ່ຖືກຕ້ອງ" });

    logAudit({ userId: user.user_id, action: "LOGIN_2FA", entityType: "user", entityId: user.user_id });
    return res.json(issueSession(res, user));
  } catch (err) {
    console.error("LOGIN 2FA ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ══════════════════════════════════════════════
   Forced 2FA enrollment during login (require_2fa is on, account not enrolled yet)
══════════════════════════════════════════════ */
router.post("/login/setup-2fa/start", loginLimiter, async (req, res) => {
  try {
    const payload = verifyPurposeToken(req.body.setup_token, "2fa_setup");
    if (!payload) return res.status(401).json({ message: "Session ໝົດອາຍຸ, ກະລຸນາ login ໃໝ່" });

    const userRes = await pool.query(`SELECT email FROM users WHERE user_id=$1`, [payload.user_id]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: "User not found" });

    const secret = authenticator.generateSecret();
    await pool.query(`UPDATE users SET totp_secret=$1 WHERE user_id=$2`, [secret, payload.user_id]);
    const otpauth_url = authenticator.keyuri(userRes.rows[0].email, "CCMS", secret);
    res.json({ secret, otpauth_url });
  } catch (err) {
    console.error("LOGIN SETUP-2FA START ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

router.post("/login/setup-2fa/confirm", loginLimiter, async (req, res) => {
  try {
    const { setup_token, code } = req.body;
    const payload = verifyPurposeToken(setup_token, "2fa_setup");
    if (!payload) return res.status(401).json({ message: "Session ໝົດອາຍຸ, ກະລຸນາ login ໃໝ່" });

    const result = await pool.query(
      `SELECT u.*, r.role_name FROM users u LEFT JOIN role r ON r.role_id=u.role_id WHERE u.user_id=$1`,
      [payload.user_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
    const user = result.rows[0];
    if (!user.totp_secret) return res.status(400).json({ message: "ກະລຸນາ scan QR code ກ່ອນ" });
    if (!authenticator.verify({ token: code, secret: user.totp_secret })) {
      return res.status(401).json({ message: "ລະຫັດບໍ່ຖືກຕ້ອງ" });
    }

    const { plain, hashed } = await generateBackupCodes();
    await pool.query(
      `UPDATE users SET totp_enabled=true, totp_backup_codes=$1 WHERE user_id=$2`,
      [JSON.stringify(hashed), user.user_id]
    );

    logAudit({ userId: user.user_id, action: "2FA_ENABLED", entityType: "user", entityId: user.user_id });
    logAudit({ userId: user.user_id, action: "LOGIN", entityType: "user", entityId: user.user_id });
    return res.json({ ...issueSession(res, user), backupCodes: plain });
  } catch (err) {
    console.error("LOGIN SETUP-2FA CONFIRM ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ══════════════════════════════════════════════
   POST /api/auth/logout
══════════════════════════════════════════════ */
router.post("/logout", auth, async (req: any, res) => {
  const jti    = req.user?.jti;
  const userId = req.user?.user_id;
  if (jti) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [jti, expiresAt]
    ).catch(() => {});
  }
  if (userId) {
    logAudit({ userId, action: "LOGOUT", entityType: "user", entityId: userId });
  }
  // Clear the httpOnly cookie
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  });
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════
   POST /api/auth/change-password
══════════════════════════════════════════════ */
router.post("/change-password", auth, async (req: any, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password)
      return res.status(400).json({ message: "ຕ້ອງໃສ່ລະຫັດຜ່ານທັງໝົດ" });

    const pwError = validatePassword(new_password);
    if (pwError) return res.status(400).json({ message: pwError });

    const result = await pool.query(
      `SELECT password_hash FROM users WHERE user_id=$1`, [req.user.user_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!match)
      return res.status(400).json({ message: "ລະຫັດຜ່ານປັດຈຸບັນບໍ່ຖືກຕ້ອງ" });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query(
      `UPDATE users SET password_hash=$1 WHERE user_id=$2`, [hash, req.user.user_id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ══════════════════════════════════════════════
   POST /api/auth/forgot-password
══════════════════════════════════════════════ */
router.post("/forgot-password", forgotLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !EMAIL_RE.test(email))
      return res.status(400).json({ message: "ກະລຸນາໃສ່ email ທີ່ຖືກຕ້ອງ" });

    const result = await pool.query(
      `SELECT user_id, fullname FROM users WHERE email=$1`,
      [email.toLowerCase().trim()]
    );

    /* always respond ok to prevent email enumeration */
    if (result.rows.length === 0) return res.json({ ok: true });

    const user  = result.rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const exp   = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE user_id=$3`,
      [token, exp, user.user_id]
    );

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}`;

    if (process.env.MAIL_USER) {
      await createTransport().sendMail({
        from: `"UDM CMS" <${process.env.MAIL_USER}>`,
        to: email,
        subject: "ຕັ້ງລະຫັດຜ່ານໃໝ່ — UDM CMS",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px;">
            <h2 style="color:#1a1a2e;margin:0 0 8px">ຕັ້ງລະຫັດຜ່ານໃໝ່</h2>
            <p style="color:#6b7280;margin:0 0 24px">ສະບາຍດີ ${user.fullname},<br/>ກົດປຸ່ມລຸ່ມນີ້ເພື່ອຕັ້ງລະຫັດຜ່ານໃໝ່. Link ໃຊ້ໄດ້ 1 ຊົ່ວໂມງ.</p>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background:#2f4aad;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">ຕັ້ງລະຫັດຜ່ານໃໝ່</a>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px;">ຖ້າທ່ານບໍ່ໄດ້ຮ້ອງຂໍ, ກະລຸນາລະເລີຍ email ນີ້.</p>
          </div>`,
      }).catch(console.error);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR", err);
    res.status(500).json({ message: "ສົ່ງ email ບໍ່ສຳເລັດ" });
  }
});

/* ══════════════════════════════════════════════
   POST /api/auth/reset-password
══════════════════════════════════════════════ */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password)
      return res.status(400).json({ message: "ຂໍ້ມູນບໍ່ຄົບ" });

    const pwError = validatePassword(new_password);
    if (pwError) return res.status(400).json({ message: pwError });

    const result = await pool.query(
      `SELECT user_id FROM users WHERE reset_token=$1 AND reset_token_expires > NOW()`,
      [token]
    );
    if (result.rows.length === 0)
      return res.status(400).json({ message: "Link ໝົດອາຍຸ ຫຼື ບໍ່ຖືກຕ້ອງ" });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query(
      `UPDATE users SET password_hash=$1, reset_token=NULL, reset_token_expires=NULL WHERE user_id=$2`,
      [hash, result.rows[0].user_id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("RESET PASSWORD ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ══════════════════════════════════════════════
   PATCH /api/auth/profile  — ອັບເດດຂໍ້ມູນຕົນເອງ (ທຸກ role)
══════════════════════════════════════════════ */
router.patch("/profile", auth, async (req: any, res) => {
  try {
    const { fullname, email } = req.body;
    if (!fullname?.trim() || !email?.trim())
      return res.status(400).json({ message: "ກະລຸນາໃສ່ຂໍ້ມູນໃຫ້ຄົບ" });

    if (!EMAIL_RE.test(email))
      return res.status(400).json({ message: "Email format invalid" });

    const cleanEmail = email.toLowerCase().trim();
    const exists = await pool.query(
      `SELECT user_id FROM users WHERE LOWER(email)=$1 AND user_id != $2`,
      [cleanEmail, req.user.user_id]
    );
    if (exists.rows.length > 0)
      return res.status(400).json({ message: "Email ນີ້ຖືກໃຊ້ແລ້ວ" });

    await pool.query(
      `UPDATE users SET fullname=$1, email=$2 WHERE user_id=$3`,
      [fullname.trim(), cleanEmail, req.user.user_id]
    );
    res.json({ ok: true, fullname: fullname.trim(), email: cleanEmail });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
