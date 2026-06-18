import { Router } from "express";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { allow } from "../middleware/role";

const router = Router();

/* GET /api/notifications — Super Admin ເທົ່ານັ້ນ */
router.get("/", auth, allow("Super Admin"), async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;
    const [data, count] = await Promise.all([
      pool.query(
        `SELECT n.id, n.message, n.entity_type, n.entity_id, n.is_read, n.created_at,
                u.fullname AS from_name, u.email AS from_email
         FROM notifications n
         LEFT JOIN users u ON u.user_id = n.from_user_id
         ORDER BY n.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM notifications`),
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) {
    console.error("NOTIFICATIONS ERROR", err);
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

/* ══════════════════════════════════════════════
   ສຳລັບ Company Admin — ດຶງ notification ທີ່ Super Admin ສົ່ງໃຫ້ຕົນ
══════════════════════════════════════════════ */

/* GET /api/notifications/my/unread-count — lightweight poll for badge */
router.get("/my/unread-count", auth, async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE to_user_id=$1 AND is_read_by_target=false`,
      [req.user.user_id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch {
    res.status(500).json({ count: 0 });
  }
});

/* GET /api/notifications/my */
router.get("/my", auth, async (req: any, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;
    const [data, count] = await Promise.all([
      pool.query(
        `SELECT n.id, n.message, n.entity_type, n.entity_id,
                n.is_read_by_target AS is_read, n.created_at,
                u.fullname AS from_name
         FROM notifications n
         LEFT JOIN users u ON u.user_id = n.from_user_id
         WHERE n.to_user_id = $1
         ORDER BY n.created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user.user_id, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM notifications WHERE to_user_id=$1`, [req.user.user_id]),
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) {
    console.error("MY NOTIF ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* PATCH /api/notifications/my/read-all */
router.patch("/my/read-all", auth, async (req: any, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read_by_target=true
       WHERE to_user_id=$1 AND is_read_by_target=false`,
      [req.user.user_id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

/* PATCH /api/notifications/my/:id/read */
router.patch("/my/:id/read", auth, async (req: any, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read_by_target=true
       WHERE id=$1 AND to_user_id=$2`,
      [req.params.id, req.user.user_id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

export default router;
