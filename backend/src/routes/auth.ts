import { Router } from "express";
import { pool } from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { auth } from "../middleware/auth";

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

export default router;