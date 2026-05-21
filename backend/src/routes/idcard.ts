import { Router } from "express";
import { pool } from "../db";
import { auth } from "../middleware/auth";

const router = Router();

/* ── auto-add card_color column if missing ── */
pool.query(`
  ALTER TABLE employee_card ADD COLUMN IF NOT EXISTS card_color VARCHAR(20) DEFAULT '#1e3a8a'
`).catch(() => {});

/* ── GET /api/idcard — list employees + card status ── */
router.get("/", auth, async (req: any, res) => {
  try {
    const isSuperAdmin = req.user.role === "Super Admin";
    const page        = parseInt(req.query.page   as string) || 1;
    const limit       = parseInt(req.query.limit  as string) || 12;
    const search      = (req.query.search         as string) || "";
    const company     = (req.query.company_id     as string) || "all";
    const card_filter = (req.query.card_filter    as string) || "";
    const offset      = (page - 1) * limit;

    const params: any[] = [];
    const conds: string[] = ["e.deleted_at IS NULL", "e.firstname IS NOT NULL"];

    /* card_filter applied after LEFT JOIN */
    const cardFilterCond =
      card_filter === "has_card"    ? "AND ec.card_id IS NOT NULL"
      : card_filter === "no_card"   ? "AND ec.card_id IS NULL"
      : card_filter === "printed"   ? "AND ec.card_id IS NOT NULL AND ec.printed_at IS NOT NULL"
      : card_filter === "not_returned" ? "AND e.status='Resigned' AND ec.card_id IS NOT NULL AND ec.returned_at IS NULL"
      : card_filter === "returned"  ? "AND e.status='Resigned' AND ec.card_id IS NOT NULL AND ec.returned_at IS NOT NULL"
      : "";

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

    /* stats always show full counts (no card_filter applied) */
    const statsRes = await pool.query(
      `SELECT
         COUNT(ec.card_id)::int                                                                          AS total_cards,
         COUNT(*) FILTER (WHERE ec.card_id IS NULL)::int                                                AS no_card,
         COUNT(ec.card_id) FILTER (WHERE ec.printed_at IS NOT NULL)::int                                AS printed,
         COUNT(ec.card_id) FILTER (WHERE e.status='Resigned' AND ec.card_id IS NOT NULL)::int           AS resigned_with_card,
         COUNT(ec.card_id) FILTER (WHERE e.status='Resigned' AND ec.card_id IS NOT NULL AND ec.returned_at IS NOT NULL)::int AS card_returned,
         COUNT(ec.card_id) FILTER (WHERE e.status='Resigned' AND ec.card_id IS NOT NULL AND ec.returned_at IS NULL)::int    AS not_returned
       FROM employees e
       LEFT JOIN employee_card ec ON ec.employee_id = e.employee_id
       ${where}`, params
    );

    /* count respects card_filter */
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM employees e
       LEFT JOIN employee_card ec ON ec.employee_id = e.employee_id
       ${where} ${cardFilterCond}`, params
    );

    const dataParams = [...params, limit, offset];
    const dataRes = await pool.query(
      `SELECT e.employee_id, e.employee_code, e.firstname, e.lastname,
              e.position, e.photo, e.status, e.hired_at,
              e.nationality, e.gender, e.contact_no,
              c.companies_name,
              COALESCE(c.card_color, '#1a3a6b')         AS company_staff_color,
              COALESCE(c.manager_card_color, '#7f1d1d') AS manager_card_color,
              ec.card_id, ec.card_no, ec.status AS card_status,
              ec.issued_at, ec.printed_at, ec.card_color,
              ec.returned_at, ec.returned_by
       FROM employees e
       LEFT JOIN companies     c  ON c.company_id   = e.company_id
       LEFT JOIN employee_card ec ON ec.employee_id = e.employee_id
       ${where} ${cardFilterCond}
       ORDER BY e.employee_id DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    const s = statsRes.rows[0];
    res.json({
      data:               dataRes.rows,
      total:              parseInt(countRes.rows[0].count),
      page,
      limit,
      total_cards:        s.total_cards,
      no_card:            s.no_card,
      printed:            s.printed,
      resigned_with_card: s.resigned_with_card,
      card_returned:      s.card_returned,
      not_returned:       s.not_returned,
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
              COALESCE(c.card_color, '#1a3a6b')         AS company_staff_color,
              COALESCE(c.manager_card_color, '#7f1d1d') AS manager_card_color,
              ec.card_id, ec.card_no, ec.status AS card_status,
              ec.issued_at, ec.printed_at, ec.card_color,
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
      `SELECT e.employee_code, e.position, e.company_id,
              COALESCE(c.card_color, '#1a3a6b')         AS staff_color,
              COALESCE(c.manager_card_color, '#7f1d1d') AS manager_color
       FROM employees e
       LEFT JOIN companies c ON c.company_id = e.company_id
       WHERE e.employee_id=$1`, [id]
    );
    if (emp.rows.length === 0) return res.status(404).json({ message: "Employee not found" });

    const { company_id, position, staff_color, manager_color } = emp.rows[0];
    const MANAGER_RE = /\b(manager|director|head|chief|president|ceo|supervisor|lead|vp|vice|executive|officer)\b/i;
    const card_color = MANAGER_RE.test(position || "") ? manager_color : staff_color;
    const year   = new Date().getFullYear();
    const seq    = Date.now().toString().slice(-5);
    const cardNo = `C-${year}-${seq}`;

    const result = await pool.query(
      `INSERT INTO employee_card (employee_id, company_id, card_no, status, issued_at, issued_by, card_color)
       VALUES ($1, $2, $3, 'Active', NOW(), $4, $5)
       RETURNING *`,
      [id, company_id, cardNo, req.user.user_id, card_color]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.log("ISSUE CARD ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── PATCH /api/idcard/:id/return — mark card as returned ── */
router.patch("/:id/return", auth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE employee_card
       SET returned_at=NOW(), returned_by=$1, status='Returned'
       WHERE employee_id=$2
       RETURNING *`,
      [req.user.user_id, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ບໍ່ພົບ Card" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.log("RETURN CARD ERROR", err);
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
