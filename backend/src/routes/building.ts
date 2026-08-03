import { Router } from "express";
import multer from "multer";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { allow } from "../middleware/role";
import { isPositiveInt, isEnum, trimOrNull } from "../utils/validate";
import { logAudit } from "../utils/auditLog";
import { uploadToCloudinary, deleteFromCloudinary } from "../cloudinary";
import { validateUpload } from "../utils/validateFile";

const ROOM_STATUSES = ["Available", "Occupied", "Partial", "Maintenance"];
const BUILDING_TYPES = ["Office", "Dormitory"];

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("ອັບໂຫຼດໄດ້ສະເພາະໄຟລ໌ຮູບ (image) ເທົ່ານັ້ນ") as any, false);
  },
});

/* ── helper: bulk-insert rooms for a floor range (floor 1 is always a common area, no rooms) ── */
async function bulkCreateRooms(buildingId: number, fromFloor: number, toFloor: number, roomsPerFloor: number) {
  const values: string[] = [];
  const params: any[] = [];
  let i = 1;
  for (let floor = Math.max(2, fromFloor); floor <= toFloor; floor++) {
    for (let seq = 1; seq <= roomsPerFloor; seq++) {
      const roomNumber = `${floor}${String(seq).padStart(2, "0")}`;
      values.push(`($${i++}, $${i++}, $${i++})`);
      params.push(buildingId, floor, roomNumber);
    }
  }
  if (values.length === 0) return;
  await pool.query(
    `INSERT INTO rooms (building_id, floor_number, room_number) VALUES ${values.join(",")}`,
    params
  );
}

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
  const status = count === 0 ? "Available" : count >= cap ? "Occupied" : "Partial";
  await pool.query(`UPDATE rooms SET status=$1, updated_at=NOW() WHERE room_id=$2`, [status, roomId]);
}

/* GET /api/building — all buildings with room stats (all authenticated users) */
router.get("/", auth, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, z.zone_name,
        COUNT(r.room_id)::int                                          AS total_rooms,
        COALESCE(SUM(r.capacity)::int, 0)                             AS total_capacity,
        COUNT(r.room_id) FILTER (WHERE r.status='Available')::int     AS available_rooms,
        COUNT(r.room_id) FILTER (WHERE r.status='Occupied')::int      AS occupied_rooms,
        COUNT(r.room_id) FILTER (WHERE r.status='Partial')::int       AS partial_rooms,
        COUNT(r.room_id) FILTER (WHERE r.status='Maintenance')::int   AS maintenance_rooms,
        (SELECT COUNT(*) FROM employees e
         WHERE e.deleted_at IS NULL AND e.status != 'Resigned'
           AND (
             e.room_id IN (SELECT room_id FROM rooms WHERE building_id = b.building_id)
             OR e.office_building_id = b.building_id
           ))::int AS total_occupants
      FROM buildings b
      LEFT JOIN zones z ON z.zone_id = b.zone_id
      LEFT JOIN rooms r ON r.building_id = b.building_id
      GROUP BY b.building_id, z.zone_name
      ORDER BY b.building_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("BUILDING LIST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* GET /api/building/unassigned-employees — Super Admin only
   (returns employees across ALL companies — not safe for Company Admin) */
router.get("/unassigned-employees", auth, allow("Super Admin"), async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.employee_id, e.firstname, e.lastname, e.employee_code, e.position, e.photo,
             c.companies_name
      FROM employees e
      LEFT JOIN companies c ON c.company_id = e.company_id
      WHERE e.room_id IS NULL AND e.deleted_at IS NULL AND e.status = 'Active'
      ORDER BY e.firstname, e.lastname
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

/* POST /api/building/assign-room — Super Admin only */
router.post("/assign-room", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { room_id, employee_id } = req.body;

    if (!isPositiveInt(room_id)) return res.status(400).json({ message: "room_id ບໍ່ຖືກຕ້ອງ" });
    if (!isPositiveInt(employee_id)) return res.status(400).json({ message: "employee_id ບໍ່ຖືກຕ້ອງ" });

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

    logAudit({
      userId: req.user.user_id,
      action: "ASSIGN_ROOM",
      entityType: "ROOM",
      entityId: room_id,
      afterData: { employee_id, old_room_id: oldRoomId || null },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("ASSIGN ROOM ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE /api/building/unassign-room/:empId — Super Admin only */
router.delete("/unassign-room/:empId", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { empId } = req.params;
    const emp = await pool.query(`SELECT room_id FROM employees WHERE employee_id=$1`, [empId]);
    const roomId = emp.rows[0]?.room_id;

    await pool.query(`UPDATE employees SET room_id=NULL, updated_at=NOW() WHERE employee_id=$1`, [empId]);

    if (roomId) await syncRoomStatus(roomId);
    logAudit({
      userId: req.user.user_id,
      action: "UNASSIGN_ROOM",
      entityType: "ROOM",
      entityId: roomId || null,
      beforeData: { employee_id: empId },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

/* GET /api/building/room-lookup/:roomId — all authenticated users (used in employee forms) */
router.get("/room-lookup/:roomId", auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const result = await pool.query(
      `SELECT r.room_id, r.floor_number, r.building_id, b.building_name
       FROM rooms r JOIN buildings b ON b.building_id = r.building_id
       WHERE r.room_id=$1`,
      [roomId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "ຫ້ອງບໍ່ພົບ" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

/* GET /api/building/:id — building + per-floor summary (all authenticated users) */
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const bldRes = await pool.query(
      `SELECT b.*, z.zone_name FROM buildings b LEFT JOIN zones z ON z.zone_id = b.zone_id WHERE b.building_id=$1`,
      [id]
    );
    if (bldRes.rows.length === 0) return res.status(404).json({ message: "Not found" });

    /* Office buildings have no discrete rooms — headcount is tracked per floor
       via employees.office_building_id/office_floor instead of the rooms table. */
    const floorsRes = bldRes.rows[0].building_type === "Office"
      ? await pool.query(`
          SELECT office_floor::int AS floor_number,
            COUNT(*)::int AS total_occupants
          FROM employees
          WHERE office_building_id=$1 AND deleted_at IS NULL AND status != 'Resigned'
            AND office_floor ~ '^[0-9]+$'
          GROUP BY office_floor::int
          ORDER BY office_floor::int
        `, [id])
      : await pool.query(`
          SELECT r.floor_number,
            COUNT(DISTINCT r.room_id)::int                                         AS total_rooms,
            COUNT(DISTINCT r.room_id) FILTER (WHERE r.status='Available')::int    AS available,
            COUNT(DISTINCT r.room_id) FILTER (WHERE r.status='Occupied')::int     AS occupied,
            COUNT(DISTINCT r.room_id) FILTER (WHERE r.status='Partial')::int      AS partial,
            COUNT(DISTINCT r.room_id) FILTER (WHERE r.status='Maintenance')::int  AS maintenance,
            (SELECT COALESCE(SUM(r2.capacity),0)::int FROM rooms r2
             WHERE r2.building_id=$1 AND r2.floor_number=r.floor_number)          AS total_capacity,
            COUNT(e.employee_id)::int                                              AS total_occupants
          FROM rooms r
          LEFT JOIN employees e ON e.room_id = r.room_id
            AND e.deleted_at IS NULL AND e.status != 'Resigned'
          WHERE r.building_id=$1
          GROUP BY r.floor_number
          ORDER BY r.floor_number
        `, [id]);

    res.json({ ...bldRes.rows[0], floors: floorsRes.rows });
  } catch (err) {
    console.error("BUILDING GET ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* GET /api/building/:id/floor/:floor — rooms with occupant names (Super Admin only)
   Returns employee PII across all companies — not safe for Company Admin. */
router.get("/:id/floor/:floor", auth, allow("Super Admin"), async (req, res) => {
  try {
    const { id, floor } = req.params;
    const result = await pool.query(`
      SELECT r.*,
        COUNT(e.employee_id)::int AS occupant_count,
        COALESCE(
          json_agg(
            json_build_object(
              'employee_id',   e.employee_id,
              'firstname',     e.firstname,
              'lastname',      e.lastname,
              'employee_code', e.employee_code,
              'position',      e.position,
              'photo',         e.photo
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

    /* compute effective status from live occupant_count (Maintenance is manual override) */
    const rows = result.rows.map((r: any) => {
      const effective = r.status === "Maintenance" ? "Maintenance"
        : r.occupant_count === 0 ? "Available"
        : r.occupant_count >= r.capacity ? "Occupied" : "Partial";
      return { ...r, status: effective };
    });

    /* background: fix any stale rows in rooms table */
    const stale = result.rows.filter((r: any) => {
      if (r.status === "Maintenance") return false;
      const expected = r.occupant_count === 0 ? "Available"
        : r.occupant_count >= r.capacity ? "Occupied" : "Partial";
      return r.status !== expected;
    });
    if (stale.length > 0) {
      Promise.all(stale.map((r: any) => syncRoomStatus(r.room_id))).catch(() => {});
    }

    res.json(rows);
  } catch (err) {
    console.error("FLOOR ROOMS ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* POST /api/building/:id/floor/:floor/room — add a single room to a floor (Super Admin) */
router.post("/:id/floor/:floor/room", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id, floor } = req.params;
    if (!isPositiveInt(id)) return res.status(400).json({ message: "building_id ບໍ່ຖືກຕ້ອງ" });
    if (!isPositiveInt(floor)) return res.status(400).json({ message: "floor ບໍ່ຖືກຕ້ອງ" });

    const bldRes = await pool.query(`SELECT * FROM buildings WHERE building_id=$1`, [id]);
    if (bldRes.rows.length === 0) return res.status(404).json({ message: "Building not found" });
    const building = bldRes.rows[0];
    const floorNum = parseInt(floor);
    if (floorNum < 2 || floorNum > building.total_floors)
      return res.status(400).json({ message: "floor ຢູ່ນອກຂອບເຂດຂອງຕຶກນີ້" });

    const { capacity } = req.body;
    const cap = isPositiveInt(capacity) ? parseInt(capacity) : 2;

    const existing = await pool.query(
      `SELECT room_number FROM rooms WHERE building_id=$1 AND floor_number=$2`,
      [id, floorNum]
    );
    const usedSeqs = existing.rows
      .map((r: any) => parseInt(String(r.room_number).slice(String(floorNum).length)))
      .filter((n: number) => !isNaN(n));
    const nextSeq = usedSeqs.length > 0 ? Math.max(...usedSeqs) + 1 : 1;
    const roomNumber = `${floorNum}${String(nextSeq).padStart(2, "0")}`;

    const result = await pool.query(
      `INSERT INTO rooms (building_id, floor_number, room_number, capacity) VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, floorNum, roomNumber, cap]
    );

    logAudit({
      userId: req.user.user_id,
      action: "CREATE",
      entityType: "ROOM",
      entityId: result.rows[0].room_id,
      afterData: result.rows[0],
    });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("ADD ROOM ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* POST /api/building — create building (Super Admin) */
router.post("/", auth, allow("Super Admin"), upload.single("cover_image"), async (req: any, res) => {
  try {
    const { building_type, total_floors, description, address, zone_id, rooms_per_floor } = req.body;

    const name = trimOrNull(req.body.building_name);
    if (!name) return res.status(400).json({ message: "building_name ຕ້ອງໃສ່" });
    if (name.length > 50) return res.status(400).json({ message: "building_name ຍາວເກີນ 50 ຕົວ" });

    const effectiveType = building_type || "Dormitory";
    if (!isEnum(effectiveType, BUILDING_TYPES))
      return res.status(400).json({ message: "building_type ຕ້ອງເປັນ Office ຫຼື Dormitory" });

    if (!isPositiveInt(total_floors))
      return res.status(400).json({ message: "total_floors ບໍ່ຖືກຕ້ອງ" });
    const floors = parseInt(total_floors);

    let zoneId: number | null = null;
    if (zone_id !== undefined && zone_id !== null && zone_id !== "") {
      if (!isPositiveInt(zone_id)) return res.status(400).json({ message: "zone_id ບໍ່ຖືກຕ້ອງ" });
      zoneId = parseInt(zone_id);
    }

    let roomsPerFloor = parseInt(rooms_per_floor) || 4;
    roomsPerFloor = Math.min(20, Math.max(1, roomsPerFloor));

    if (req.file) {
      const fileErr = validateUpload(req.file.buffer, "image");
      if (fileErr) return res.status(400).json({ message: fileErr });
    }
    const coverImage = req.file ? await uploadToCloudinary(req.file.buffer, "buildings") : null;

    const result = await pool.query(
      `INSERT INTO buildings (building_name, building_type, total_floors, description, address, zone_id, cover_image)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, effectiveType, floors, trimOrNull(description), trimOrNull(address), zoneId, coverImage]
    );
    const building = result.rows[0];

    if (effectiveType === "Dormitory") {
      await bulkCreateRooms(building.building_id, 2, floors, roomsPerFloor);
    }

    logAudit({
      userId: req.user.user_id,
      action: "CREATE",
      entityType: "BUILDING",
      entityId: building.building_id,
      afterData: building,
    });
    res.json(building);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(400).json({ message: "ຊື່ຕຶກນີ້ມີແລ້ວ" });
    console.error("ADD BUILDING ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* PUT /api/building/:id — update building (Super Admin) */
router.put("/:id", auth, allow("Super Admin"), upload.single("cover_image"), async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!isPositiveInt(id)) return res.status(400).json({ message: "building_id ບໍ່ຖືກຕ້ອງ" });

    const existing = await pool.query(`SELECT * FROM buildings WHERE building_id=$1`, [id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: "Building not found" });
    const oldBuilding = existing.rows[0];

    const { building_type, total_floors, description, address, zone_id, rooms_per_floor } = req.body;

    const name = trimOrNull(req.body.building_name);
    if (!name) return res.status(400).json({ message: "building_name ຕ້ອງໃສ່" });
    if (name.length > 50) return res.status(400).json({ message: "building_name ຍາວເກີນ 50 ຕົວ" });

    const effectiveType = building_type || oldBuilding.building_type;
    if (!isEnum(effectiveType, BUILDING_TYPES))
      return res.status(400).json({ message: "building_type ຕ້ອງເປັນ Office ຫຼື Dormitory" });

    if (!isPositiveInt(total_floors))
      return res.status(400).json({ message: "total_floors ບໍ່ຖືກຕ້ອງ" });
    const floors = parseInt(total_floors);
    if (floors < oldBuilding.total_floors)
      return res.status(400).json({ message: "ບໍ່ສາມາດຫຼຸດຈຳນວນຊັ້ນໄດ້" });

    let zoneId: number | null = null;
    if (zone_id !== undefined && zone_id !== null && zone_id !== "") {
      if (!isPositiveInt(zone_id)) return res.status(400).json({ message: "zone_id ບໍ່ຖືກຕ້ອງ" });
      zoneId = parseInt(zone_id);
    }

    if (req.file) {
      const fileErr = validateUpload(req.file.buffer, "image");
      if (fileErr) return res.status(400).json({ message: fileErr });
    }
    const oldCoverImage = oldBuilding.cover_image || null;
    const coverImage = req.file ? await uploadToCloudinary(req.file.buffer, "buildings") : oldCoverImage;

    let roomsPerFloor = parseInt(rooms_per_floor) || 4;
    roomsPerFloor = Math.min(20, Math.max(1, roomsPerFloor));

    const result = await pool.query(
      `UPDATE buildings SET building_name=$1, building_type=$2, total_floors=$3, description=$4,
         address=$5, zone_id=$6, cover_image=$7
       WHERE building_id=$8 RETURNING *`,
      [name, effectiveType, floors, trimOrNull(description), trimOrNull(address), zoneId, coverImage, id]
    );
    const building = result.rows[0];

    if (effectiveType === "Dormitory" && floors > oldBuilding.total_floors) {
      await bulkCreateRooms(building.building_id, oldBuilding.total_floors + 1, floors, roomsPerFloor);
    }

    if (req.file && oldCoverImage) {
      deleteFromCloudinary(oldCoverImage).catch(() => {});
    }

    logAudit({
      userId: req.user.user_id,
      action: "UPDATE",
      entityType: "BUILDING",
      entityId: id,
      beforeData: oldBuilding,
      afterData: building,
    });
    res.json(building);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(400).json({ message: "ຊື່ຕຶກນີ້ມີແລ້ວ" });
    console.error("UPDATE BUILDING ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE /api/building/:id — delete building (Super Admin).
   Cascades: rooms.building_id ON DELETE CASCADE removes all rooms,
   employees.room_id ON DELETE SET NULL evicts residents. Frontend must
   confirm with the user before calling this (shows room/occupant counts). */
router.delete("/:id", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query(`SELECT * FROM buildings WHERE building_id=$1`, [id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: "Building not found" });

    await pool.query(`DELETE FROM buildings WHERE building_id=$1`, [id]);

    if (existing.rows[0].cover_image) {
      deleteFromCloudinary(existing.rows[0].cover_image).catch(() => {});
    }

    logAudit({
      userId: req.user.user_id,
      action: "DELETE",
      entityType: "BUILDING",
      entityId: id,
      beforeData: existing.rows[0],
    });
    res.json({ message: "deleted" });
  } catch (err) {
    console.error("DELETE BUILDING ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* PATCH /api/building/room/:id — manual status / note update (Super Admin only) */
router.patch("/room/:id", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!isPositiveInt(id)) return res.status(400).json({ message: "room_id ບໍ່ຖືກຕ້ອງ" });

    const { status, note } = req.body;
    if (!isEnum(status, ROOM_STATUSES))
      return res.status(400).json({ message: "status ຕ້ອງເປັນ Available, Occupied, Partial ຫຼື Maintenance" });
    if (note && String(note).length > 500)
      return res.status(400).json({ message: "note ຍາວເກີນ 500 ຕົວ" });

    const result = await pool.query(
      `UPDATE rooms SET status=$1, note=$2, updated_at=NOW() WHERE room_id=$3 RETURNING *`,
      [status, note || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Room not found" });
    logAudit({
      userId: req.user.user_id,
      action: "UPDATE_ROOM_STATUS",
      entityType: "ROOM",
      entityId: id,
      afterData: result.rows[0],
    });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE ROOM ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
