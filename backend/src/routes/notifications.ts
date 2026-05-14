import { Router } from "express";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { allow } from "../middleware/role";

const router = Router();

/* GET /api/notifications — Super Admin ເທົ່ານັ້ນ */
router.get("/", auth, allow("Super Admin"), async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.id, n.message, n.entity_type, n.entity_id, n.is_read, n.created_at,
              u.fullname AS from_name, u.email AS from_email
       FROM notifications n
       LEFT JOIN users u ON u.user_id = n.from_user_id
       ORDER BY n.created_at DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    console.log("NOTIFICATIONS ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* GET /api/notifications/unread-count */
router.get("/unread-count", auth, allow("Super Admin"), async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE is_read = false`
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

/* PATCH /api/notifications/read-all — ຕ້ອງຢູ່ກ່ອນ /:id/read */
router.patch("/read-all", auth, allow("Super Admin"), async (_req, res) => {
  try {
    await pool.query(`UPDATE notifications SET is_read=true WHERE is_read=false`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

/* PATCH /api/notifications/:id/read */
router.patch("/:id/read", auth, allow("Super Admin"), async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET is_read=true WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

export default router;
