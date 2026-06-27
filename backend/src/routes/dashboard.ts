import { Router } from "express";
import { pool } from "../db";
import { auth } from "../middleware/auth";

const router = Router();

/* ── Global stats (Super Admin sees all, others see own companies) ── */
router.get("/stats", auth, async (req: any, res) => {
  const isSuperAdmin = req.user.role === "Super Admin";
  const uid = req.user.user_id;

  const safeCount = async (sql: string, params: any[] = []): Promise<number> => {
    try {
      const r = await pool.query(sql, params);
      return Number(r.rows[0]?.count ?? r.rows[0]?.total ?? 0);
    } catch { return 0; }
  };

  try {
    /* Use parameterized queries — never interpolate uid into SQL */
    const coSql    = isSuperAdmin ? "" : "AND company_id IN (SELECT company_id FROM user_companies WHERE user_id=$1)";
    const coParams = isSuperAdmin ? [] : [uid];

    const [companies, newCompanies, employees, genderR, resigned, newResigned, onLeave, activeCards, expiringPermits] =
      await Promise.all([
        safeCount(isSuperAdmin
          ? `SELECT COUNT(*) FROM companies`
          : `SELECT COUNT(*) FROM user_companies WHERE user_id=$1`, isSuperAdmin ? [] : [uid]),
        safeCount(`SELECT COUNT(*) FROM companies WHERE created_at >= DATE_TRUNC('month', NOW())`),
        safeCount(`SELECT COUNT(*) FROM employees WHERE deleted_at IS NULL ${coSql}`, coParams),
        pool.query(
          `SELECT COUNT(*) FILTER (WHERE gender='Male')::int   AS male,
                  COUNT(*) FILTER (WHERE gender='Female')::int AS female
           FROM employees WHERE deleted_at IS NULL ${coSql}`,
          coParams
        ).catch(() => ({ rows: [{ male: 0, female: 0 }] })),
        safeCount(`SELECT COUNT(*) FROM employees WHERE status='Resigned' AND deleted_at IS NULL ${coSql}`, coParams),
        safeCount(
          `SELECT COUNT(*) FROM employees WHERE status='Resigned' AND deleted_at IS NULL AND updated_at >= DATE_TRUNC('month', NOW()) ${coSql}`,
          coParams
        ),
        safeCount(`SELECT COUNT(*) FROM employees WHERE status='On Leave' AND deleted_at IS NULL ${coSql}`, coParams),
        safeCount(isSuperAdmin
          ? `SELECT COUNT(*) FROM employee_card WHERE status='Active'`
          : `SELECT COUNT(*) FROM employee_card ec JOIN employees e ON e.employee_id=ec.employee_id AND e.deleted_at IS NULL WHERE ec.status='Active' AND e.company_id IN (SELECT company_id FROM user_companies WHERE user_id=$1)`,
          isSuperAdmin ? [] : [uid]),
        safeCount(`SELECT COUNT(*) FROM employee_card WHERE status='Active' AND issued_at IS NOT NULL AND issued_at + INTERVAL '1 year' BETWEEN NOW() AND NOW() + INTERVAL '30 days'`),
      ]);

    res.json({
      companies,
      newCompanies,
      employees,
      male:            (genderR as any).rows[0].male,
      female:          (genderR as any).rows[0].female,
      activeCards,
      expiringPermits,
      resigned,
      newResigned,
      onLeave,
    });
  } catch (err) {
    console.error("DASHBOARD STATS ERROR", err);
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
    console.error("BY COMPANY ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── Monthly headcount trend (last 6 months) ──
   Cumulative headcount as of each month-end, not just that month's new hires —
   a "new hires per month" count reads as empty whenever recent hiring is slow. */
router.get("/trend", auth, async (req: any, res) => {
  try {
    const isSuperAdmin = req.user.role === "Super Admin";
    const params: any[] = [];
    let where = "";

    if (!isSuperAdmin) {
      params.push(req.user.user_id);
      where = `AND e.company_id IN (SELECT company_id FROM user_companies WHERE user_id=$${params.length})`;
    }

    const result = await pool.query(
      `SELECT TO_CHAR(months.month_end, 'Mon') AS month,
              months.month_end                 AS month_date,
              (SELECT COUNT(*) FROM employees e
                 WHERE e.deleted_at IS NULL
                   AND e.hired_at <= months.month_end
                   ${where}) AS count
       FROM (
         SELECT (DATE_TRUNC('month', NOW()) - (n || ' months')::interval + INTERVAL '1 month' - INTERVAL '1 day') AS month_end
         FROM generate_series(5, 0, -1) AS n
       ) months
       ORDER BY months.month_end`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error("TREND ERROR", err);
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
    console.error("ACTIVITY ERROR", err);
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
