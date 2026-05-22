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
import buildingRoutes  from "./routes/building";
import documentRoutes  from "./routes/documents";
import permitRoutes    from "./routes/permits";
import importRoutes    from "./routes/import";
import timelineRoutes  from "./routes/timeline";
import approvalRoutes   from "./routes/approvals";
import { pool } from "./db";

pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(64)`).catch(() => {});
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP`).catch(() => {});
pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo VARCHAR(255)`).catch(() => {});
pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS province VARCHAR(100)`).catch(() => {});
pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS district VARCHAR(100)`).catch(() => {});
pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS village VARCHAR(100)`).catch(() => {});
pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS dormitory VARCHAR(100)`).catch(() => {});
pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS room_no VARCHAR(50)`).catch(() => {});
pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS office_building VARCHAR(50)`).catch(() => {});
pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_type VARCHAR(50)`).catch(() => {});
pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS room_id INT REFERENCES rooms(room_id) ON DELETE SET NULL`).catch(() => {});


const ALLOWED_ORIGINS = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map(o => o.trim())
  : ["http://localhost:5173", "http://localhost:4173"];

const app = express();
app.use(cors({
  origin: (origin, cb) => {
    // allow server-to-server / curl with no origin
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/company",companyRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/idcard", idcardRoutes);
app.use("/api/building",   buildingRoutes);
app.use("/api/documents",  documentRoutes);
app.use("/api/permits",    permitRoutes);
app.use("/api/import",     importRoutes);
app.use("/api/timeline",   timelineRoutes);
app.use("/api/approvals",  approvalRoutes);

/* ── Add to_user_id to notifications ── */
pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS to_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL`).catch(() => {});
pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read_by_target BOOLEAN DEFAULT false`).catch(() => {});

/* ── employee_card table ── */
pool.query(`
  CREATE TABLE IF NOT EXISTS employee_card (
    card_id       SERIAL PRIMARY KEY,
    employee_id   INTEGER REFERENCES employees(employee_id) ON DELETE CASCADE,
    company_id    INTEGER REFERENCES companies(company_id)  ON DELETE SET NULL,
    card_no       VARCHAR(50),
    status        VARCHAR(20) DEFAULT 'Active',
    issued_at     TIMESTAMP,
    issued_by     INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    printed_at    TIMESTAMP,
    card_color    VARCHAR(20) DEFAULT '#1e3a8a',
    created_at    TIMESTAMP DEFAULT NOW()
  )
`).catch(() => {});

/* ── audit_log columns ── */
pool.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(company_id) ON DELETE SET NULL`).catch(() => {});
pool.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50)`).catch(() => {});
pool.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100)`).catch(() => {});

/* ── Approval requests table ── */
pool.query(`
  CREATE TABLE IF NOT EXISTS approval_requests (
    id                SERIAL PRIMARY KEY,
    request_type      VARCHAR(20)  NOT NULL,
    entity_type       VARCHAR(50)  NOT NULL,
    entity_id         VARCHAR(100),
    entity_name       VARCHAR(255),
    requested_by      INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    requested_by_name VARCHAR(255),
    old_data          JSONB DEFAULT '{}',
    new_data          JSONB DEFAULT '{}',
    status            VARCHAR(20)  NOT NULL DEFAULT 'pending',
    reviewed_by       INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    reviewed_at       TIMESTAMP,
    reject_reason     TEXT,
    created_at        TIMESTAMP DEFAULT NOW()
  )
`).catch(() => {});

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

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Employee System API is running" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

process.on("SIGTERM", () => { server.close(() => process.exit(0)); });
process.on("SIGINT",  () => { server.close(() => process.exit(0)); });