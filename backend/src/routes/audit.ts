import { Router } from "express";
import { pool } from "../db";
import { auth } from "../middleware/auth";

const router = Router();

/* GET /api/audit  — paginated audit log */
router.get("/", auth, async (req: any, res) => {
  try {
    const isSuperAdmin = req.user.role === "Super Admin";
    const page   = parseInt(req.query.page  as string) || 1;
    const limit  = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const params: any[] = [];
    let where = "";

    if (!isSuperAdmin) {
      params.push(req.user.user_id);
      where = `WHERE a.company_id IN (SELECT company_id FROM user_companies WHERE user_id=$${params.length})`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM audit_log a ${where}`,
      params
    );

    const dataParams = [...params, limit, offset];
    const dataRes = await pool.query(
      `SELECT a.audit_id, a.action, a.entity_type, a.entity_id,
              a.created_at, u.fullname, c.companies_name
       FROM audit_log a
       LEFT JOIN users     u ON u.user_id    = a.user_id
       LEFT JOIN companies c ON c.company_id = a.company_id
       ${where}
       ORDER BY a.created_at DESC
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
    console.log("AUDIT LOG ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
