import { Router } from "express";
import { pool } from "../db";
import { auth } from "../middleware/auth";

const router = Router();

pool.query(`
  CREATE TABLE IF NOT EXISTS employee_timeline (
    tl_id        SERIAL PRIMARY KEY,
    employee_id  INT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    event_type   VARCHAR(50) NOT NULL,
    old_value    TEXT,
    new_value    TEXT,
    note         TEXT,
    changed_by   INT REFERENCES users(user_id),
    changed_at   TIMESTAMP DEFAULT NOW()
  )
`).catch(() => {});

/* GET /api/timeline/:empId */
router.get("/:empId", auth, async (req, res) => {
  try {
    const { empId } = req.params;
    const result = await pool.query(
      `SELECT t.*, u.fullname AS changed_by_name
       FROM employee_timeline t
       LEFT JOIN users u ON u.user_id = t.changed_by
       WHERE t.employee_id = $1
       ORDER BY t.changed_at DESC`,
      [empId]
    );
    res.json(result.rows);
  } catch (err) {
    console.log("TIMELINE GET ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* POST /api/timeline/:empId — manual event entry */
router.post("/:empId", auth, async (req: any, res) => {
  try {
    const { empId } = req.params;
    const { event_type, old_value, new_value, note } = req.body;
    const result = await pool.query(
      `INSERT INTO employee_timeline (employee_id, event_type, old_value, new_value, note, changed_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [empId, event_type, old_value || null, new_value || null, note || null, req.user.user_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.log("TIMELINE POST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
