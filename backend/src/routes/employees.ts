import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { uploadToCloudinary, deleteFromCloudinary } from "../cloudinary";
import { validateUpload } from "../utils/validateFile";
import { nextEmployeeCode } from "../utils/employeeCode";
import { logAudit, isAuditLoggingEnabled } from "../utils/auditLog";
import { canAccessEmployee } from "../utils/employeeAccess";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("ອັບໂຫຼດໄດ້ສະເພາະໄຟລ໌ຮູບ (image) ເທົ່ານັ້ນ") as any, false);
  },
});

/* ================= GET EMPLOYEES ================= */
router.get("/", auth, async (req: any, res) => {
  try {
    const page      = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit     = Math.min(200, parseInt(req.query.limit as string) || 10);
    const search    = (req.query.search             as string) || "";
    const status    = (req.query.status             as string) || "";
    const gender    = (req.query.gender             as string) || "";
    const position  = (req.query.position           as string) || "";
    const companyId = (req.query.company_id         as string) || "";
    const hireFrom  = (req.query.hire_from          as string) || "";
    const hireTo    = (req.query.hire_to            as string) || "";
    const sort      = (req.query.sort               as string) || "newest";
    const offset    = (page - 1) * limit;

    const isSuperAdmin = req.user.role === "Super Admin";
    const params: any[] = [];
    const conds: string[] = ["e.deleted_at IS NULL"];

    if (companyId && companyId !== "all") {
      params.push(companyId);
      conds.push(`e.company_id = $${params.length}`);

      // non-Super Admin: ກວດວ່າ user ມີສິດເຂົ້າ company ນີ້
      if (!isSuperAdmin) {
        params.push(req.user.user_id);
        conds.push(
          `EXISTS (SELECT 1 FROM user_companies uc WHERE uc.user_id = $${params.length} AND uc.company_id = e.company_id)`
        );
      }
    } else if (!isSuperAdmin) {
      // "all" ສຳລັບ non-Super Admin → ສະແດງສະເພາະ company ທີ່ user ຖືກ assign
      params.push(req.user.user_id);
      conds.push(
        `e.company_id IN (SELECT company_id FROM user_companies WHERE user_id = $${params.length})`
      );
    }

    if (search) {
      params.push(`%${search}%`);
      const n = params.length;
      conds.push(
        `(e.employee_code ILIKE $${n} OR e.firstname ILIKE $${n} OR e.lastname ILIKE $${n} OR e.position ILIKE $${n})`
      );
    }

    if (status && status !== "all") {
      params.push(status);
      conds.push(`e.status = $${params.length}`);
    }

    if (gender && gender !== "all") {
      params.push(gender);
      conds.push(`e.gender = $${params.length}`);
    }

    if (position && position !== "all") {
      params.push(position);
      conds.push(`e.position = $${params.length}`);
    }

    if (hireFrom) {
      params.push(hireFrom);
      conds.push(`e.hired_at >= $${params.length}`);
    }

    if (hireTo) {
      params.push(hireTo);
      conds.push(`e.hired_at <= $${params.length}`);
    }

    const where = `WHERE ${conds.join(" AND ")}`;
    const order = sort === "oldest" ? "e.employee_id ASC" : "e.employee_id DESC";

    const countRes = await pool.query(
      `SELECT COUNT(*)
       FROM employees e
       LEFT JOIN companies c ON c.company_id = e.company_id
       ${where}`,
      params
    );

    const dataParams = [...params, limit, offset];
    const dataRes = await pool.query(
      `SELECT e.*, c.companies_name
       FROM employees e
       LEFT JOIN companies c ON c.company_id = e.company_id
       ${where}
       ORDER BY ${order}
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    res.json({
      data: dataRes.rows,
      total: parseInt(countRes.rows[0].count),
      page,
      limit,
    });
  } catch (err) {
    console.error("EMPLOYEE LIST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ================= GET REPORT (with passport & visa) ================= */
router.get("/report/list", auth, async (req: any, res) => {
  try {
    const isSuperAdmin = req.user.role === "Super Admin";
    const search    = (req.query.search     as string) || "";
    const companyId = (req.query.company_id as string) || "";
    const status    = (req.query.status     as string) || "";
    const page      = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit     = Math.min(500, parseInt(req.query.limit as string) || 100);
    const offset    = (page - 1) * limit;

    const params: any[] = [];
    const conds: string[] = ["e.deleted_at IS NULL"];

    if (!isSuperAdmin) {
      params.push(req.user.user_id);
      conds.push(`e.company_id IN (SELECT company_id FROM user_companies WHERE user_id=$${params.length})`);
    }

    if (companyId && companyId !== "all") {
      params.push(companyId);
      conds.push(`e.company_id = $${params.length}`);
    }

    if (status && status !== "all") {
      params.push(status);
      conds.push(`e.status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const n = params.length;
      conds.push(`(e.employee_code ILIKE $${n} OR e.firstname ILIKE $${n} OR e.lastname ILIKE $${n} OR e.position ILIKE $${n})`);
    }

    const where = `WHERE ${conds.join(" AND ")}`;

    const countRes = await pool.query(
      `SELECT COUNT(DISTINCT e.employee_id) FROM employees e ${where}`,
      params
    );

    const dataParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT e.employee_id, e.employee_code, e.firstname, e.lastname, e.position,
              e.status, e.gender, e.nationality, e.contact_no,
              c.companies_name,
              MAX(p.permit_number) FILTER (WHERE LOWER(p.permit_type) LIKE '%passport%') AS passport_no,
              MAX(p.permit_number) FILTER (WHERE LOWER(p.permit_type) LIKE '%visa%')     AS visa_no
       FROM employees e
       LEFT JOIN companies c ON c.company_id = e.company_id
       LEFT JOIN employee_permits p ON p.employee_id = e.employee_id
       ${where}
       GROUP BY e.employee_id, e.employee_code, e.firstname, e.lastname, e.position,
                e.status, e.gender, e.nationality, e.contact_no, c.companies_name
       ORDER BY e.employee_id DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    res.json({
      data:  result.rows,
      total: parseInt(countRes.rows[0].count),
      page,
      limit,
    });
  } catch (err) {
    console.error("REPORT LIST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ================= EXPORT FOR TURNSTILE ================= */
/* Builds an .xlsx matching the Turnstile device's personnel-import template,
   so it can be uploaded there directly with no manual re-typing. */
router.get("/export/turnstile", auth, async (req: any, res) => {
  try {
    const isSuperAdmin = req.user.role === "Super Admin";
    const companyId    = (req.query.company_id   as string) || "";
    const status       = (req.query.status       as string) || "";
    const onlyNew      = (req.query.only_new      as string) !== "false"; // default: skip already-confirmed exports
    const explicitIds  = ((req.query.employee_ids as string) || "")
      .split(",").map(s => parseInt(s, 10)).filter(n => Number.isInteger(n));

    const params: any[] = [];
    const conds: string[] = ["e.deleted_at IS NULL"];

    if (!isSuperAdmin) {
      params.push(req.user.user_id);
      conds.push(`e.company_id IN (SELECT company_id FROM user_companies WHERE user_id=$${params.length})`);
    }

    if (explicitIds.length > 0) {
      /* admin hand-picked exactly who to include (e.g. re-sending one person whose data
         changed) — skip the company/status/only_new filters and use the list as-is */
      params.push(explicitIds);
      conds.push(`e.employee_id = ANY($${params.length}::int[])`);
    } else {
      if (companyId && companyId !== "all") {
        params.push(companyId);
        conds.push(`e.company_id = $${params.length}`);
      }
      if (status && status !== "all") {
        params.push(status);
        conds.push(`e.status = $${params.length}`);
      }
      if (onlyNew) {
        conds.push(`e.turnstile_exported_at IS NULL`);
      }
    }

    const where = `WHERE ${conds.join(" AND ")}`;

    const result = await pool.query(
      `SELECT e.employee_id, e.employee_code, e.firstname, e.lastname, e.gender, e.date_of_birth,
              e.contact_no, e.email, e.position, e.hired_at, e.nationality,
              e.office_building, e.office_room_no, e.office_floor,
              e.dormitory, e.room_no,
              c.companies_name,
              card.card_no,
              MAX(p.permit_number) FILTER (WHERE LOWER(p.permit_type) LIKE '%passport%') AS passport_no,
              MAX(p.expires_at)    FILTER (WHERE LOWER(p.permit_type) LIKE '%passport%') AS passport_expiry,
              MAX(p.permit_number) FILTER (WHERE LOWER(p.permit_type) LIKE '%visa%')     AS visa_no,
              MAX(p.expires_at)    FILTER (WHERE LOWER(p.permit_type) LIKE '%visa%')     AS visa_expiry,
              MAX(p.permit_number) FILTER (WHERE LOWER(p.permit_type) LIKE '%work%')     AS work_permit_no,
              MAX(p.expires_at)    FILTER (WHERE LOWER(p.permit_type) LIKE '%work%')     AS work_permit_expiry,
              MAX(p.permit_number) FILTER (WHERE LOWER(p.permit_type) LIKE '%stay%')     AS stay_permit_no,
              MAX(p.expires_at)    FILTER (WHERE LOWER(p.permit_type) LIKE '%stay%')     AS stay_permit_expiry
       FROM employees e
       LEFT JOIN companies c ON c.company_id = e.company_id
       LEFT JOIN employee_permits p ON p.employee_id = e.employee_id
       LEFT JOIN LATERAL (
         SELECT card_no FROM employee_card
         WHERE employee_id = e.employee_id AND status IS DISTINCT FROM 'Revoked'
         ORDER BY issued_at DESC NULLS LAST, card_id DESC
         LIMIT 1
       ) card ON true
       ${where}
       GROUP BY e.employee_id, e.employee_code, e.firstname, e.lastname, e.gender, e.date_of_birth,
                e.contact_no, e.email, e.position, e.hired_at, e.nationality,
                e.office_building, e.office_room_no, e.office_floor,
                e.dormitory, e.room_no, c.companies_name, card.card_no
       ORDER BY e.employee_id`,
      params
    );

    /* record this export as a batch so it can be confirmed/dismissed later, and so the
       next "only new" export naturally excludes anyone already confirmed */
    const employeeIds = result.rows.map((r: any) => r.employee_id);
    let batchId: number | null = null;
    if (employeeIds.length > 0) {
      const batchRes = await pool.query(
        `INSERT INTO turnstile_export_batches (company_id, exported_by, employee_ids, employee_count)
         VALUES ($1,$2,$3,$4) RETURNING batch_id`,
        [companyId && companyId !== "all" ? companyId : null, req.user.user_id, employeeIds, employeeIds.length]
      );
      batchId = batchRes.rows[0].batch_id;
    }

    const fmtDate = (d: any) => (d ? new Date(d).toISOString().slice(0, 10) : "");

    const headers = [
      "Personnel ID", "First Name", "Last Name", "Department Number", "Department Name",
      "Gender", "Birthday", "Mobile Phone", "Card Number", "Email",
      "Certificate Type", "Certificate Number", "Position Number", "Position Name", "Hire Date",
      "Verification Mode", "Work Per Exp Date", "Stay Per Exp Date", "Stay Permit",
      "Personal Document Exp Date", "Company", "Office Card ID", "Nationality", "Visa No.",
      "Office building", "Office room no.", "Dorm building no.", "Working Permit",
      "Birthplace", "Dorm room no.", "Office Floor Level", "Visa Exp Date",
    ];

    const rows = result.rows.map((r: any) => [
      r.employee_code || "",
      r.firstname || "",
      r.lastname || "",
      "",                                     // Department Number — not tracked in this system
      "",                                     // Department Name — not tracked in this system
      r.gender || "",
      fmtDate(r.date_of_birth),
      r.contact_no || "",
      r.card_no || "",
      r.email || "",
      r.passport_no ? "Passport" : "",
      r.passport_no || "",
      "",                                     // Position Number — not tracked in this system
      r.position || "",
      fmtDate(r.hired_at),
      "",                                     // Verification Mode — set on the Turnstile device itself
      fmtDate(r.work_permit_expiry),
      fmtDate(r.stay_permit_expiry),
      r.stay_permit_no || "",
      fmtDate(r.passport_expiry),
      r.companies_name || "",
      "",                                     // Office Card ID — assigned by Turnstile on import
      r.nationality || "",
      r.visa_no || "",
      r.office_building || "",
      r.office_room_no || "",
      r.dormitory || "",
      r.work_permit_no || "",
      "",                                     // Birthplace — not tracked in this system
      r.room_no || "",
      r.office_floor || "",
      fmtDate(r.visa_expiry),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Personnel");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename="turnstile_export_${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("X-Batch-Id", batchId !== null ? String(batchId) : "");
    res.setHeader("X-Employee-Count", String(employeeIds.length));
    res.send(buf);
  } catch (err) {
    console.error("EXPORT TURNSTILE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ================= TURNSTILE EXPORT: CANDIDATE LIST ================= */
/* Feeds the per-person checklist in the export modal — lets the admin tick exactly who
   to include, e.g. re-picking one already-exported person whose data changed without
   pulling in the whole company again. */
router.get("/export/turnstile/candidates", auth, async (req: any, res) => {
  try {
    const isSuperAdmin = req.user.role === "Super Admin";
    const companyId    = (req.query.company_id as string) || "";

    const params: any[] = [];
    const conds: string[] = ["e.deleted_at IS NULL"];

    if (!isSuperAdmin) {
      params.push(req.user.user_id);
      conds.push(`e.company_id IN (SELECT company_id FROM user_companies WHERE user_id=$${params.length})`);
    }
    if (companyId && companyId !== "all") {
      params.push(companyId);
      conds.push(`e.company_id = $${params.length}`);
    }

    const result = await pool.query(
      `SELECT e.employee_id, e.employee_code, e.firstname, e.lastname, e.position, e.status,
              e.turnstile_exported_at, c.companies_name
       FROM employees e
       LEFT JOIN companies c ON c.company_id = e.company_id
       WHERE ${conds.join(" AND ")}
       ORDER BY e.turnstile_exported_at IS NULL DESC, e.firstname, e.lastname`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error("TURNSTILE CANDIDATES ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ================= TURNSTILE EXPORT: PENDING BATCHES ================= */
/* Exports that were downloaded but not yet confirmed (or dismissed) — surfaced so the
   admin doesn't lose track of "did I actually finish importing that file into Turnstile?" */
router.get("/export/turnstile/pending", auth, async (req: any, res) => {
  try {
    const isSuperAdmin = req.user.role === "Super Admin";
    const params: any[] = [];
    const conds: string[] = ["b.confirmed_at IS NULL", "b.dismissed_at IS NULL"];

    if (!isSuperAdmin) {
      params.push(req.user.user_id);
      conds.push(`(b.company_id IS NULL OR b.company_id IN (SELECT company_id FROM user_companies WHERE user_id=$${params.length}))`);
    }

    const result = await pool.query(
      `SELECT b.batch_id, b.company_id, b.exported_at, b.employee_count,
              c.companies_name, u.fullname AS exported_by_name
       FROM turnstile_export_batches b
       LEFT JOIN companies c ON c.company_id = b.company_id
       LEFT JOIN users u ON u.user_id = b.exported_by
       WHERE ${conds.join(" AND ")}
       ORDER BY b.exported_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error("TURNSTILE PENDING BATCHES ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ================= TURNSTILE EXPORT: CONFIRM BATCH ================= */
/* Marks every employee in the batch as exported, so future "only new" exports skip them. */
router.post("/export/turnstile/:batchId/confirm", auth, async (req: any, res) => {
  try {
    const batchRes = await pool.query(`SELECT * FROM turnstile_export_batches WHERE batch_id=$1`, [req.params.batchId]);
    if (batchRes.rows.length === 0) return res.status(404).json({ message: "ບໍ່ພົບ" });
    const batch = batchRes.rows[0];
    if (batch.confirmed_at) return res.status(400).json({ message: "ຢືນຢັນໄປແລ້ວ" });

    if (req.user.role !== "Super Admin" && batch.company_id) {
      const access = await pool.query(
        `SELECT 1 FROM user_companies WHERE user_id=$1 AND company_id=$2`,
        [req.user.user_id, batch.company_id]
      );
      if (access.rows.length === 0) return res.status(403).json({ message: "ບໍ່ມີສິດ" });
    }

    await pool.query(
      `UPDATE employees SET turnstile_exported_at = NOW() WHERE employee_id = ANY($1::int[])`,
      [batch.employee_ids]
    );
    await pool.query(
      `UPDATE turnstile_export_batches SET confirmed_at=NOW(), confirmed_by=$1 WHERE batch_id=$2`,
      [req.user.user_id, req.params.batchId]
    );
    res.json({ ok: true, employee_count: batch.employee_count });
  } catch (err) {
    console.error("TURNSTILE CONFIRM BATCH ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ================= TURNSTILE EXPORT: DISMISS BATCH ================= */
/* "I don't need to confirm this one" — removes it from the pending list without
   marking the employees as exported (so they'll still show up as "new" later). */
router.post("/export/turnstile/:batchId/dismiss", auth, async (req: any, res) => {
  try {
    await pool.query(
      `UPDATE turnstile_export_batches SET dismissed_at=NOW() WHERE batch_id=$1 AND confirmed_at IS NULL`,
      [req.params.batchId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("TURNSTILE DISMISS BATCH ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ================= NEXT AUTO CODE ================= */
router.get("/next-code", auth, async (req: any, res) => {
  try {
    const companyId = req.query.company_id as string;
    if (!companyId) return res.status(400).json({ message: "company_id required" });

    const compRes = await pool.query(
      `SELECT 1 FROM companies WHERE company_id=$1`, [companyId]
    );
    if (compRes.rows.length === 0) return res.status(404).json({ message: "company not found" });

    const code = await nextEmployeeCode(pool, companyId);
    res.json({ code });
  } catch (err) {
    console.error("NEXT CODE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ================= DISTINCT POSITIONS (for filter dropdown) ================= */
router.get("/meta/positions", auth, async (req: any, res) => {
  try {
    const isSuperAdmin = req.user.role === "Super Admin";
    const params: any[] = [];
    let where = "e.deleted_at IS NULL AND e.position IS NOT NULL AND e.position != ''";

    if (!isSuperAdmin) {
      params.push(req.user.user_id);
      where += ` AND e.company_id IN (SELECT company_id FROM user_companies WHERE user_id=$${params.length})`;
    }

    const result = await pool.query(
      `SELECT DISTINCT e.position FROM employees e WHERE ${where} ORDER BY e.position ASC`,
      params
    );
    res.json(result.rows.map(r => r.position));
  } catch (err) {
    console.error("POSITIONS LIST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ================= GET ONE EMPLOYEE ================= */
router.get("/:id", auth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT e.*, c.companies_name,
              r.room_number   AS linked_room_number,
              r.floor_number  AS linked_floor,
              r.capacity      AS linked_capacity,
              b.building_name AS linked_building,
              b.building_id   AS linked_building_id
       FROM employees e
       LEFT JOIN companies c  ON c.company_id  = e.company_id
       LEFT JOIN rooms     r  ON r.room_id      = e.room_id
       LEFT JOIN buildings b  ON b.building_id  = r.building_id
       WHERE e.employee_id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });

    const emp = result.rows[0];
    if (req.user.role !== "Super Admin") {
      const access = await pool.query(
        `SELECT 1 FROM user_companies WHERE user_id=$1 AND company_id=$2`,
        [req.user.user_id, emp.company_id]
      );
      if (access.rows.length === 0) return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນພະນັກງານນີ້" });
    }

    res.json(emp);
  } catch (err) {
    console.error("GET EMPLOYEE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ================= CREATE EMPLOYEE ================= */
router.post("/", auth, upload.single("photo"), async (req: any, res) => {
  try {
    const {
      employee_code, company_id, firstname, lastname,
      gender, date_of_birth, nationality, contact_no,
      position, status, hired_at, email, notes, employee_type,
      province, district, village, dormitory, room_no, office_building, room_id,
      office_floor, office_room_no,
    } = req.body;

    if (!firstname || !lastname || !company_id) {
      return res.status(400).json({ message: "firstname, lastname, company_id ຕ້ອງໃສ່" });
    }

    if (req.user.role !== "Super Admin") {
      const access = await pool.query(
        `SELECT 1 FROM user_companies WHERE user_id=$1 AND company_id=$2`,
        [req.user.user_id, company_id]
      );
      if (access.rows.length === 0) {
        return res.status(403).json({ message: "ບໍ່ມີສິດເພີ່ມພະນັກງານໃສ່ company ນີ້" });
      }
    }

    if (req.file) {
      const fileErr = validateUpload(req.file.buffer, "image");
      if (fileErr) return res.status(400).json({ message: fileErr });
    }
    const photo = req.file ? await uploadToCloudinary(req.file.buffer) : null;

    const finalCode = employee_code || await nextEmployeeCode(pool, company_id);

    const result = await pool.query(
      `INSERT INTO employees
        (employee_code, company_id, firstname, lastname, gender,
         date_of_birth, nationality, contact_no, position, status, hired_at, email, notes, photo,
         employee_type, province, district, village, dormitory, room_no, office_building, room_id,
         office_floor, office_room_no)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       RETURNING *`,
      [
        finalCode, company_id, firstname, lastname, gender,
        date_of_birth || null, nationality, contact_no,
        position, status || "Active", hired_at || null,
        email || null, notes || null, photo,
        employee_type || null,
        province || null, district || null, village || null,
        dormitory || null, room_no || null, office_building || null,
        room_id ? parseInt(room_id) : null,
        office_floor || null, office_room_no || null,
      ]
    );

    logAudit({
      action: "INSERT", entityType: "EMPLOYEE", entityId: result.rows[0].employee_id,
      userId: req.user.user_id, companyId: result.rows[0].company_id, afterData: result.rows[0],
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("ADD EMPLOYEE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ================= UPDATE EMPLOYEE ================= */
router.put("/:id", auth, upload.single("photo"), async (req: any, res) => {
  try {
    const { id } = req.params;
    const {
      employee_code, company_id, firstname, lastname,
      gender, date_of_birth, nationality, contact_no,
      position, status, hired_at, email, notes, employee_type,
      province, district, village, dormitory, room_no, office_building, room_id,
      office_floor, office_room_no,
    } = req.body;

    if (req.file) {
      const fileErr = validateUpload(req.file.buffer, "image");
      if (fileErr) return res.status(400).json({ message: fileErr });
    }

    const existing = await pool.query(
      `SELECT * FROM employees WHERE employee_id=$1 AND deleted_at IS NULL`, [id]
    );
    if (existing.rows.length === 0)
      return res.status(404).json({ message: "ບໍ່ພົບພະນັກງານ" });

    /* Company Admin ກວດສິດ */
    if (req.user.role === "Company Admin") {
      if (!await canAccessEmployee(req.user.role, req.user.user_id, id))
        return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນພະນັກງານນີ້" });
    }

    const oldEmp   = existing.rows[0];
    const oldPhoto = oldEmp.photo || null;
    const photo    = req.file
      ? await uploadToCloudinary(req.file.buffer)
      : oldPhoto;
    /* Do NOT delete old photo here — for the approval path the old photo must
       stay alive in Cloudinary until Super Admin approves (executeApproval deletes it).
       For the direct-execute path we delete it below, after the UPDATE succeeds. */

    /* ── Company Admin: ສະເພາະ field ສຳຄັນຕ້ອງ approval ── */
    const sensitiveChanged =
      String(oldEmp.position || "")  !== String(position || "")  ||
      String(oldEmp.status   || "")  !== String(status   || "")  ||
      Number(oldEmp.company_id ?? 0) !== Number(company_id ?? 0);

    if (req.user.role === "Company Admin" && sensitiveChanged) {
      const userInfo = await pool.query(`SELECT fullname FROM users WHERE user_id=$1`, [req.user.user_id]);
      const requesterName = userInfo.rows[0]?.fullname || "Company Admin";
      const entityName = `${firstname} ${lastname} (${employee_code || id})`;

      const changedFields: string[] = [];
      if (String(oldEmp.position   || "") !== String(position   || "")) changedFields.push(`ຕຳແໜ່ງ: ${oldEmp.position} → ${position}`);
      if (String(oldEmp.status     || "") !== String(status     || "")) changedFields.push(`ສະຖານະ: ${oldEmp.status} → ${status}`);
      if (String(oldEmp.company_id || "") !== String(company_id || "")) changedFields.push(`ບໍລິສັດ: ${oldEmp.company_id} → ${company_id}`);

      const ar = await pool.query(
        `INSERT INTO approval_requests
           (request_type, entity_type, entity_id, entity_name, requested_by, requested_by_name, old_data, new_data, status)
         VALUES ('edit','employee',$1,$2,$3,$4,$5,$6,'pending')
         RETURNING id`,
        [
          id, entityName, req.user.user_id, requesterName,
          JSON.stringify(oldEmp),
          JSON.stringify({
            employee_code, company_id, firstname, lastname, gender,
            date_of_birth: date_of_birth || null, nationality, contact_no,
            position, status, hired_at: hired_at || null,
            email: email || null, notes: notes || null, photo,
            employee_type: employee_type || null,
            province: province || null, district: district || null,
            village: village || null, dormitory: dormitory || null,
            room_no: room_no || null, office_building: office_building || null,
            room_id: room_id ? parseInt(room_id) : null,
            office_floor: office_floor || null, office_room_no: office_room_no || null,
          }),
        ]
      );

      await pool.query(
        `INSERT INTO notifications (from_user_id, message, entity_type, entity_id)
         VALUES ($1,$2,'employee',$3)`,
        [req.user.user_id, `${requesterName} ຂໍແກ້ໄຂ: ${changedFields.join(", ")} ຂອງ ${entityName}`, id]
      ).catch(() => {});

      return res.status(202).json({ pending: true, approvalId: ar.rows[0].id, changedFields });
    }

    /* ── execute ທັນທີ (non-sensitive fields ຫຼື Super Admin) ── */
    if (req.file && oldPhoto && oldPhoto.startsWith("https://res.cloudinary.com"))
      deleteFromCloudinary(oldPhoto).catch(() => {});

    const oldRoomId   = oldEmp.room_id || null;
    const oldStatus   = oldEmp.status  || null;
    const oldPosition = oldEmp.position || null;
    const newRoomId   = room_id ? parseInt(room_id) : null;

    const result = await pool.query(
      `UPDATE employees SET
         employee_code=$1, company_id=$2, firstname=$3, lastname=$4,
         gender=$5, date_of_birth=$6, nationality=$7, contact_no=$8,
         position=$9, status=$10, hired_at=$11,
         email=$12, notes=$13, photo=$14,
         employee_type=$15, province=$16, district=$17, village=$18,
         dormitory=$19, room_no=$20, office_building=$21,
         room_id=$22, office_floor=$23, office_room_no=$24, updated_at=NOW()
       WHERE employee_id=$25
       RETURNING *`,
      [
        employee_code, company_id, firstname, lastname, gender,
        date_of_birth || null, nationality, contact_no,
        position, status, hired_at || null,
        email || null, notes || null, photo,
        employee_type || null,
        province || null, district || null, village || null,
        dormitory || null, room_no || null, office_building || null,
        newRoomId, office_floor || null, office_room_no || null, id,
      ]
    );

    /* sync room status */
    if (newRoomId !== oldRoomId) {
      const syncRoom = async (rid: number) => {
        const occ = await pool.query(
          `SELECT COUNT(*) FROM employees WHERE room_id=$1 AND deleted_at IS NULL AND status!='Resigned'`, [rid]
        );
        const cap = await pool.query(`SELECT capacity FROM rooms WHERE room_id=$1`, [rid]);
        if (cap.rows.length === 0) return;
        const count    = parseInt(occ.rows[0].count);
        const capacity = cap.rows[0].capacity;
        const st = count === 0 ? "Available" : count >= capacity ? "Occupied" : "Partial";
        await pool.query(`UPDATE rooms SET status=$1, updated_at=NOW() WHERE room_id=$2`, [st, rid]);
      };
      if (newRoomId) await syncRoom(newRoomId).catch(() => {});
      if (oldRoomId) await syncRoom(oldRoomId).catch(() => {});
    }

    if (oldStatus && oldStatus !== status) {
      await pool.query(
        `INSERT INTO employee_timeline (employee_id, event_type, old_value, new_value, changed_by)
         VALUES ($1,'Status Change',$2,$3,$4)`,
        [id, oldStatus, status, req.user.user_id]
      ).catch(() => {});
    }
    if (oldPosition && oldPosition !== position) {
      await pool.query(
        `INSERT INTO employee_timeline (employee_id, event_type, old_value, new_value, changed_by)
         VALUES ($1,'Position Change',$2,$3,$4)`,
        [id, oldPosition, position, req.user.user_id]
      ).catch(() => {});
    }

    logAudit({
      action: "UPDATE", entityType: "EMPLOYEE", entityId: id,
      userId: req.user.user_id, companyId: result.rows[0].company_id,
      beforeData: oldEmp, afterData: result.rows[0],
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE EMPLOYEE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ================= UPDATE PHOTO ONLY ================= */
router.patch("/:id/photo", auth, upload.single("photo"), async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: "No file provided" });
    const fileErr = validateUpload(req.file.buffer, "image");
    if (fileErr) return res.status(400).json({ message: fileErr });

    if (!await canAccessEmployee(req.user.role, req.user.user_id, id))
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນພະນັກງານນີ້" });

    const old = await pool.query("SELECT photo FROM employees WHERE employee_id=$1", [id]);
    if (old.rows.length === 0) return res.status(404).json({ message: "Employee not found" });

    const oldPhoto = old.rows[0].photo;
    const newPhoto = await uploadToCloudinary(req.file.buffer);

    if (oldPhoto) await deleteFromCloudinary(oldPhoto).catch(() => {});

    await pool.query("UPDATE employees SET photo=$1 WHERE employee_id=$2", [newPhoto, id]);
    res.json({ photo: newPhoto });
  } catch (err) {
    console.error("PHOTO UPDATE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ================= BULK PHOTO UPLOAD ================= */
router.post("/bulk-photo", auth, upload.array("photos", 200), async (req: any, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ message: "No files provided" });

    const results: { code: string; status: "ok" | "not_found" | "error"; photo?: string }[] = [];

    for (const file of files) {
      const rawName = file.originalname.replace(/\.[^.]+$/, "").trim().toUpperCase();
      const fileErr = validateUpload(file.buffer, "image");
      if (fileErr) { results.push({ code: rawName, status: "error" }); continue; }
      try {
        const emp = await pool.query(
          "SELECT employee_id, photo, employee_code FROM employees WHERE UPPER(employee_code)=$1",
          [rawName]
        );
        if (emp.rows.length === 0) {
          results.push({ code: rawName, status: "not_found" });
          continue;
        }
        const { employee_id, photo: oldPhoto } = emp.rows[0];
        const newPhoto = await uploadToCloudinary(file.buffer);
        if (oldPhoto) await deleteFromCloudinary(oldPhoto).catch(() => {});
        await pool.query("UPDATE employees SET photo=$1 WHERE employee_id=$2", [newPhoto, employee_id]);
        results.push({ code: rawName, status: "ok", photo: newPhoto });
      } catch {
        results.push({ code: rawName, status: "error" });
      }
    }

    res.json({ results, total: files.length, success: results.filter(r => r.status === "ok").length });
  } catch (err) {
    console.error("BULK PHOTO ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ================= BULK DELETE EMPLOYEES ================= */
router.delete("/bulk", auth, async (req: any, res) => {
  try {
    const ids: number[] = req.body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "ກະລຸນາສົ່ງ ids ທີ່ຕ້ອງການລຶບ" });
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
    const empsResult = await pool.query(
      `SELECT e.*, c.companies_name FROM employees e
       LEFT JOIN companies c ON c.company_id = e.company_id
       WHERE e.employee_id IN (${placeholders}) AND e.deleted_at IS NULL`,
      ids
    );
    const emps = empsResult.rows;
    if (emps.length === 0) {
      return res.status(404).json({ message: "ບໍ່ພົບພະນັກງານທີ່ລະບຸ" });
    }

    /* ── Company Admin: ສ້າງ approval request ດຽວ ສຳລັບທຸກຄົນ ── */
    if (req.user.role === "Company Admin") {
      const userInfo = await pool.query(
        `SELECT fullname FROM users WHERE user_id=$1`, [req.user.user_id]
      );
      const requesterName = userInfo.rows[0]?.fullname || "Company Admin";

      /* ກັ່ນຕອງສະເພາະ employees ທີ່ company admin ມີສິດ — single query */
      const allowedResult = await pool.query(
        `SELECT e.*, c.companies_name
         FROM employees e
         LEFT JOIN companies c ON c.company_id = e.company_id
         WHERE e.employee_id = ANY($1::int[])
           AND e.deleted_at IS NULL
           AND e.company_id IN (
             SELECT company_id FROM user_companies WHERE user_id = $2
           )`,
        [ids, req.user.user_id]
      );
      const allowedEmps = allowedResult.rows;
      if (allowedEmps.length === 0) {
        return res.status(403).json({ message: "ບໍ່ມີສິດລຶບພະນັກງານທີ່ເລືອກ" });
      }

      const names = allowedEmps.map(e => `${e.firstname} ${e.lastname}`).join(", ");
      const entityName = `ລົບ ${allowedEmps.length} ຄົນ`;
      const empIds = allowedEmps.map(e => e.employee_id);

      const ar = await pool.query(
        `INSERT INTO approval_requests
           (request_type, entity_type, entity_id, entity_name, requested_by, requested_by_name, old_data, new_data, status)
         VALUES ('bulk_delete','employee',0,$1,$2,$3,$4,'{}','pending')
         RETURNING id`,
        [entityName, req.user.user_id, requesterName,
         JSON.stringify({ ids: empIds, employees: allowedEmps, summary: names })]
      );

      /* notification ດຽວ */
      await pool.query(
        `INSERT INTO notifications (from_user_id, message, entity_type, entity_id)
         VALUES ($1,$2,'employee',$3)`,
        [req.user.user_id,
         `${requesterName} ຂໍລຶບພະນັກງານ ${allowedEmps.length} ຄົນ: ${names.slice(0, 120)}`,
         ar.rows[0].id]
      ).catch(() => {});

      return res.status(202).json({ pending: true, count: allowedEmps.length });
    }

    /* ── Super Admin: execute ທັນທີ ── */
    await pool.query(
      `UPDATE employees SET deleted_at=NOW() WHERE employee_id = ANY($1::int[])`,
      [ids]
    );
    // Batch audit log — single INSERT instead of N inserts
    if (await isAuditLoggingEnabled()) {
      await pool.query(
        `INSERT INTO audit_log (action, entity_type, entity_id, user_id, company_id)
         SELECT 'DELETE', 'EMPLOYEE', employee_id, $1, company_id
         FROM employees WHERE employee_id = ANY($2::int[])`,
        [req.user.user_id, ids]
      ).catch(() => {});
    }

    res.json({ message: "deleted", count: emps.length });
  } catch (err) {
    console.error("BULK DELETE EMPLOYEE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ================= DELETE EMPLOYEE ================= */
router.delete("/:id", auth, async (req: any, res) => {
  try {
    const { id } = req.params;

    const empInfo = await pool.query(
      `SELECT e.*, c.companies_name FROM employees e
       LEFT JOIN companies c ON c.company_id = e.company_id
       WHERE e.employee_id=$1`, [id]
    );
    if (empInfo.rows.length === 0) {
      return res.status(404).json({ message: "ບໍ່ພົບພະນັກງານ" });
    }
    const emp = empInfo.rows[0];

    /* ── Company Admin: ຕ້ອງສ້າງ approval request ── */
    if (req.user.role === "Company Admin") {
      const access = await pool.query(
        `SELECT 1 FROM user_companies uc
         WHERE uc.company_id=$1 AND uc.user_id=$2`,
        [emp.company_id, req.user.user_id]
      );
      if (access.rows.length === 0) {
        return res.status(403).json({ message: "ບໍ່ມີສິດລຶບພະນັກງານນີ້" });
      }

      const userInfo = await pool.query(
        `SELECT fullname FROM users WHERE user_id=$1`, [req.user.user_id]
      );
      const requesterName = userInfo.rows[0]?.fullname || "Company Admin";
      const entityName = `${emp.firstname} ${emp.lastname} (${emp.employee_code || id})`;

      const ar = await pool.query(
        `INSERT INTO approval_requests
           (request_type, entity_type, entity_id, entity_name, requested_by, requested_by_name, old_data, new_data, status)
         VALUES ('delete','employee',$1,$2,$3,$4,$5,'{}','pending')
         RETURNING id`,
        [id, entityName, req.user.user_id, requesterName, JSON.stringify(emp)]
      );

      await pool.query(
        `INSERT INTO notifications (from_user_id, message, entity_type, entity_id)
         VALUES ($1,$2,'employee',$3)`,
        [
          req.user.user_id,
          `${requesterName} ຂໍອະນຸຍາດລຶບຂໍ້ມູນພະນັກງານ: ${entityName}`,
          id,
        ]
      ).catch(() => {});

      return res.status(202).json({ pending: true, approvalId: ar.rows[0].id });
    }

    /* ── Super Admin: execute ທັນທີ ── */
    await pool.query(`UPDATE employees SET deleted_at=NOW() WHERE employee_id=$1`, [id]);
    logAudit({ action: "DELETE", entityType: "EMPLOYEE", entityId: id, userId: req.user.user_id, companyId: emp.company_id });

    res.json({ message: "deleted" });
  } catch (err) {
    console.error("DELETE EMPLOYEE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
