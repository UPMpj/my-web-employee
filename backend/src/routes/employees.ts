import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { pool } from "../db";
import { auth } from "../middleware/auth";

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `emp_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("ອັບໂຫຼດໄດ້ສະເພາະໄຟລ໌ຮູບ (image) ເທົ່ານັ້ນ") as any, false);
  },
});

/* ================= GET EMPLOYEES ================= */
router.get("/", auth, async (req: any, res) => {
  try {
    const page      = parseInt(req.query.page       as string) || 1;
    const limit     = parseInt(req.query.limit      as string) || 10;
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
    console.log("EMPLOYEE LIST ERROR", err);
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
    res.json(result.rows[0]);
  } catch (err) {
    console.log("GET EMPLOYEE ERROR", err);
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

    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO employees
        (employee_code, company_id, firstname, lastname, gender,
         date_of_birth, nationality, contact_no, position, status, hired_at, email, notes, photo,
         employee_type, province, district, village, dormitory, room_no, office_building, room_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       RETURNING *`,
      [
        employee_code, company_id, firstname, lastname, gender,
        date_of_birth || null, nationality, contact_no,
        position, status || "Active", hired_at || null,
        email || null, notes || null, photo,
        employee_type || null,
        province || null, district || null, village || null,
        dormitory || null, room_no || null, office_building || null,
        room_id ? parseInt(room_id) : null,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.log("ADD EMPLOYEE ERROR", err);
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
    } = req.body;

    const existing = await pool.query(`SELECT photo, room_id AS old_room_id FROM employees WHERE employee_id=$1`, [id]);
    const oldPhoto  = existing.rows[0]?.photo || null;
    const oldRoomId = existing.rows[0]?.old_room_id || null;
    const photo = req.file ? `/uploads/${req.file.filename}` : oldPhoto;
    const newRoomId = room_id ? parseInt(room_id) : null;

    const result = await pool.query(
      `UPDATE employees SET
         employee_code=$1, company_id=$2, firstname=$3, lastname=$4,
         gender=$5, date_of_birth=$6, nationality=$7, contact_no=$8,
         position=$9, status=$10, hired_at=$11,
         email=$12, notes=$13, photo=$14,
         employee_type=$15,
         province=$16, district=$17, village=$18,
         dormitory=$19, room_no=$20, office_building=$21,
         room_id=$22,
         updated_at=NOW()
       WHERE employee_id=$23
       RETURNING *`,
      [
        employee_code, company_id, firstname, lastname, gender,
        date_of_birth || null, nationality, contact_no,
        position, status, hired_at || null,
        email || null, notes || null, photo,
        employee_type || null,
        province || null, district || null, village || null,
        dormitory || null, room_no || null, office_building || null,
        newRoomId,
        id,
      ]
    );

    /* sync room status when room assignment changes */
    if (newRoomId !== oldRoomId) {
      const syncRoom = async (rid: number) => {
        const occ = await pool.query(
          `SELECT COUNT(*) FROM employees WHERE room_id=$1 AND deleted_at IS NULL AND status!='Resigned'`, [rid]
        );
        const cap = await pool.query(`SELECT capacity FROM rooms WHERE room_id=$1`, [rid]);
        if (cap.rows.length === 0) return;
        const cnt = parseInt(occ.rows[0].count);
        const st  = cnt === 0 ? "Available" : "Occupied";
        await pool.query(`UPDATE rooms SET status=$1, updated_at=NOW() WHERE room_id=$2`, [st, rid]);
      };
      if (newRoomId) await syncRoom(newRoomId).catch(() => {});
      if (oldRoomId) await syncRoom(oldRoomId).catch(() => {});
    }

    /* ── ຖ້າ Company Admin ແກ້ໄຂ → ສ້າງ notification ໃຫ້ Super Admin ── */
    if (req.user.role === "Company Admin") {
      const emp = result.rows[0];
      const userInfo = await pool.query(`SELECT fullname FROM users WHERE user_id=$1`, [req.user.user_id]);
      const editorName = userInfo.rows[0]?.fullname || "Company Admin";
      await pool.query(
        `INSERT INTO notifications (from_user_id, message, entity_type, entity_id)
         VALUES ($1, $2, 'employee', $3)`,
        [
          req.user.user_id,
          `${editorName} ໄດ້ແກ້ໄຂຂໍ້ມູນພະນັກງານ: ${emp.firstname} ${emp.lastname} (${emp.employee_code || id})`,
          emp.employee_id,
        ]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.log("UPDATE EMPLOYEE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ================= DELETE EMPLOYEE ================= */
router.delete("/:id", auth, async (req: any, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "Super Admin") {
      const access = await pool.query(
        `SELECT 1 FROM employees e
         JOIN user_companies uc ON uc.company_id = e.company_id
         WHERE e.employee_id=$1 AND uc.user_id=$2`,
        [id, req.user.user_id]
      );
      if (access.rows.length === 0) {
        return res.status(403).json({ message: "ບໍ່ມີສິດລຶບພະນັກງານນີ້" });
      }
    }

    const empInfo = await pool.query(
      `SELECT company_id FROM employees WHERE employee_id=$1`, [id]
    );
    const companyId = empInfo.rows[0]?.company_id || null;

    await pool.query(`UPDATE employees SET deleted_at=NOW() WHERE employee_id=$1`, [id]);

    await pool.query(
      `INSERT INTO audit_log (action, entity_type, entity_id, user_id, company_id)
       VALUES ('DELETE', 'EMPLOYEE', $1, $2, $3)`,
      [id, req.user.user_id, companyId]
    ).catch(() => {});

    res.json({ message: "deleted" });
  } catch (err) {
    console.log("DELETE EMPLOYEE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
