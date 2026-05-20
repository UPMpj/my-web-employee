import { Router } from "express";
import { pool } from "../db";
import { auth } from "../middleware/auth";

const router = Router();

/* GET /api/audit  — paginated audit log with filters */
router.get("/", auth, async (req: any, res) => {
  try {
    const isSuperAdmin = req.user.role === "Super Admin";
    const page      = parseInt(req.query.page       as string) || 1;
    const limit     = parseInt(req.query.limit      as string) || 20;
    const offset    = (page - 1) * limit;
    const search    = (req.query.search      as string || "").trim();
    const action    = (req.query.action      as string || "").trim();
    const entType   = (req.query.entity_type as string || "").trim();
    const companyId = (req.query.company_id  as string || "").trim();
    const dateFrom  = (req.query.date_from   as string || "").trim();
    const dateTo    = (req.query.date_to     as string || "").trim();

    const params: any[] = [];
    const conds: string[] = [];

    if (!isSuperAdmin) {
      params.push(req.user.user_id);
      conds.push(`a.company_id IN (SELECT company_id FROM user_companies WHERE user_id=$${params.length})`);
    } else if (companyId) {
      params.push(companyId);
      conds.push(`a.company_id=$${params.length}`);
    }

    if (action) {
      params.push(action);
      conds.push(`a.action=$${params.length}`);
    }
    if (entType) {
      params.push(entType);
      conds.push(`a.entity_type=$${params.length}`);
    }
    if (dateFrom) {
      params.push(dateFrom);
      conds.push(`a.created_at >= $${params.length}::date`);
    }
    if (dateTo) {
      params.push(dateTo);
      conds.push(`a.created_at < ($${params.length}::date + INTERVAL '1 day')`);
    }
    if (search) {
      params.push(`%${search}%`);
      const n = params.length;
      conds.push(`(u.fullname ILIKE $${n} OR c.companies_name ILIKE $${n} OR a.entity_type ILIKE $${n})`);
    }

    const joinClause = `
      FROM audit_log a
      LEFT JOIN users     u ON u.user_id    = a.user_id
      LEFT JOIN companies c ON c.company_id = a.company_id`;
    const whereClause = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

    const countRes = await pool.query(
      `SELECT COUNT(*) ${joinClause} ${whereClause}`,
      params
    );

    const dataParams = [...params, limit, offset];
    const dataRes = await pool.query(
      `SELECT a.audit_id, a.action, a.entity_type, a.entity_id,
              a.created_at, u.fullname, c.companies_name
       ${joinClause} ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    /* distinct entity types for dropdown */
    const metaRes = await pool.query(
      `SELECT DISTINCT entity_type FROM audit_log WHERE entity_type IS NOT NULL ORDER BY entity_type`
    );

    res.json({
      data:         dataRes.rows,
      total:        parseInt(countRes.rows[0].count),
      page,
      limit,
      entity_types: metaRes.rows.map((r: any) => r.entity_type),
    });
  } catch (err) {
    console.log("AUDIT LOG ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
