import { Router } from "express";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { allow } from "../middleware/role";
import { isPositiveInt, isHexColor, trimOrNull } from "../utils/validate";
import { logAudit } from "../utils/auditLog";

const router = Router();

/* =========================================================
   GET /api/zones  — list zones with building counts
   ========================================================= */
router.get("/", auth, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT z.*, COUNT(b.building_id)::int AS building_count
       FROM zones z
       LEFT JOIN buildings b ON b.zone_id = z.zone_id
       GROUP BY z.zone_id
       ORDER BY z.zone_id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("ZONES LIST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* =========================================================
   POST /api/zones  — create zone (Super Admin)
   ========================================================= */
router.post("/", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { zone_name, description, color } = req.body;

    const name = trimOrNull(zone_name);
    if (!name) return res.status(400).json({ message: "zone_name ຕ້ອງໃສ່" });
    if (name.length > 100) return res.status(400).json({ message: "zone_name ຍາວເກີນ 100 ຕົວ" });

    const effectiveColor = color || "#2563eb";
    if (!isHexColor(effectiveColor))
      return res.status(400).json({ message: "color ຕ້ອງເປັນ hex color (#rrggbb)" });

    const result = await pool.query(
      `INSERT INTO zones (zone_name, description, color) VALUES ($1, $2, $3) RETURNING *`,
      [name, trimOrNull(description), effectiveColor]
    );
    logAudit({
      userId: req.user.user_id,
      action: "CREATE",
      entityType: "ZONE",
      entityId: result.rows[0].zone_id,
      afterData: result.rows[0],
    });
    res.json({ ...result.rows[0], building_count: 0 });
  } catch (err: any) {
    if (err?.code === "23505") return res.status(400).json({ message: "ຊື່ເຂດນີ້ມີແລ້ວ" });
    console.error("ADD ZONE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* =========================================================
   PUT /api/zones/:id  — update zone (Super Admin)
   ========================================================= */
router.put("/:id", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!isPositiveInt(id)) return res.status(400).json({ message: "zone_id ບໍ່ຖືກຕ້ອງ" });

    const { zone_name, description, color } = req.body;

    const name = trimOrNull(zone_name);
    if (!name) return res.status(400).json({ message: "zone_name ຕ້ອງໃສ່" });
    if (name.length > 100) return res.status(400).json({ message: "zone_name ຍາວເກີນ 100 ຕົວ" });

    const effectiveColor = color || "#2563eb";
    if (!isHexColor(effectiveColor))
      return res.status(400).json({ message: "color ຕ້ອງເປັນ hex color (#rrggbb)" });

    const result = await pool.query(
      `UPDATE zones SET zone_name=$1, description=$2, color=$3 WHERE zone_id=$4 RETURNING *`,
      [name, trimOrNull(description), effectiveColor, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Zone not found" });

    logAudit({
      userId: req.user.user_id,
      action: "UPDATE",
      entityType: "ZONE",
      entityId: id,
      afterData: result.rows[0],
    });
    res.json(result.rows[0]);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(400).json({ message: "ຊື່ເຂດນີ້ມີແລ້ວ" });
    console.error("UPDATE ZONE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* =========================================================
   DELETE /api/zones/:id  — delete zone (Super Admin)
   ========================================================= */
router.delete("/:id", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query(`SELECT * FROM zones WHERE zone_id=$1`, [id]);
    await pool.query(`DELETE FROM zones WHERE zone_id=$1`, [id]);
    logAudit({
      userId: req.user.user_id,
      action: "DELETE",
      entityType: "ZONE",
      entityId: id,
      beforeData: existing.rows[0],
    });
    res.json({ message: "deleted" });
  } catch (err) {
    console.error("DELETE ZONE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
