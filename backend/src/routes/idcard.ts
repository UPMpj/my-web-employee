import { Router } from "express";
import { pool } from "../db";
import { auth } from "../middleware/auth";

const router = Router();

/* ── GET /api/idcard — list employees + card status ── */
router.get("/", auth, async (req: any, res) => {
  try {
    const isSuperAdmin = req.user.role === "Super Admin";
    const page    = parseInt(req.query.page   as string) || 1;
    const limit   = parseInt(req.query.limit  as string) || 12;
    const search  = (req.query.search         as string) || "";
    const company = (req.query.company_id     as string) || "all";
    const offset  = (page - 1) * limit;

    const params: any[] = [];
    const conds: string[] = ["e.deleted_at IS NULL", "e.firstname IS NOT NULL"];

    if (!isSuperAdmin) {
      params.push(req.user.user_id);
      conds.push(`e.company_id IN (SELECT company_id FROM user_companies WHERE user_id=$${params.length})`);
    }

    if (company && company !== "all") {
      params.push(company);
      conds.push(`e.company_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const n = params.length;
      conds.push(`(e.firstname ILIKE $${n} OR e.lastname ILIKE $${n} OR e.employee_code ILIKE $${n} OR e.position ILIKE $${n})`);
    }

    const where = `WHERE ${conds.join(" AND ")}`;

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM employees e ${where}`, params
    );

    const dataParams = [...params, limit, offset];
    const dataRes = await pool.query(
      `SELECT e.employee_id, e.employee_code, e.firstname, e.lastname,
              e.position, e.photo, e.status, e.hired_at,
              e.nationality, e.gender, e.contact_no,
              c.companies_name,
              ec.card_id, ec.card_no, ec.status AS card_status,
              ec.issued_at, ec.printed_at
       FROM employees e
       LEFT JOIN companies    c  ON c.company_id  = e.company_id
       LEFT JOIN employee_card ec ON ec.employee_id = e.employee_id
       ${where}
       ORDER BY e.employee_id DESC
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
    console.log("IDCARD LIST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── GET /api/idcard/:id — single employee card data ── */
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT e.employee_id, e.employee_code, e.firstname, e.lastname,
              e.position, e.photo, e.status, e.hired_at,
              c.companies_name,
              ec.card_id, ec.card_no, ec.status AS card_status,
              ec.issued_at, ec.printed_at,
              ec.revoked_at, ec.revoked_reason,
              ec.returned_at, ec.returned_by,
              ui.fullname AS issued_by_name,
              rb.fullname AS returned_by_name
       FROM employees e
       LEFT JOIN companies     c  ON c.company_id   = e.company_id
       LEFT JOIN employee_card ec ON ec.employee_id  = e.employee_id
       LEFT JOIN users         ui ON ui.user_id      = ec.issued_by
       LEFT JOIN users         rb ON rb.user_id      = ec.returned_by
       WHERE e.employee_id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.log("IDCARD GET ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── POST /api/idcard/:id/issue — issue card for employee ── */
router.post("/:id/issue", auth, async (req: any, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      `SELECT card_id FROM employee_card WHERE employee_id=$1`, [id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Card ຂອງ employee ນີ້ມີແລ້ວ" });
    }

    const emp = await pool.query(
      `SELECT employee_code, company_id FROM employees WHERE employee_id=$1`, [id]
    );
    if (emp.rows.length === 0) return res.status(404).json({ message: "Employee not found" });

    const cardNo = `CARD-${emp.rows[0].employee_code || id}-${Date.now().toString().slice(-4)}`;

    const result = await pool.query(
      `INSERT INTO employee_card (employee_id, company_id, card_no, status, issued_at, issued_by)
       VALUES ($1, $2, $3, 'Active', NOW(), $4)
       RETURNING *`,
      [id, emp.rows[0].company_id, cardNo, req.user.user_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.log("ISSUE CARD ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── PATCH /api/idcard/:id/printed — mark as printed ── */
router.patch("/:id/printed", auth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE employee_card SET printed_at=NOW() WHERE employee_id=$1`, [id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

/* ── DELETE /api/idcard/:id/card — remove card record ── */
router.delete("/:id/card", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM employee_card WHERE employee_id=$1 RETURNING card_id`, [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ບໍ່ພົບ Card" });
    }
    res.json({ ok: true });
  } catch (err) {
    console.log("DELETE CARD ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
