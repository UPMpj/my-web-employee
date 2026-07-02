import { Router } from "express";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { allow } from "../middleware/role";
import { isPositiveInt, isEnum, isHexColor, trimOrNull } from "../utils/validate";
import { logAudit } from "../utils/auditLog";

const COMPANY_STATUSES = ["Active", "Inactive"];

const router = Router();

/* Returns true if the user is allowed to view this company's data */
async function canAccessCompany(userRole: string, userId: number, companyId: string | number): Promise<boolean> {
  if (userRole === "Super Admin") return true;
  const r = await pool.query(
    `SELECT 1 FROM user_companies WHERE user_id=$1 AND company_id=$2`,
    [userId, companyId]
  );
  return r.rows.length > 0;
}

/* ── auto-add color columns to companies if missing ── */
pool.query(`
  ALTER TABLE companies ADD COLUMN IF NOT EXISTS card_color VARCHAR(20) DEFAULT '#1a3a6b'
`).catch(() => {});
pool.query(`
  ALTER TABLE companies ADD COLUMN IF NOT EXISTS manager_card_color VARCHAR(20) DEFAULT '#7f1d1d'
`).catch(() => {});

/* =========================================================
   GET /api/company/my/:userId  — companies of logged-in user
   ========================================================= */
router.get("/my/:userId", auth, async (req: any, res) => {
  try {
    if (req.user.user_id != req.params.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const result = await pool.query(
      `SELECT c.company_id, c.companies_name
       FROM user_companies uc
       JOIN companies c ON c.company_id = uc.company_id
       WHERE uc.user_id = $1`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("COMPANY ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* =========================================================
   GET /api/company  — list with search + pagination
   ========================================================= */
router.get("/", auth, async (req: any, res) => {
  try {
    const page   = parseInt(req.query.page   as string) || 1;
    const limit  = parseInt(req.query.limit  as string) || 10;
    const search = (req.query.search         as string) || "";
    const offset = (page - 1) * limit;

    const params: any[] = [];
    const conds: string[] = [];

    // non-Super Admin เห็นเฉพาะ company ของตัวเอง
    if (req.user.role !== "Super Admin") {
      params.push(req.user.user_id);
      conds.push(`c.company_id IN (SELECT company_id FROM user_companies WHERE user_id = $${params.length})`);
    }

    if (search) {
      params.push(`%${search}%`);
      conds.push(`c.companies_name ILIKE $${params.length}`);
    }

    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM companies c ${where}`,
      params
    );

    const dataParams = [...params, limit, offset];
    const dataRes = await pool.query(
      `SELECT
         c.company_id,
         c.companies_name,
         c.status,
         c.created_at,
         c.owner_id,
         c.card_color,
         c.manager_card_color,
         u.fullname AS created_by_name,
         CONCAT(e.firstname, ' ', e.lastname) AS owner_name
       FROM companies c
       LEFT JOIN users u    ON u.user_id      = c.created_by
       LEFT JOIN employees e ON e.employee_id = c.owner_id
       ${where}
       ORDER BY c.company_id DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    res.json({
      data:  dataRes.rows,
      total: parseInt(countRes.rows[0].count),
      page,
      limit,
    });
  } catch (err) {
    console.error("COMPANY LIST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* =========================================================
   POST /api/company  — create company (Super Admin)
   ========================================================= */
router.post("/", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { companies_name, status, owner_id, card_color, manager_card_color } = req.body;

    const name = trimOrNull(companies_name);
    if (!name) return res.status(400).json({ message: "companies_name ຕ້ອງໃສ່" });
    if (name.length > 200) return res.status(400).json({ message: "companies_name ຍາວເກີນ 200 ຕົວ" });

    const effectiveStatus = status || "Active";
    if (!isEnum(effectiveStatus, COMPANY_STATUSES))
      return res.status(400).json({ message: "status ຕ້ອງເປັນ Active ຫຼື Inactive" });

    if (owner_id !== undefined && owner_id !== null && !isPositiveInt(owner_id))
      return res.status(400).json({ message: "owner_id ບໍ່ຖືກຕ້ອງ" });

    const effectiveCardColor = card_color || "#1a3a6b";
    const effectiveMgrColor  = manager_card_color || "#7f1d1d";
    if (!isHexColor(effectiveCardColor))
      return res.status(400).json({ message: "card_color ຕ້ອງເປັນ hex color (#rrggbb)" });
    if (!isHexColor(effectiveMgrColor))
      return res.status(400).json({ message: "manager_card_color ຕ້ອງເປັນ hex color (#rrggbb)" });

    const result = await pool.query(
      `INSERT INTO companies (companies_name, status, owner_id, created_by, card_color, manager_card_color)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, effectiveStatus, owner_id || null, req.user.user_id, effectiveCardColor, effectiveMgrColor]
    );
    logAudit({
      userId: req.user.user_id,
      action: "CREATE",
      entityType: "COMPANY",
      entityId: result.rows[0].company_id,
      afterData: result.rows[0],
    });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("ADD COMPANY ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* =========================================================
   PUT /api/company/:id  — update company (Super Admin)
   ========================================================= */
router.put("/:id", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!isPositiveInt(id)) return res.status(400).json({ message: "company_id ບໍ່ຖືກຕ້ອງ" });

    const { companies_name, status, owner_id, card_color, manager_card_color } = req.body;

    const name = trimOrNull(companies_name);
    if (!name) return res.status(400).json({ message: "companies_name ຕ້ອງໃສ່" });
    if (name.length > 200) return res.status(400).json({ message: "companies_name ຍາວເກີນ 200 ຕົວ" });

    if (status && !isEnum(status, COMPANY_STATUSES))
      return res.status(400).json({ message: "status ຕ້ອງເປັນ Active ຫຼື Inactive" });

    if (owner_id !== undefined && owner_id !== null && !isPositiveInt(owner_id))
      return res.status(400).json({ message: "owner_id ບໍ່ຖືກຕ້ອງ" });

    const effectiveCardColor = card_color || "#1a3a6b";
    const effectiveMgrColor  = manager_card_color || "#7f1d1d";
    if (!isHexColor(effectiveCardColor))
      return res.status(400).json({ message: "card_color ຕ້ອງເປັນ hex color (#rrggbb)" });
    if (!isHexColor(effectiveMgrColor))
      return res.status(400).json({ message: "manager_card_color ຕ້ອງເປັນ hex color (#rrggbb)" });

    const result = await pool.query(
      `UPDATE companies SET companies_name=$1, status=$2, owner_id=$3, card_color=$4, manager_card_color=$5
       WHERE company_id=$6 RETURNING *`,
      [name, status, owner_id || null, effectiveCardColor, effectiveMgrColor, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Company not found" });
    }
    logAudit({
      userId: req.user.user_id,
      action: "UPDATE",
      entityType: "COMPANY",
      entityId: id,
      afterData: result.rows[0],
    });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE COMPANY ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* =========================================================
   DELETE /api/company/:id  — delete company (Super Admin)
   ========================================================= */
router.delete("/:id", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query(`SELECT * FROM companies WHERE company_id=$1`, [id]);
    await pool.query(`DELETE FROM companies WHERE company_id=$1`, [id]);
    logAudit({
      userId: req.user.user_id,
      action: "DELETE",
      entityType: "COMPANY",
      entityId: id,
      beforeData: existing.rows[0],
    });
    res.json({ message: "deleted" });
  } catch (err) {
    console.error("DELETE COMPANY ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* =========================================================
   GET /api/company/all  — all companies (Super Admin)
   ========================================================= */
router.get("/all", auth, allow("Super Admin"), async (req, res) => {
  const result = await pool.query(`SELECT * FROM companies ORDER BY company_id DESC`);
  res.json(result.rows);
});

/* =========================================================
   GET /api/company/:id  — single company detail
   ========================================================= */
router.get("/:id", auth, async (req: any, res) => {
  try {
    const { id } = req.params;

    if (!await canAccessCompany(req.user.role, req.user.user_id, id))
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນ company ນີ້" });

    const result = await pool.query(
      `SELECT c.*,
         u.fullname AS created_by_name, u.email AS created_by_email,
         CONCAT(e.firstname, ' ', e.lastname) AS owner_name
       FROM companies c
       LEFT JOIN users     u ON u.user_id      = c.created_by
       LEFT JOIN employees e ON e.employee_id  = c.owner_id
       WHERE c.company_id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET COMPANY ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* =========================================================
   GET /api/company/:id/stats  — employee summary stats
   ========================================================= */
router.get("/:id/stats", auth, async (req: any, res) => {
  try {
    const { id } = req.params;

    if (!await canAccessCompany(req.user.role, req.user.user_id, id))
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນ company ນີ້" });

    const result = await pool.query(
      `SELECT
         COUNT(*)                                                          AS total,
         COUNT(*) FILTER (WHERE status = 'Active')                        AS active,
         COUNT(*) FILTER (WHERE status = 'Resigned')                      AS resigned,
         COUNT(*) FILTER (WHERE hired_at >= DATE_TRUNC('month', NOW()))   AS new_hires
       FROM employees
       WHERE company_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("COMPANY STATS ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* =========================================================
   GET /api/company/:id/users  — employees of this company
   ========================================================= */
router.get("/:id/users", auth, async (req: any, res) => {
  try {
    const { id } = req.params;

    if (!await canAccessCompany(req.user.role, req.user.user_id, id))
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນ company ນີ້" });

    const result = await pool.query(
      `SELECT employee_id, employee_code, firstname, lastname,
              email, position, status, hired_at, photo
       FROM employees
       WHERE company_id = $1 AND deleted_at IS NULL
       ORDER BY employee_id DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("COMPANY EMPLOYEES ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* =========================================================
   PATCH /api/company/:id/status  — toggle active/inactive
   ========================================================= */
router.patch("/:id/status", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!isPositiveInt(id)) return res.status(400).json({ message: "company_id ບໍ່ຖືກຕ້ອງ" });

    const { status } = req.body;
    if (!isEnum(status, COMPANY_STATUSES))
      return res.status(400).json({ message: "status ຕ້ອງເປັນ Active ຫຼື Inactive" });

    const result = await pool.query(
      `UPDATE companies SET status=$1 WHERE company_id=$2 RETURNING *`,
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Company not found" });
    logAudit({
      userId: req.user.user_id,
      action: "UPDATE_STATUS",
      entityType: "COMPANY",
      entityId: id,
      afterData: { status },
    });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("TOGGLE STATUS ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
