import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
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
import settingsRoutes   from "./routes/settings";
import cardRequestRoutes from "./routes/cardRequests";
import twofaRoutes from "./routes/twofa";
import { pool } from "./db";
import { maybeRunDueBackup } from "./utils/backupRun";

/* Boot-time schema migrations: run sequentially on a single borrowed connection instead of
   firing dozens of pool.query() calls at once. Supabase's free-tier pooler caps total
   connections at 15 (db.ts further limits this app to `max: 3`) — letting 40+ migration
   queries fire in parallel at startup saturates that tiny pool and queues real requests
   (e.g. login) behind them for tens of seconds. One connection, run in order, is plenty
   for idempotent DDL and leaves the rest of the pool free for actual traffic immediately. */
async function runStartupMigrations() {
  const client = await pool.connect();
  const ddl = async (sql: string) => { try { await client.query(sql); } catch {} };
  try {
    await ddl(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(64)`);
    await ddl(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP`);
    await ddl(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64)`);
    await ddl(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false`);
    await ddl(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT`);
    await ddl(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo VARCHAR(255)`);
    await ddl(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS province VARCHAR(100)`);
    await ddl(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS district VARCHAR(100)`);
    await ddl(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS village VARCHAR(100)`);
    await ddl(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS dormitory VARCHAR(100)`);
    await ddl(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS room_no VARCHAR(50)`);
    await ddl(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS office_building VARCHAR(50)`);
    await ddl(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_type VARCHAR(50)`);
    await ddl(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS office_floor VARCHAR(50)`);
    await ddl(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS office_room_no VARCHAR(50)`);
    await ddl(`CREATE TABLE IF NOT EXISTS app_settings (key VARCHAR(100) PRIMARY KEY, value TEXT, updated_at TIMESTAMP DEFAULT NOW())`);
    await ddl(`CREATE TABLE IF NOT EXISTS revoked_tokens (jti VARCHAR(64) PRIMARY KEY, expires_at TIMESTAMP NOT NULL)`);

    /* buildings/rooms must exist before employees.room_id can reference rooms(room_id) */
    await ddl(`
      CREATE TABLE IF NOT EXISTS buildings (
        building_id   SERIAL PRIMARY KEY,
        building_name VARCHAR(50) UNIQUE NOT NULL,
        building_type VARCHAR(20) NOT NULL DEFAULT 'Dormitory',
        total_floors  INT NOT NULL,
        description   TEXT
      )
    `);
    await ddl(`
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
    await ddl(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS capacity INT NOT NULL DEFAULT 4`);
    await ddl(`UPDATE rooms SET capacity=4 WHERE capacity != 4`); // ທຸກຫ້ອງຢູ່ໄດ້ 4 ຄົນ

    await ddl(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS room_id INT REFERENCES rooms(room_id) ON DELETE SET NULL`);

    /* ── Settings feature toggles: seed defaults into app_settings (idempotent, never overwrites an existing value) ── */
    const defaults: [string, string][] = [
      ["audit_logging_enabled", "true"],
      ["id_card_expiry_alerts_enabled", "true"],
      ["id_card_expiry_alert_days", "30"],
      ["require_2fa", "false"],
      ["auto_backup_enabled", "false"],
      ["auto_backup_hour_ict", "2"],
      ["admin_email", ""],
    ];
    for (const [key, value] of defaults) {
      try {
        await client.query(
          `INSERT INTO app_settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING`,
          [key, value]
        );
      } catch {}
    }

    /* ── Expiry-alert dedup log: prevents re-notifying for the same permit on the same day ── */
    await ddl(`
      CREATE TABLE IF NOT EXISTS expiry_alert_log (
        id          SERIAL PRIMARY KEY,
        permit_id   INTEGER REFERENCES employee_permits(permit_id) ON DELETE CASCADE,
        alert_date  DATE NOT NULL,
        created_at  TIMESTAMP DEFAULT NOW(),
        UNIQUE(permit_id, alert_date)
      )
    `);

    /* ── Backup history: one row per backup run ── */
    await ddl(`
      CREATE TABLE IF NOT EXISTS backup_history (
        id             SERIAL PRIMARY KEY,
        status         VARCHAR(20) NOT NULL DEFAULT 'running',
        file_public_id TEXT,
        file_size_kb   INTEGER,
        triggered_by   VARCHAR(20) NOT NULL DEFAULT 'manual',
        error_message  TEXT,
        started_at     TIMESTAMP DEFAULT NOW(),
        finished_at    TIMESTAMP
      )
    `);

    /* ── Performance indexes ── */
    await ddl(`CREATE INDEX IF NOT EXISTS idx_employees_company_id   ON employees(company_id)`);
    await ddl(`CREATE INDEX IF NOT EXISTS idx_employees_status       ON employees(status)`);
    await ddl(`CREATE INDEX IF NOT EXISTS idx_employees_code         ON employees(employee_code)`);
    await ddl(`CREATE INDEX IF NOT EXISTS idx_employees_deleted      ON employees(deleted_at) WHERE deleted_at IS NULL`);
    await ddl(`CREATE INDEX IF NOT EXISTS idx_employees_hired_at     ON employees(hired_at)`);
    await ddl(`CREATE INDEX IF NOT EXISTS idx_employee_card_emp      ON employee_card(employee_id)`);
    await ddl(`CREATE INDEX IF NOT EXISTS idx_employee_card_status   ON employee_card(status)`);
    await ddl(`CREATE INDEX IF NOT EXISTS idx_notifications_user     ON notifications(user_id)`);
    await ddl(`CREATE INDEX IF NOT EXISTS idx_notifications_read     ON notifications(is_read)`);
    await ddl(`CREATE INDEX IF NOT EXISTS idx_audit_log_entity       ON audit_log(entity_type)`);
    await ddl(`CREATE INDEX IF NOT EXISTS idx_audit_log_created      ON audit_log(created_at DESC)`);
    await ddl(`CREATE INDEX IF NOT EXISTS idx_rooms_building         ON rooms(building_id)`);
    await ddl(`CREATE INDEX IF NOT EXISTS idx_user_companies_user    ON user_companies(user_id)`);

    /* ── Add to_user_id to notifications ── */
    await ddl(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS to_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL`);
    await ddl(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read_by_target BOOLEAN DEFAULT false`);

    /* ── employee_card table ── */
    await ddl(`
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
    `);

    /* ── audit_log columns ── */
    await ddl(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(company_id) ON DELETE SET NULL`);
    await ddl(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50)`);
    await ddl(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100)`);

    /* ── Approval requests table ── */
    await ddl(`
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
    `);
  } finally {
    client.release();
  }
}
runStartupMigrations()
  .then(() => maybeRunDueBackup("startup"))
  .catch(console.error);

/* Heartbeat — covers the case where the app happens to stay awake across the scheduled hour */
setInterval(() => {
  maybeRunDueBackup("catch_up").catch(console.error);
}, 60 * 60 * 1000); // hourly

/* Clean up expired revoked tokens every 6 hours */
setInterval(() => {
  pool.query(`DELETE FROM revoked_tokens WHERE expires_at < NOW()`).catch(() => {});
}, 6 * 60 * 60 * 1000);


const ALLOWED_ORIGINS = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map(o => o.trim())
  : ["http://localhost:5173", "http://localhost:4173"];

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(cors({
  origin: (origin, cb) => {
    // allow server-to-server / curl with no origin
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(cookieParser());
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
app.use("/api/settings",   settingsRoutes);
app.use("/api/card-requests", cardRequestRoutes);
app.use("/api/2fa", twofaRoutes);

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Employee System API is running" });
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "error", db: "unreachable" });
  }
});

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

process.on("SIGTERM", () => { server.close(() => process.exit(0)); });
process.on("SIGINT",  () => { server.close(() => process.exit(0)); });