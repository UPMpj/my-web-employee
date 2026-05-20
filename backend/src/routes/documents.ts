import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { pool } from "../db";
import { auth } from "../middleware/auth";

const router = Router();

/* auto-create table */
pool.query(`
  CREATE TABLE IF NOT EXISTS employee_documents (
    doc_id       SERIAL PRIMARY KEY,
    employee_id  INT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    doc_type     VARCHAR(50) NOT NULL,
    doc_name     VARCHAR(200) NOT NULL,
    file_path    VARCHAR(500),
    expires_at   DATE,
    notes        TEXT,
    uploaded_by  INT REFERENCES users(user_id),
    uploaded_at  TIMESTAMP DEFAULT NOW()
  )
`).catch(() => {});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, "../../uploads/documents");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `doc-${Date.now()}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

/* GET /api/documents/:empId */
router.get("/:empId", auth, async (req, res) => {
  try {
    const { empId } = req.params;
    const result = await pool.query(
      `SELECT d.*, u.fullname AS uploaded_by_name
       FROM employee_documents d
       LEFT JOIN users u ON u.user_id = d.uploaded_by
       WHERE d.employee_id = $1
       ORDER BY d.uploaded_at DESC`,
      [empId]
    );
    res.json(result.rows);
  } catch (err) {
    console.log("DOCS GET ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* POST /api/documents/:empId */
router.post("/:empId", auth, upload.single("file"), async (req: any, res) => {
  try {
    const { empId } = req.params;
    const { doc_type, doc_name, expires_at, notes } = req.body;
    const file_path = req.file ? `/uploads/documents/${req.file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO employee_documents (employee_id, doc_type, doc_name, file_path, expires_at, notes, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [empId, doc_type, doc_name, file_path, expires_at || null, notes || null, req.user.user_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.log("DOCS POST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE /api/documents/doc/:docId */
router.delete("/doc/:docId", auth, async (req, res) => {
  try {
    const { docId } = req.params;
    const existing = await pool.query(
      `SELECT file_path FROM employee_documents WHERE doc_id=$1`, [docId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ message: "ບໍ່ພົບ" });

    const fp = existing.rows[0].file_path;
    if (fp) {
      const abs = path.join(__dirname, "../../", fp);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    }

    await pool.query(`DELETE FROM employee_documents WHERE doc_id=$1`, [docId]);
    res.json({ ok: true });
  } catch (err) {
    console.log("DOCS DELETE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
