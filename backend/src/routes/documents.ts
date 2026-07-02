import { Router } from "express";
import multer from "multer";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { uploadFileToCloudinary, deleteFileFromCloudinary } from "../cloudinary";
import { validateUpload } from "../utils/validateFile";
import { canAccessEmployee } from "../utils/employeeAccess";
import { isPositiveInt, isValidDate, trimOrNull } from "../utils/validate";
import { logAudit } from "../utils/auditLog";

const router = Router();

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith("image/") || file.mimetype === "application/pdf";
    if (ok) cb(null, true);
    else cb(new Error("Only image or PDF files are allowed") as any, false);
  },
});

/* GET /api/documents/:empId */
router.get("/:empId", auth, async (req: any, res) => {
  try {
    const { empId } = req.params;

    if (!await canAccessEmployee(req.user.role, req.user.user_id, empId))
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນພະນັກງານນີ້" });

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
    console.error("DOCS GET ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* POST /api/documents/:empId */
router.post("/:empId", auth, upload.single("file"), async (req: any, res) => {
  try {
    const { empId } = req.params;
    if (!isPositiveInt(empId)) return res.status(400).json({ message: "empId ບໍ່ຖືກຕ້ອງ" });

    const { doc_type, doc_name, expires_at, notes } = req.body;

    const docTypeTrimmed = trimOrNull(doc_type);
    if (!docTypeTrimmed) return res.status(400).json({ message: "doc_type ຕ້ອງໃສ່" });
    if (docTypeTrimmed.length > 50) return res.status(400).json({ message: "doc_type ຍາວເກີນ 50 ຕົວ" });

    const docNameTrimmed = trimOrNull(doc_name);
    if (!docNameTrimmed) return res.status(400).json({ message: "doc_name ຕ້ອງໃສ່" });
    if (docNameTrimmed.length > 200) return res.status(400).json({ message: "doc_name ຍາວເກີນ 200 ຕົວ" });

    if (expires_at && !isValidDate(expires_at))
      return res.status(400).json({ message: "expires_at ຮູບແບບບໍ່ຖືກ (YYYY-MM-DD)" });

    if (!await canAccessEmployee(req.user.role, req.user.user_id, empId))
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນພະນັກງານນີ້" });

    let file_path: string | null = null;
    if (req.file) {
      const fileErr = validateUpload(req.file.buffer, "image_or_pdf");
      if (fileErr) return res.status(400).json({ message: fileErr });
      file_path = await uploadFileToCloudinary(req.file.buffer, "documents");
    }

    const result = await pool.query(
      `INSERT INTO employee_documents (employee_id, doc_type, doc_name, file_path, expires_at, notes, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [empId, doc_type, doc_name, file_path, expires_at || null, notes || null, req.user.user_id]
    );
    logAudit({
      userId: req.user.user_id,
      action: "CREATE",
      entityType: "DOCUMENT",
      entityId: result.rows[0].doc_id,
      afterData: result.rows[0],
    });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("DOCS POST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE /api/documents/doc/:docId */
router.delete("/doc/:docId", auth, async (req: any, res) => {
  try {
    const { docId } = req.params;
    const existing = await pool.query(
      `SELECT employee_id, file_path FROM employee_documents WHERE doc_id=$1`, [docId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ message: "ບໍ່ພົບ" });
    const { employee_id, file_path: fp } = existing.rows[0];

    if (!await canAccessEmployee(req.user.role, req.user.user_id, employee_id))
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນພະນັກງານນີ້" });

    if (fp?.startsWith("http")) await deleteFileFromCloudinary(fp);
    await pool.query(`DELETE FROM employee_documents WHERE doc_id=$1`, [docId]);
    logAudit({
      userId: req.user.user_id,
      action: "DELETE",
      entityType: "DOCUMENT",
      entityId: docId,
      beforeData: existing.rows[0],
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("DOCS DELETE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
