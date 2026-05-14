import { Router } from "express";
import { pool } from "../db";
import { auth } from "../middleware/auth";

const router = Router();

/* ── helper: recalculate room status from occupancy ── */
async function syncRoomStatus(roomId: number | string) {
  const r = await pool.query(
    `SELECT capacity FROM rooms WHERE room_id=$1`, [roomId]
  );
  if (r.rows.length === 0) return;
  const cap = r.rows[0].capacity;
  const occ = await pool.query(
    `SELECT COUNT(*) FROM employees WHERE room_id=$1 AND deleted_at IS NULL AND status != 'Resigned'`,
    [roomId]
  );
  const count = parseInt(occ.rows[0].count);
  const status = count === 0 ? "Available" : count >= cap ? "Occupied" : "Occupied";
  await pool.query(`UPDATE rooms SET status=$1, updated_at=NOW() WHERE room_id=$2`, [status, roomId]);
}

/* GET /api/building — all buildings with room stats */
router.get("/", auth, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*,
        COUNT(r.room_id)::int                                          AS total_rooms,
        COUNT(r.room_id) FILTER (WHERE r.status='Available')::int     AS available_rooms,
        COUNT(r.room_id) FILTER (WHERE r.status='Occupied')::int      AS occupied_rooms,
        COUNT(r.room_id) FILTER (WHERE r.status='Maintenance')::int   AS maintenance_rooms,
        (SELECT COUNT(*) FROM employees e
         JOIN rooms r2 ON r2.room_id = e.room_id
         WHERE r2.building_id = b.building_id
           AND e.deleted_at IS NULL AND e.status != 'Resigned')::int  AS total_occupants
      FROM buildings b
      LEFT JOIN rooms r ON r.building_id = b.building_id
      GROUP BY b.building_id
      ORDER BY b.building_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.log("BUILDING LIST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* GET /api/building/unassigned-employees — employees with no room */
router.get("/unassigned-employees", auth, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT employee_id, firstname, lastname, employee_code, position
      FROM employees
      WHERE room_id IS NULL AND deleted_at IS NULL AND status = 'Active'
      ORDER BY firstname, lastname
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

/* POST /api/building/assign-room — assign employee to room */
router.post("/assign-room", auth, async (req, res) => {
  try {
    const { room_id, employee_id } = req.body;

    const room = await pool.query(`SELECT * FROM rooms WHERE room_id=$1`, [room_id]);
    if (room.rows.length === 0) return res.status(404).json({ message: "ຫ້ອງບໍ່ພົບ" });

    const cnt = await pool.query(
      `SELECT COUNT(*) FROM employees WHERE room_id=$1 AND deleted_at IS NULL AND status != 'Resigned'`,
      [room_id]
    );
    if (parseInt(cnt.rows[0].count) >= room.rows[0].capacity) {
      return res.status(400).json({ message: "ຫ້ອງເຕັມ (ຮອງຮັບສູງສຸດ " + room.rows[0].capacity + " ຄົນ)" });
    }

    /* release old room if any */
    const old = await pool.query(`SELECT room_id FROM employees WHERE employee_id=$1`, [employee_id]);
    const oldRoomId = old.rows[0]?.room_id;

    await pool.query(
      `UPDATE employees SET room_id=$1, updated_at=NOW() WHERE employee_id=$2`,
      [room_id, employee_id]
    );

    await syncRoomStatus(room_id);
    if (oldRoomId && oldRoomId !== room_id) await syncRoomStatus(oldRoomId);

    res.json({ ok: true });
  } catch (err) {
    console.log("ASSIGN ROOM ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE /api/building/unassign-room/:empId — remove employee from room */
router.delete("/unassign-room/:empId", auth, async (req, res) => {
  try {
    const { empId } = req.params;
    const emp = await pool.query(`SELECT room_id FROM employees WHERE employee_id=$1`, [empId]);
    const roomId = emp.rows[0]?.room_id;

    await pool.query(`UPDATE employees SET room_id=NULL, updated_at=NOW() WHERE employee_id=$1`, [empId]);

    if (roomId) await syncRoomStatus(roomId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

/* GET /api/building/:id — building + per-floor summary */
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const bldRes = await pool.query(`SELECT * FROM buildings WHERE building_id=$1`, [id]);
    if (bldRes.rows.length === 0) return res.status(404).json({ message: "Not found" });

    const floorsRes = await pool.query(`
      SELECT r.floor_number,
        COUNT(r.room_id)::int                                         AS total_rooms,
        COUNT(r.room_id) FILTER (WHERE r.status='Available')::int    AS available,
        COUNT(r.room_id) FILTER (WHERE r.status='Occupied')::int     AS occupied,
        COUNT(r.room_id) FILTER (WHERE r.status='Maintenance')::int  AS maintenance,
        COALESCE(SUM(r.capacity)::int, 0)                            AS total_capacity,
        COUNT(e.employee_id)::int                                    AS total_occupants
      FROM rooms r
      LEFT JOIN employees e ON e.room_id = r.room_id
        AND e.deleted_at IS NULL AND e.status != 'Resigned'
      WHERE r.building_id=$1
      GROUP BY r.floor_number
      ORDER BY r.floor_number
    `, [id]);

    res.json({ ...bldRes.rows[0], floors: floorsRes.rows });
  } catch (err) {
    console.log("BUILDING GET ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* GET /api/building/:id/floor/:floor — rooms with occupants */
router.get("/:id/floor/:floor", auth, async (req, res) => {
  try {
    const { id, floor } = req.params;
    const result = await pool.query(`
      SELECT r.*,
        COUNT(e.employee_id)::int AS occupant_count,
        COALESCE(
          json_agg(
            json_build_object(
              'employee_id', e.employee_id,
              'firstname',   e.firstname,
              'lastname',    e.lastname,
              'employee_code', e.employee_code,
              'position',    e.position
            ) ORDER BY e.firstname
          ) FILTER (WHERE e.employee_id IS NOT NULL),
          '[]'::json
        ) AS occupants
      FROM rooms r
      LEFT JOIN employees e ON e.room_id = r.room_id
        AND e.deleted_at IS NULL AND e.status != 'Resigned'
      WHERE r.building_id=$1 AND r.floor_number=$2
      GROUP BY r.room_id
      ORDER BY r.room_number
    `, [id, floor]);
    res.json(result.rows);
  } catch (err) {
    console.log("FLOOR ROOMS ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* PATCH /api/building/room/:id — manual status / note update */
router.patch("/room/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const result = await pool.query(
      `UPDATE rooms SET status=$1, note=$2, updated_at=NOW() WHERE room_id=$3 RETURNING *`,
      [status, note || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Room not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.log("UPDATE ROOM ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
