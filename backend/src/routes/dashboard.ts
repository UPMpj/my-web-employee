import { Router } from "express";
import { pool } from "../db";
import { auth } from "../middleware/auth";

const router = Router();

/* ── Global stats (Super Admin sees all, others see own companies) ── */
router.get("/stats", auth, async (req: any, res) => {
  try {
    const isSuperAdmin = req.user.role === "Super Admin";

    const companiesQ = isSuperAdmin
      ? `SELECT COUNT(*) FROM companies`
      : `SELECT COUNT(*) FROM user_companies WHERE user_id=$1`;
    const companiesR = await pool.query(
      companiesQ, isSuperAdmin ? [] : [req.user.user_id]
    );

    const newCompaniesR = await pool.query(
      `SELECT COUNT(*) FROM companies WHERE created_at >= DATE_TRUNC('month', NOW())`
    );

    const empWhere = isSuperAdmin
      ? `WHERE deleted_at IS NULL`
      : `WHERE deleted_at IS NULL AND company_id IN (SELECT company_id FROM user_companies WHERE user_id=$1)`;
    const empR = await pool.query(
      `SELECT COUNT(*) FROM employees ${empWhere}`,
      isSuperAdmin ? [] : [req.user.user_id]
    );

    const resignedWhere = isSuperAdmin
      ? `WHERE status = 'Resigned' AND deleted_at IS NULL`
      : `WHERE status = 'Resigned' AND deleted_at IS NULL AND company_id IN (SELECT company_id FROM user_companies WHERE user_id=$1)`;
    const resignedR = await pool.query(
      `SELECT COUNT(*) FROM employees ${resignedWhere}`,
      isSuperAdmin ? [] : [req.user.user_id]
    );

    const newResignedR = await pool.query(
      `SELECT COUNT(*) FROM employees
       WHERE status = 'Resigned' AND deleted_at IS NULL
         AND updated_at >= DATE_TRUNC('month', NOW())`
    );

    const cardWhere = isSuperAdmin
      ? `WHERE ec.status = 'Active'`
      : `WHERE ec.status = 'Active' AND e.company_id IN (SELECT company_id FROM user_companies WHERE user_id=$1)`;
    const cardR = await pool.query(
      `SELECT COUNT(*) FROM employee_card ec
       JOIN employees e ON e.employee_id = ec.employee_id AND e.deleted_at IS NULL
       ${cardWhere}`,
      isSuperAdmin ? [] : [req.user.user_id]
    );

    const expiringR = await pool.query(
      `SELECT COUNT(*) FROM employee_card
       WHERE status = 'Active'
         AND issued_at IS NOT NULL
         AND issued_at + INTERVAL '1 year' BETWEEN NOW() AND NOW() + INTERVAL '30 days'`
    );

    res.json({
      companies:       Number(companiesR.rows[0].count),
      newCompanies:    Number(newCompaniesR.rows[0].count),
      employees:       Number(empR.rows[0].count),
      activeCards:     Number(cardR.rows[0].count),
      expiringPermits: Number(expiringR.rows[0].count),
      resigned:        Number(resignedR.rows[0].count),
      newResigned:     Number(newResignedR.rows[0].count),
    });
  } catch (err) {
    console.log("DASHBOARD STATS ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── Employees by company (bar chart) ── */
router.get("/by-company", auth, async (req: any, res) => {
  try {
    const isSuperAdmin = req.user.role === "Super Admin";
    const params: any[] = [];
    let where = "";

    if (!isSuperAdmin) {
      params.push(req.user.user_id);
      where = `AND e.company_id IN (SELECT company_id FROM user_companies WHERE user_id=$${params.length})`;
    }

    const result = await pool.query(
      `SELECT c.companies_name AS name,
         COUNT(e.employee_id)                                        AS total,
         COUNT(e.employee_id) FILTER (WHERE e.status = 'Active')    AS active,
         COUNT(e.employee_id) FILTER (WHERE e.status = 'Resigned')  AS resigned,
         COUNT(e.employee_id) FILTER (WHERE e.status = 'On Leave')  AS on_leave
       FROM companies c
       LEFT JOIN employees e ON e.company_id = c.company_id AND e.deleted_at IS NULL
       WHERE 1=1 ${where}
       GROUP BY c.company_id, c.companies_name
       ORDER BY total DESC
       LIMIT 8`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.log("BY COMPANY ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── Monthly headcount trend (last 6 months) ── */
router.get("/trend", auth, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('month', hired_at), 'Mon') AS month,
              DATE_TRUNC('month', hired_at)                 AS month_date,
              COUNT(*)                                      AS count
       FROM employees
       WHERE hired_at >= NOW() - INTERVAL '6 months'
         AND deleted_at IS NULL
       GROUP BY month_date, month
       ORDER BY month_date`
    );
    res.json(result.rows);
  } catch (err) {
    console.log("TREND ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── Recent system activity ── */
router.get("/activity", auth, async (req: any, res) => {
  try {
    const isSuperAdmin = req.user.role === "Super Admin";
    const params: any[] = [];
    let where = "";

    if (!isSuperAdmin) {
      params.push(req.user.user_id);
      where = `AND a.company_id IN (SELECT company_id FROM user_companies WHERE user_id=$${params.length})`;
    }

    const result = await pool.query(
      `SELECT a.action, a.entity_type AS entity, a.created_at,
              u.fullname,
              c.companies_name,
              c.status
       FROM audit_log a
       LEFT JOIN users     u ON u.user_id     = a.user_id
       LEFT JOIN companies c ON c.company_id  = a.company_id
       WHERE 1=1 ${where}
       ORDER BY a.created_at DESC
       LIMIT 10`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.log("ACTIVITY ERROR", err);
    res.status(500).json({ message: "activity error" });
  }
});

/* ── Legacy routes ── */
router.get("/stats/:companyId", auth, (_req, res) => {
  res.redirect("/api/dashboard/stats");
});
router.get("/activity/:companyId", auth, (_req, res) => {
  res.redirect("/api/dashboard/activity");
});

export default router;
