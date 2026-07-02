import { Router } from "express";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { issueCardForEmployee } from "../utils/issueCard";
import { canAccessEmployee } from "../utils/employeeAccess";
import { logAudit } from "../utils/auditLog";

export { issueCardForEmployee };

const router = Router();

/* ── auto-add card_color and print_count columns if missing ── */
pool.query(`
  ALTER TABLE employee_card ADD COLUMN IF NOT EXISTS card_color VARCHAR(20) DEFAULT '#1e3a8a'
`).catch(() => {});
pool.query(`
  ALTER TABLE employee_card ADD COLUMN IF NOT EXISTS print_count INT DEFAULT 0
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
    const role_filter = (req.query.role_filter    as string) || "";
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

    /* role_filter: filter by card template type (position keyword matching) */
    if (role_filter === "manager") {
      conds.push(`e.position ~* '\\m(manager|director|head|chief|president|ceo|vp|vice|executive|officer)\\M'`);
    } else if (role_filter === "supervisor") {
      conds.push(`e.position ~* '\\m(supervisor|lead|senior)\\M'`);
    } else if (role_filter === "contractor") {
      conds.push(`e.position ~* '\\mcontract(or)?\\M'`);
    } else if (role_filter === "visitor") {
      conds.push(`e.position ~* '\\m(visitor|guest|temp(orary)?)\\M'`);
    } else if (role_filter === "staff") {
      conds.push(`NOT (e.position ~* '\\m(manager|director|head|chief|president|ceo|vp|vice|executive|officer|supervisor|lead|senior|contract(or)?|visitor|guest|temp(orary)?)\\M')`);
    }

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
              e.nationality, e.gender, e.contact_no, e.office_building,
              c.companies_name,
              COALESCE(c.card_color, '#1a3a6b')         AS company_staff_color,
              COALESCE(c.manager_card_color, '#7f1d1d') AS manager_card_color,
              ec.card_id, ec.card_no, ec.status AS card_status,
              ec.issued_at, ec.printed_at, ec.card_color,
              ec.returned_at, ec.returned_by,
              COALESCE(ec.print_count, 0)               AS print_count,
              (ec.issued_at + INTERVAL '1 year')::date  AS valid_until
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
    console.error("IDCARD LIST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── GET /api/idcard/:id — single employee card data ── */
router.get("/:id", auth, async (req: any, res) => {
  try {
    const { id } = req.params;

    if (!await canAccessEmployee(req.user.role, req.user.user_id, id))
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນພະນັກງານນີ້" });

    const result = await pool.query(
      `SELECT e.employee_id, e.employee_code, e.firstname, e.lastname,
              e.position, e.photo, e.status, e.hired_at,
              e.nationality, e.employee_type,
              e.dormitory, e.office_building, e.room_no,
              r.floor_number, r.room_number, b.building_name,
              c.companies_name,
              COALESCE(c.card_color, '#1a3a6b')         AS company_staff_color,
              COALESCE(c.manager_card_color, '#7f1d1d') AS manager_card_color,
              ec.card_id, ec.card_no, ec.status AS card_status,
              ec.issued_at, ec.printed_at, ec.card_color,
              ec.revoked_at, ec.revoked_reason,
              ec.returned_at, ec.returned_by,
              ui.fullname AS issued_by_name,
              rb.fullname AS returned_by_name,
              MAX(p.permit_number) FILTER (WHERE LOWER(p.permit_type) LIKE '%passport%') AS passport_no
       FROM employees e
       LEFT JOIN companies        c  ON c.company_id    = e.company_id
       LEFT JOIN employee_card    ec ON ec.employee_id  = e.employee_id
       LEFT JOIN users            ui ON ui.user_id      = ec.issued_by
       LEFT JOIN users            rb ON rb.user_id      = ec.returned_by
       LEFT JOIN rooms            r  ON r.room_id       = e.room_id
       LEFT JOIN buildings        b  ON b.building_id   = r.building_id
       LEFT JOIN employee_permits p  ON p.employee_id   = e.employee_id
       WHERE e.employee_id = $1
       GROUP BY e.employee_id, c.companies_name, c.card_color, c.manager_card_color,
                ec.card_id, ec.card_no, ec.status, ec.issued_at, ec.printed_at, ec.card_color,
                ec.revoked_at, ec.revoked_reason, ec.returned_at, ec.returned_by,
                ui.fullname, rb.fullname, r.floor_number, r.room_number, b.building_name`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("IDCARD GET ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── POST /api/idcard/:id/issue — issue card for employee ── */
router.post("/:id/issue", auth, async (req: any, res) => {
  try {
    const { id } = req.params;

    if (!await canAccessEmployee(req.user.role, req.user.user_id, id))
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນພະນັກງານນີ້" });

    const existing = await pool.query(
      `SELECT card_id FROM employee_card WHERE employee_id=$1`, [id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Card ຂອງ employee ນີ້ມີແລ້ວ" });
    }

    const card = await issueCardForEmployee(parseInt(id), req.user.user_id);
    logAudit({
      userId: req.user.user_id,
      action: "ISSUE_CARD",
      entityType: "EMPLOYEE_CARD",
      entityId: id,
      afterData: card,
    });
    res.json(card);
  } catch (err: any) {
    console.error("ISSUE CARD ERROR", err);
    if (err.message === "Employee not found") return res.status(404).json({ message: "Employee not found" });
    res.status(500).json({ message: "server error" });
  }
});

/* ── PATCH /api/idcard/:id/return — mark card as returned ── */
router.patch("/:id/return", auth, async (req: any, res) => {
  try {
    const { id } = req.params;

    if (!await canAccessEmployee(req.user.role, req.user.user_id, id))
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນພະນັກງານນີ້" });

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
    logAudit({
      userId: req.user.user_id,
      action: "RETURN_CARD",
      entityType: "EMPLOYEE_CARD",
      entityId: id,
      afterData: result.rows[0],
    });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("RETURN CARD ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── PATCH /api/idcard/:id/printed — mark as printed and increment count ── */
router.patch("/:id/printed", auth, async (req: any, res) => {
  try {
    const { id } = req.params;

    if (!await canAccessEmployee(req.user.role, req.user.user_id, id))
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນພະນັກງານນີ້" });

    await pool.query(
      `UPDATE employee_card
       SET printed_at=NOW(), print_count=COALESCE(print_count,0)+1
       WHERE employee_id=$1`, [id]
    );
    logAudit({
      userId: req.user.user_id,
      action: "PRINT_CARD",
      entityType: "EMPLOYEE_CARD",
      entityId: id,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

/* ── DELETE /api/idcard/:id/card — remove card record ── */
router.delete("/:id/card", auth, async (req: any, res) => {
  try {
    const { id } = req.params;

    if (!await canAccessEmployee(req.user.role, req.user.user_id, id))
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນພະນັກງານນີ້" });

    const result = await pool.query(
      `DELETE FROM employee_card WHERE employee_id=$1 RETURNING card_id`, [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ບໍ່ພົບ Card" });
    }
    logAudit({
      userId: req.user.user_id,
      action: "DELETE_CARD",
      entityType: "EMPLOYEE_CARD",
      entityId: id,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE CARD ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
