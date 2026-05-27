import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { pool } from "../db";
import { auth } from "../middleware/auth";

const router = Router();

/* auto-create table */
pool.query(`
  CREATE TABLE IF NOT EXISTS employee_permits (
    permit_id     SERIAL PRIMARY KEY,
    employee_id   INT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    permit_type   VARCHAR(100) NOT NULL,
    permit_number VARCHAR(100),
    issued_date   DATE,
    expires_at    DATE,
    status        VARCHAR(20) NOT NULL DEFAULT 'Valid',
    file_path     VARCHAR(500),
    notes         TEXT,
    created_by    INT REFERENCES users(user_id),
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
  )
`).catch(() => {});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, "../../uploads/permits");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `permit-${Date.now()}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

/* GET /api/permits/:empId */
router.get("/:empId", auth, async (req, res) => {
  try {
    const { empId } = req.params;
    /* auto-update expired status */
    await pool.query(
      `UPDATE employee_permits SET status='Expired', updated_at=NOW()
       WHERE employee_id=$1 AND expires_at < NOW() AND status = 'Valid'`,
      [empId]
    );
    const result = await pool.query(
      `SELECT p.*, u.fullname AS created_by_name
       FROM employee_permits p
       LEFT JOIN users u ON u.user_id = p.created_by
       WHERE p.employee_id = $1
       ORDER BY p.expires_at ASC NULLS LAST, p.created_at DESC`,
      [empId]
    );
    res.json(result.rows);
  } catch (err) {
    console.log("PERMITS GET ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* POST /api/permits/:empId */
router.post("/:empId", auth, upload.single("file"), async (req: any, res) => {
  try {
    const { empId } = req.params;
    const { permit_type, permit_number, issued_date, expires_at, status, notes } = req.body;
    const file_path = req.file ? `/uploads/permits/${req.file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO employee_permits
         (employee_id, permit_type, permit_number, issued_date, expires_at, status, file_path, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [empId, permit_type, permit_number || null, issued_date || null,
       expires_at || null, status || "Valid", file_path, notes || null, req.user.user_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.log("PERMITS POST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* PATCH /api/permits/item/:permitId */
router.patch("/item/:permitId", auth, upload.single("file"), async (req: any, res) => {
  try {
    const { permitId } = req.params;
    const { permit_type, permit_number, issued_date, expires_at, status, notes } = req.body;

    let file_path: string | null | undefined = undefined;
    if (req.file) {
      // delete old file
      const old = await pool.query(`SELECT file_path FROM employee_permits WHERE permit_id=$1`, [permitId]);
      if (old.rows[0]?.file_path) {
        const abs = path.join(__dirname, "../../", old.rows[0].file_path);
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      }
      file_path = `/uploads/permits/${req.file.filename}`;
    }

    const setClauses = [
      "permit_type=$1", "permit_number=$2", "issued_date=$3",
      "expires_at=$4", "status=$5", "notes=$6", "updated_at=NOW()"
    ];
    const params: any[] = [
      permit_type, permit_number || null, issued_date || null,
      expires_at || null, status, notes || null
    ];
    if (file_path !== undefined) {
      setClauses.push(`file_path=$${params.length + 1}`);
      params.push(file_path);
    }
    params.push(permitId);

    const result = await pool.query(
      `UPDATE employee_permits SET ${setClauses.join(", ")} WHERE permit_id=$${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "ບໍ່ພົບ" });
    res.json(result.rows[0]);
  } catch (err) {
    console.log("PERMITS PATCH ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE /api/permits/item/:permitId */
router.delete("/item/:permitId", auth, async (req, res) => {
  try {
    const { permitId } = req.params;
    const existing = await pool.query(
      `SELECT file_path FROM employee_permits WHERE permit_id=$1`, [permitId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ message: "ບໍ່ພົບ" });

    const fp = existing.rows[0].file_path;
    if (fp) {
      const abs = path.join(__dirname, "../../", fp);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    }

    await pool.query(`DELETE FROM employee_permits WHERE permit_id=$1`, [permitId]);
    res.json({ ok: true });
  } catch (err) {
    console.log("PERMITS DELETE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
