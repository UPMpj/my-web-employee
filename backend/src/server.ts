import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import dashboardRoutes from "./routes/dashboard";
import authRoutes from "./routes/auth";
import companyRoutes from "./routes/company";
import employeeRoutes from "./routes/employees";
import auditRoutes from "./routes/audit";
import notificationRoutes from "./routes/notifications";
import userRoutes from "./routes/users";
import idcardRoutes from "./routes/idcard";
import buildingRoutes from "./routes/building";
import { pool } from "./db";

pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo VARCHAR(255)`).catch(() => {});
pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS province VARCHAR(100)`).catch(() => {});
pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS district VARCHAR(100)`).catch(() => {});
pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS village VARCHAR(100)`).catch(() => {});
pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS dormitory VARCHAR(100)`).catch(() => {});
pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS room_no VARCHAR(50)`).catch(() => {});
pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS office_building VARCHAR(50)`).catch(() => {});
pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_type VARCHAR(50)`).catch(() => {});
pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS room_id INT REFERENCES rooms(room_id) ON DELETE SET NULL`).catch(() => {});


const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",") : "*",
  credentials: true,
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/company",companyRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/idcard", idcardRoutes);
app.use("/api/building", buildingRoutes);

/* ── Building tables + seed ── */
async function initBuildings() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS buildings (
      building_id   SERIAL PRIMARY KEY,
      building_name VARCHAR(50) UNIQUE NOT NULL,
      building_type VARCHAR(20) NOT NULL DEFAULT 'Dormitory',
      total_floors  INT NOT NULL,
      description   TEXT
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      room_id       SERIAL PRIMARY KEY,
      building_id   INT REFERENCES buildings(building_id) ON DELETE CASCADE,
      floor_number  INT NOT NULL,
      room_number   VARCHAR(10) NOT NULL,
      capacity      INT NOT NULL DEFAULT 2,
      status        VARCHAR(20) NOT NULL DEFAULT 'Available',
      note          TEXT,
      updated_at    TIMESTAMP DEFAULT NOW(),
      UNIQUE(building_id, floor_number, room_number)
    )
  `);
  /* add capacity column if upgrading from old schema */
  await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS capacity INT NOT NULL DEFAULT 4`).catch(()=>{});
  /* ທຸກຫ້ອງຢູ່ໄດ້ 4 ຄົນ */
  await pool.query(`UPDATE rooms SET capacity=4 WHERE capacity != 4`).catch(()=>{});

  const BUILDINGS = [
    { name: "ຕືກທີ 1", type: "Office",    floors: 9 },
    { name: "ຕືກທີ 2", type: "Dormitory", floors: 9 },
    { name: "ຕືກທີ 3", type: "Dormitory", floors: 9 },
    { name: "ຕືກທີ 4", type: "Dormitory", floors: 6 },
    { name: "ຕືກທີ 5", type: "Dormitory", floors: 6 },
    { name: "ຕືກທີ 6", type: "Dormitory", floors: 6 },
  ];

  for (const b of BUILDINGS) {
    const ins = await pool.query(
      `INSERT INTO buildings (building_name, building_type, total_floors)
       VALUES ($1,$2,$3) ON CONFLICT (building_name) DO NOTHING RETURNING building_id`,
      [b.name, b.type, b.floors]
    );
    if (ins.rows.length === 0 || b.type !== "Dormitory") continue;
    const bid = ins.rows[0].building_id;
    for (let fl = 2; fl <= b.floors; fl++) {
      for (let rm = 1; rm <= 21; rm++) {
        const roomNo   = `${fl}${String(rm).padStart(2, "0")}`;
        const capacity = 4;
        await pool.query(
          `INSERT INTO rooms (building_id, floor_number, room_number, capacity)
           VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [bid, fl, roomNo, capacity]
        );
      }
    }
  }
}
initBuildings().catch(console.error);

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

process.on("SIGTERM", () => { server.close(() => process.exit(0)); });
process.on("SIGINT",  () => { server.close(() => process.exit(0)); });