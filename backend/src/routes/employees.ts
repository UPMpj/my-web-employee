import { Router } from "express";
import multer from "multer";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { uploadToCloudinary, deleteFromCloudinary } from "../cloudinary";
import { validateUpload } from "../utils/validateFile";
import { nextEmployeeCode } from "../utils/employeeCode";
import { logAudit, isAuditLoggingEnabled } from "../utils/auditLog";

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
      `SELECT * FROM employees WHERE employee_id=$1`, [id]
    );
    const oldEmp    = existing.rows[0] || {};
    const oldPhoto  = oldEmp.photo || null;
    const photo     = req.file
      ? await uploadToCloudinary(req.file.buffer)
      : oldPhoto;
    if (req.file && oldPhoto && oldPhoto.startsWith("https://res.cloudinary.com")) {
      deleteFromCloudinary(oldPhoto).catch(() => {});
    }

    /* ── Company Admin: ສ້າງ approval request ແທນ execute ທັນທີ ── */
    if (req.user.role === "Company Admin") {
      const userInfo = await pool.query(
        `SELECT fullname FROM users WHERE user_id=$1`, [req.user.user_id]
      );
      const requesterName = userInfo.rows[0]?.fullname || "Company Admin";
      const entityName = `${firstname} ${lastname} (${employee_code || id})`;

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
        [
          req.user.user_id,
          `${requesterName} ຂໍອະນຸຍາດແກ້ໄຂຂໍ້ມູນພະນັກງານ: ${entityName}`,
          id,
        ]
      ).catch(() => {});

      return res.status(202).json({ pending: true, approvalId: ar.rows[0].id });
    }

    /* ── Super Admin: execute ທັນທີ ── */
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
