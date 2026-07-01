import { Router } from "express";
import multer from "multer";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { uploadFileToCloudinary, deleteFileFromCloudinary } from "../cloudinary";
import { validateUpload } from "../utils/validateFile";
import { canAccessEmployee } from "../utils/employeeAccess";
import { isPositiveInt, isValidDate, isEnum, trimOrNull } from "../utils/validate";

const PERMIT_STATUSES = ["Valid", "Expired", "Pending", "Cancelled"];

const router = Router();

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith("image/") || file.mimetype === "application/pdf";
    if (ok) cb(null, true);
    else cb(new Error("Only image or PDF files are allowed") as any, false);
  },
});

/* GET /api/permits/:empId */
router.get("/:empId", auth, async (req: any, res) => {
  try {
    const { empId } = req.params;

    if (!await canAccessEmployee(req.user.role, req.user.user_id, empId))
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນພະນັກງານນີ້" });

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
    console.error("PERMITS GET ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* POST /api/permits/:empId */
router.post("/:empId", auth, upload.single("file"), async (req: any, res) => {
  try {
    const { empId } = req.params;
    if (!isPositiveInt(empId)) return res.status(400).json({ message: "empId ບໍ່ຖືກຕ້ອງ" });

    const { permit_type, permit_number, issued_date, expires_at, status, notes } = req.body;

    const permitTypeTrimmed = trimOrNull(permit_type);
    if (!permitTypeTrimmed) return res.status(400).json({ message: "permit_type ຕ້ອງໃສ່" });
    if (permitTypeTrimmed.length > 100) return res.status(400).json({ message: "permit_type ຍາວເກີນ 100 ຕົວ" });

    if (permit_number && String(permit_number).length > 100)
      return res.status(400).json({ message: "permit_number ຍາວເກີນ 100 ຕົວ" });

    if (issued_date && !isValidDate(issued_date))
      return res.status(400).json({ message: "issued_date ຮູບແບບບໍ່ຖືກ (YYYY-MM-DD)" });
    if (expires_at && !isValidDate(expires_at))
      return res.status(400).json({ message: "expires_at ຮູບແບບບໍ່ຖືກ (YYYY-MM-DD)" });

    const effectiveStatus = status || "Valid";
    if (!isEnum(effectiveStatus, PERMIT_STATUSES))
      return res.status(400).json({ message: "status ຕ້ອງເປັນ Valid, Expired, Pending ຫຼື Cancelled" });

    if (!await canAccessEmployee(req.user.role, req.user.user_id, empId))
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນພະນັກງານນີ້" });

    let file_path: string | null = null;
    if (req.file) {
      const fileErr = validateUpload(req.file.buffer, "image_or_pdf");
      if (fileErr) return res.status(400).json({ message: fileErr });
      file_path = await uploadFileToCloudinary(req.file.buffer, "permits");
    }

    /* Company Admin → approval */
    if (req.user.role === "Company Admin") {
      const emp = await pool.query(
        `SELECT firstname, lastname FROM employees WHERE employee_id=$1`, [empId]
      );
      const empName = emp.rows[0] ? `${emp.rows[0].firstname} ${emp.rows[0].lastname}` : `#${empId}`;
      const userInfo = await pool.query(`SELECT fullname FROM users WHERE user_id=$1`, [req.user.user_id]);
      const requesterName = userInfo.rows[0]?.fullname || "Company Admin";

      const ar = await pool.query(
        `INSERT INTO approval_requests
           (request_type, entity_type, entity_id, entity_name, requested_by, requested_by_name, old_data, new_data, status)
         VALUES ('permit_create','permit',$1,$2,$3,$4,'{}', $5,'pending')
         RETURNING id`,
        [
          empId, `ເພີ່ມ ${permit_type} ຂອງ ${empName}`,
          req.user.user_id, requesterName,
          JSON.stringify({ emp_id: empId, permit_type, permit_number: permit_number || null,
            issued_date: issued_date || null, expires_at: expires_at || null,
            status: status || "Valid", notes: notes || null, file_path,
            created_by: req.user.user_id }),
        ]
      );
      await pool.query(
        `INSERT INTO notifications (from_user_id, message, entity_type, entity_id)
         VALUES ($1,$2,'employee',$3)`,
        [req.user.user_id, `${requesterName} ຂໍເພີ່ມ ${permit_type} ຂອງ ${empName}`, empId]
      ).catch(() => {});
      return res.status(202).json({ pending: true, approvalId: ar.rows[0].id });
    }

    /* Super Admin → direct insert */
    const result = await pool.query(
      `INSERT INTO employee_permits
         (employee_id, permit_type, permit_number, issued_date, expires_at, status, file_path, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [empId, permit_type, permit_number || null, issued_date || null,
       expires_at || null, status || "Valid", file_path, notes || null, req.user.user_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("PERMITS POST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* PATCH /api/permits/item/:permitId */
router.patch("/item/:permitId", auth, upload.single("file"), async (req: any, res) => {
  try {
    const { permitId } = req.params;
    if (!isPositiveInt(permitId)) return res.status(400).json({ message: "permitId ບໍ່ຖືກຕ້ອງ" });

    const { permit_type, permit_number, issued_date, expires_at, status, notes } = req.body;

    const permitTypeTrimmed = trimOrNull(permit_type);
    if (!permitTypeTrimmed) return res.status(400).json({ message: "permit_type ຕ້ອງໃສ່" });
    if (permitTypeTrimmed.length > 100) return res.status(400).json({ message: "permit_type ຍາວເກີນ 100 ຕົວ" });

    if (permit_number && String(permit_number).length > 100)
      return res.status(400).json({ message: "permit_number ຍາວເກີນ 100 ຕົວ" });

    if (issued_date && !isValidDate(issued_date))
      return res.status(400).json({ message: "issued_date ຮູບແບບບໍ່ຖືກ (YYYY-MM-DD)" });
    if (expires_at && !isValidDate(expires_at))
      return res.status(400).json({ message: "expires_at ຮູບແບບບໍ່ຖືກ (YYYY-MM-DD)" });

    if (status && !isEnum(status, PERMIT_STATUSES))
      return res.status(400).json({ message: "status ຕ້ອງເປັນ Valid, Expired, Pending ຫຼື Cancelled" });

    /* look up the permit first so we know which employee it belongs to */
    const permitRow = await pool.query(
      `SELECT employee_id, file_path FROM employee_permits WHERE permit_id=$1`, [permitId]
    );
    if (permitRow.rows.length === 0) return res.status(404).json({ message: "ບໍ່ພົບ" });
    const { employee_id, file_path: oldPath } = permitRow.rows[0];

    if (!await canAccessEmployee(req.user.role, req.user.user_id, employee_id))
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນພະນັກງານນີ້" });

    let new_file_path: string | null | undefined = undefined;
    if (req.file) {
      const fileErr = validateUpload(req.file.buffer, "image_or_pdf");
      if (fileErr) return res.status(400).json({ message: fileErr });
      new_file_path = await uploadFileToCloudinary(req.file.buffer, "permits");
    }
    const effective_file = new_file_path !== undefined ? new_file_path : oldPath;

    /* Company Admin → approval */
    if (req.user.role === "Company Admin") {
      const emp = await pool.query(
        `SELECT firstname, lastname FROM employees WHERE employee_id=$1`, [employee_id]
      );
      const empName = emp.rows[0] ? `${emp.rows[0].firstname} ${emp.rows[0].lastname}` : `#${employee_id}`;
      const userInfo = await pool.query(`SELECT fullname FROM users WHERE user_id=$1`, [req.user.user_id]);
      const requesterName = userInfo.rows[0]?.fullname || "Company Admin";

      const fullPermit = await pool.query(`SELECT * FROM employee_permits WHERE permit_id=$1`, [permitId]);
      const ar = await pool.query(
        `INSERT INTO approval_requests
           (request_type, entity_type, entity_id, entity_name, requested_by, requested_by_name, old_data, new_data, status)
         VALUES ('permit_edit','permit',$1,$2,$3,$4,$5,$6,'pending')
         RETURNING id`,
        [
          permitId, `ແກ້ໄຂ ${permit_type} ຂອງ ${empName}`,
          req.user.user_id, requesterName,
          JSON.stringify(fullPermit.rows[0] || {}),
          JSON.stringify({ permit_type, permit_number: permit_number || null,
            issued_date: issued_date || null, expires_at: expires_at || null,
            status, notes: notes || null,
            old_file_path: oldPath, new_file_path }),
        ]
      );
      await pool.query(
        `INSERT INTO notifications (from_user_id, message, entity_type, entity_id)
         VALUES ($1,$2,'employee',$3)`,
        [req.user.user_id, `${requesterName} ຂໍແກ້ໄຂ ${permit_type} ຂອງ ${empName}`, employee_id]
      ).catch(() => {});
      return res.status(202).json({ pending: true, approvalId: ar.rows[0].id });
    }

    /* Super Admin → direct update */
    const setClauses = [
      "permit_type=$1", "permit_number=$2", "issued_date=$3",
      "expires_at=$4", "status=$5", "notes=$6", "updated_at=NOW()"
    ];
    const params: any[] = [
      permit_type, permit_number || null, issued_date || null,
      expires_at || null, status, notes || null
    ];
    if (effective_file !== oldPath) {
      setClauses.push(`file_path=$${params.length + 1}`);
      params.push(effective_file);
    }
    params.push(permitId);

    const result = await pool.query(
      `UPDATE employee_permits SET ${setClauses.join(", ")} WHERE permit_id=$${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "ບໍ່ພົບ permit ຫຼື ຖືກລຶບໄປແລ້ວ" });

    /* Delete old Cloudinary file only after DB update succeeds */
    if (new_file_path && oldPath?.startsWith("http") && oldPath !== new_file_path)
      deleteFileFromCloudinary(oldPath).catch(() => {});

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PERMITS PATCH ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE /api/permits/item/:permitId */
router.delete("/item/:permitId", auth, async (req: any, res) => {
  try {
    const { permitId } = req.params;
    const existing = await pool.query(
      `SELECT employee_id, file_path FROM employee_permits WHERE permit_id=$1`, [permitId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ message: "ບໍ່ພົບ" });
    const { employee_id, file_path: fp } = existing.rows[0];

    if (!await canAccessEmployee(req.user.role, req.user.user_id, employee_id))
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນພະນັກງານນີ້" });

    /* Company Admin → approval */
    if (req.user.role === "Company Admin") {
      const emp = await pool.query(
        `SELECT firstname, lastname FROM employees WHERE employee_id=$1`, [employee_id]
      );
      const empName = emp.rows[0] ? `${emp.rows[0].firstname} ${emp.rows[0].lastname}` : `#${employee_id}`;
      const userInfo = await pool.query(`SELECT fullname FROM users WHERE user_id=$1`, [req.user.user_id]);
      const requesterName = userInfo.rows[0]?.fullname || "Company Admin";

      const fullPermit = await pool.query(`SELECT * FROM employee_permits WHERE permit_id=$1`, [permitId]);
      const ar = await pool.query(
        `INSERT INTO approval_requests
           (request_type, entity_type, entity_id, entity_name, requested_by, requested_by_name, old_data, new_data, status)
         VALUES ('permit_delete','permit',$1,$2,$3,$4,$5,'{}','pending')
         RETURNING id`,
        [
          permitId, `ລຶບ permit ຂອງ ${empName}`,
          req.user.user_id, requesterName,
          JSON.stringify({ ...fullPermit.rows[0], file_path: fp }),
        ]
      );
      await pool.query(
        `INSERT INTO notifications (from_user_id, message, entity_type, entity_id)
         VALUES ($1,$2,'employee',$3)`,
        [req.user.user_id, `${requesterName} ຂໍລຶບ permit ຂອງ ${empName}`, employee_id]
      ).catch(() => {});
      return res.status(202).json({ pending: true, approvalId: ar.rows[0].id });
    }

    /* Super Admin → direct delete */
    if (fp?.startsWith("http")) await deleteFileFromCloudinary(fp);
    await pool.query(`DELETE FROM employee_permits WHERE permit_id=$1`, [permitId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("PERMITS DELETE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
