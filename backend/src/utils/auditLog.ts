import { pool } from "../db";

let cachedEnabled: boolean | null = null;
let cachedAt = 0;
const CACHE_MS = 30_000; // avoid a settings lookup on every single audited request

export async function isAuditLoggingEnabled(): Promise<boolean> {
  if (cachedEnabled !== null && Date.now() - cachedAt < CACHE_MS) return cachedEnabled;
  const r = await pool.query(`SELECT value FROM app_settings WHERE key='audit_logging_enabled'`);
  cachedEnabled = r.rows[0]?.value !== "false"; // default true if missing
  cachedAt = Date.now();
  return cachedEnabled;
}

export function invalidateAuditCache() { cachedEnabled = null; }

export async function logAudit(opts: {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  companyId?: number | null;
  beforeData?: object | null;
  afterData?: object | null;
}) {
  try {
    if (!(await isAuditLoggingEnabled())) return;
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, company_id, before_data, after_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        opts.userId ?? null,
        opts.action,
        opts.entityType,
        opts.entityId != null ? String(opts.entityId) : null,
        opts.companyId ?? null,
        opts.beforeData ? JSON.stringify(opts.beforeData) : null,
        opts.afterData ? JSON.stringify(opts.afterData) : null,
      ]
    );
  } catch (err) {
    console.error("AUDIT LOG ERROR", err);
  }
}
