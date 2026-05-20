import { Router } from "express";
import { pool } from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { auth } from "../middleware/auth";
import crypto from "crypto";
import nodemailer from "nodemailer";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "ລອງໃໝ່ໃນ 15 ນາທີ (ລ็ອກອິນຫຼາຍຄັ້ງເກີນໄປ)" },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔎 เช็ค input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // 🔎 หา user
    const result = await pool.query(
      `
      SELECT u.*, r.role_name
      FROM users u
      LEFT JOIN role r ON r.role_id = u.role_id
      WHERE u.email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result.rows[0];

    // 🔐 เช็ครหัสผ่าน
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 🎟 สร้าง JWT
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role_name },
      process.env.JWT_SECRET || "cms_super_secret_jwt_2024_do_not_share",
      { expiresIn: "1d" }
    );

    // ✅ ส่งกลับ frontend
    return res.json({
      token,
      user: {
        user_id: user.user_id,
        fullname: user.fullname,
        email: user.email,
        role: user.role_name,
      },
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

/* POST /api/auth/change-password */
router.post("/change-password", auth, async (req: any, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ message: "ຕ້ອງໃສ່ລະຫັດຜ່ານທັງໝົດ" });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ message: "ລະຫັດຜ່ານໃໝ່ຕ້ອງຢ່າງໜ້ອຍ 6 ຕົວ" });
    }

    const result = await pool.query(
      `SELECT password_hash FROM users WHERE user_id=$1`, [req.user.user_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!match) return res.status(400).json({ message: "ລະຫັດຜ່ານປັດຈຸບັນບໍ່ຖືກຕ້ອງ" });

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query(`UPDATE users SET password_hash=$1 WHERE user_id=$2`, [hash, req.user.user_id]);

    res.json({ ok: true });
  } catch (err) {
    console.log("CHANGE PASSWORD ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── mailer helper ── */
function createTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

/* POST /api/auth/forgot-password */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "ກະລຸນາໃສ່ email" });

    const result = await pool.query(
      `SELECT user_id, fullname FROM users WHERE email=$1`, [email]
    );
    /* ສົ່ງ response ດຽວກັນໄວ້ ເພື່ອບໍ່ໃຫ້ enumeration attack */
    if (result.rows.length === 0) {
      return res.json({ ok: true });
    }

    const user  = result.rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const exp   = new Date(Date.now() + 60 * 60 * 1000); // 1 ຊົ່ວໂມງ

    await pool.query(
      `UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE user_id=$3`,
      [token, exp, user.user_id]
    );

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}`;

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
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR", err);
    res.status(500).json({ message: "ສົ່ງ email ບໍ່ສຳເລັດ" });
  }
});

/* POST /api/auth/reset-password */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ message: "ຂໍ້ມູນບໍ່ຄົບ" });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ message: "ລະຫັດຜ່ານຕ້ອງຢ່າງໜ້ອຍ 6 ຕົວ" });
    }

    const result = await pool.query(
      `SELECT user_id FROM users WHERE reset_token=$1 AND reset_token_expires > NOW()`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Link ໝົດອາຍຸ ຫຼື ບໍ່ຖືກຕ້ອງ" });
    }

    const hash = await bcrypt.hash(new_password, 10);
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

/* POST /api/auth/init-admin  — TEMPORARY: remove after first use */
router.post("/init-admin", async (req, res) => {
  const { secret } = req.body;
  if (secret !== "RESET_ME_NOW_2024") {
    return res.status(403).json({ message: "forbidden" });
  }
  try {
    const hash = await bcrypt.hash("Admin@1234", 10);
    const result = await pool.query(
      `UPDATE users SET password_hash=$1
       WHERE role_id = (SELECT role_id FROM role WHERE role_name='Super Admin')
       RETURNING email, fullname`,
      [hash]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Super Admin not found" });
    }
    res.json({ ok: true, updated: result.rows });
  } catch (err) {
    console.error("INIT ADMIN ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;