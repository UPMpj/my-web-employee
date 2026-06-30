import { Router } from "express";
import { pool } from "../db";
import bcrypt from "bcrypt";
import { auth } from "../middleware/auth";
import { allow } from "../middleware/role";

const router = Router();

/* ── shared validators (match auth.ts rules exactly) ── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePassword(pw: string): string | null {
  if (pw.length < 8)              return "ລະຫັດຜ່ານຕ້ອງຢ່າງໜ້ອຍ 8 ຕົວ";
  if (!/[A-Z]/.test(pw))          return "ຕ້ອງມີຕົວອັກສອນພິມໃຫຍ່ຢ່າງໜ້ອຍ 1 ໂຕ";
  if (!/[0-9]/.test(pw))          return "ຕ້ອງມີຕົວເລກຢ່າງໜ້ອຍ 1 ໂຕ";
  if (!/[^A-Za-z0-9]/.test(pw))   return "ຕ້ອງມີຕົວອັກສອນພິເສດຢ່າງໜ້ອຍ 1 ໂຕ (@, #, !, ...)";
  return null;
}

/* GET /api/users — list all users (Super Admin) */
router.get("/", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";

    const params: any[] = [];
    let where = "";
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE u.fullname ILIKE $1 OR u.email ILIKE $1`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(DISTINCT u.user_id) FROM users u ${where}`, params
    );

    const dataParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT u.user_id, u.fullname, u.email, u.created_at,
              r.role_name,
              ARRAY_AGG(c.company_id   ORDER BY c.company_id) FILTER (WHERE c.company_id   IS NOT NULL) AS company_ids,
              ARRAY_AGG(c.companies_name ORDER BY c.company_id) FILTER (WHERE c.companies_name IS NOT NULL) AS companies
       FROM users u
       LEFT JOIN role r ON r.role_id = u.role_id
       LEFT JOIN user_companies uc ON uc.user_id = u.user_id
       LEFT JOIN companies c ON c.company_id = uc.company_id
       ${where}
       GROUP BY u.user_id, r.role_name
       ORDER BY u.user_id ASC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );
    res.json({ data: result.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error("GET USERS ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* GET /api/users/roles — all roles */
router.get("/roles", auth, allow("Super Admin"), async (_req, res) => {
  try {
    const result = await pool.query(`SELECT role_id, role_name FROM role ORDER BY role_id`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

/* POST /api/users — create user */
router.post("/", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { fullname, email, password, role_id, company_ids } = req.body;

    if (!fullname?.trim() || !email || !password || !role_id)
      return res.status(400).json({ message: "ກະລຸນາໃສ່ຂໍ້ມູນໃຫ້ຄົບ" });

    if (!EMAIL_RE.test(email))
      return res.status(400).json({ message: "Email format ບໍ່ຖືກຕ້ອງ" });

    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ message: pwErr });

    const cleanEmail = email.toLowerCase().trim();
    const exists = await pool.query(`SELECT 1 FROM users WHERE LOWER(email)=$1`, [cleanEmail]);
    if (exists.rows.length > 0)
      return res.status(400).json({ message: "Email ນີ້ມີຢູ່ແລ້ວ" });

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (fullname, email, password_hash, role_id) VALUES ($1,$2,$3,$4) RETURNING user_id, fullname, email`,
      [fullname.trim(), cleanEmail, hash, role_id]
    );
    const newUser = result.rows[0];

    if (Array.isArray(company_ids) && company_ids.length > 0) {
      for (const cid of company_ids) {
        await pool.query(
          `INSERT INTO user_companies (user_id, company_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [newUser.user_id, cid]
        );
      }
    }
    res.json(newUser);
  } catch (err) {
    console.error("CREATE USER ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* PUT /api/users/:id — update user */
router.put("/:id", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;
    const { fullname, email, password, role_id, company_ids } = req.body;

    if (!fullname?.trim() || !email || !role_id)
      return res.status(400).json({ message: "ກະລຸນາໃສ່ຂໍ້ມູນໃຫ້ຄົບ" });

    if (!EMAIL_RE.test(email))
      return res.status(400).json({ message: "Email format ບໍ່ຖືກຕ້ອງ" });

    /* only validate/change password when caller actually provides one */
    if (password) {
      const pwErr = validatePassword(password);
      if (pwErr) return res.status(400).json({ message: pwErr });
    }

    const cleanEmail = email.toLowerCase().trim();

    /* reject duplicate email (ignore self) */
    const dup = await pool.query(
      `SELECT 1 FROM users WHERE LOWER(email)=$1 AND user_id != $2`,
      [cleanEmail, id]
    );
    if (dup.rows.length > 0)
      return res.status(400).json({ message: "Email ນີ້ຖືກໃຊ້ແລ້ວ" });

    if (password) {
      const hash = await bcrypt.hash(password, 12);
      await pool.query(
        `UPDATE users SET fullname=$1, email=$2, password_hash=$3, role_id=$4 WHERE user_id=$5`,
        [fullname.trim(), cleanEmail, hash, role_id, id]
      );
    } else {
      await pool.query(
        `UPDATE users SET fullname=$1, email=$2, role_id=$3 WHERE user_id=$4`,
        [fullname.trim(), cleanEmail, role_id, id]
      );
    }

    await pool.query(`DELETE FROM user_companies WHERE user_id=$1`, [id]);
    if (Array.isArray(company_ids) && company_ids.length > 0) {
      for (const cid of company_ids) {
        await pool.query(
          `INSERT INTO user_companies (user_id, company_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [id, cid]
        );
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("UPDATE USER ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE /api/users/:id — delete user */
router.delete("/:id", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;
    if (Number(id) === req.user.user_id)
      return res.status(400).json({ message: "ບໍ່ສາມາດລຶບ account ຕົວເອງໄດ້" });

    await pool.query(`DELETE FROM user_companies WHERE user_id=$1`, [id]);
    await pool.query(`DELETE FROM users WHERE user_id=$1`, [id]);
    res.json({ message: "deleted" });
  } catch (err) {
    console.error("DELETE USER ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
