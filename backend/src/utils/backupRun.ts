import { pool } from "../db";
import JSZip from "jszip";
import format from "pg-format";
import path from "path";
import fs from "fs/promises";
import { uploadBackupToCloudinary } from "../cloudinary";
import { logAudit } from "./auditLog";
import { sendBackupEmail } from "../mailer";

/* Operational/bookkeeping tables — not business data, excluded to avoid circular/noisy backups */
const EXCLUDED_TABLES = new Set(["revoked_tokens", "backup_history", "expiry_alert_log"]);

const ROWS_PER_INSERT = 500;

/* Shared with restoreRun.ts — the exact set of tables a backup/restore round-trips */
export async function getDataTableNames(): Promise<string[]> {
  const tablesRes = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_type='BASE TABLE'`
  );
  return tablesRes.rows.map((row: any) => row.table_name).filter((t: string) => !EXCLUDED_TABLES.has(t));
}

function prepareValue(val: any): any {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "object") return JSON.stringify(val); // jsonb/json columns
  return val;
}

type FkEdge = { childTable: string; childColumn: string; parentTable: string };
type Plan = { order: string[]; deferredColumns: Map<string, Set<string>> };

/* Order tables so that anything referenced by a foreign key is inserted before the table
   that references it (otherwise restoring alphabetically breaks FK constraints — e.g.
   approval_requests.requested_by -> users would fail since "approval_requests" < "users").
   The schema also has a genuine *circular* FK (companies.owner_id -> employees, and
   employees.company_id -> companies) — no insertion order satisfies both at once, so the
   cycle-closing column is detected and deferred to a follow-up UPDATE pass after every
   table has been loaded. */
async function planTableOrder(): Promise<Plan> {
  const allTables = await getDataTableNames();
  const tableSet = new Set(allTables);

  const fkRes = await pool.query(`
    SELECT tc.table_name AS "childTable", kcu.column_name AS "childColumn", ccu.table_name AS "parentTable"
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  `);
  const edges: FkEdge[] = fkRes.rows.filter((e: FkEdge) =>
    e.childTable !== e.parentTable && tableSet.has(e.childTable) && tableSet.has(e.parentTable)
  );

  const dependsOn = new Map<string, FkEdge[]>();
  for (const t of allTables) dependsOn.set(t, []);
  for (const edge of edges) dependsOn.get(edge.childTable)!.push(edge);

  const order: string[] = [];
  const deferredColumns = new Map<string, Set<string>>();
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function defer(edge: FkEdge) {
    if (!deferredColumns.has(edge.childTable)) deferredColumns.set(edge.childTable, new Set());
    deferredColumns.get(edge.childTable)!.add(edge.childColumn);
  }

  function visit(t: string) {
    if (visited.has(t)) return;
    visiting.add(t);
    for (const edge of dependsOn.get(t) || []) {
      if (visiting.has(edge.parentTable) && !visited.has(edge.parentTable)) {
        defer(edge); // back-edge — this column closes a cycle, load it in a second pass instead
        continue;
      }
      visit(edge.parentTable);
    }
    visiting.delete(t);
    visited.add(t);
    order.push(t);
  }
  for (const t of allTables) visit(t);
  return { order, deferredColumns };
}

async function tableToSql(table: string, deferredCols: Set<string>): Promise<{ sql: string; pkColumn: string | null; deferredRows: any[] }> {
  const result = await pool.query(`SELECT * FROM ${format.ident(table)}`);
  const lines = [`-- Table: ${table} (${result.rows.length} rows)`];

  const pkRes = await pool.query(
    `SELECT kcu.column_name FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     WHERE tc.table_schema='public' AND tc.table_name=$1 AND tc.constraint_type='PRIMARY KEY'
     LIMIT 1`,
    [table]
  );
  const pkColumn = pkRes.rows[0]?.column_name || null;

  if (result.rows.length === 0) return { sql: lines.join("\n") + "\n", pkColumn, deferredRows: [] };

  const columns = result.fields.map(f => f.name);
  const insertColumns = deferredCols.size > 0 ? columns.filter(c => !deferredCols.has(c)) : columns;
  const columnList = insertColumns.map(c => format.ident(c)).join(",");

  /* rows whose deferred column(s) need a follow-up UPDATE once every table is loaded */
  const deferredRows = deferredCols.size > 0
    ? result.rows.filter(row => [...deferredCols].some(c => row[c] !== null && row[c] !== undefined))
    : [];

  for (let i = 0; i < result.rows.length; i += ROWS_PER_INSERT) {
    const chunk = result.rows.slice(i, i + ROWS_PER_INSERT);
    const tuples = chunk.map(row => {
      const values = insertColumns.map(c => prepareValue(row[c]));
      return format("(%L)", values);
    });
    lines.push(`INSERT INTO ${format.ident(table)} (${columnList}) VALUES\n${tuples.join(",\n")};`);
  }
  return { sql: lines.join("\n") + "\n", pkColumn, deferredRows };
}

function deferredFixupSql(table: string, pkColumn: string, deferredCols: Set<string>, rows: any[]): string {
  const lines = [`-- Deferred FK fixup: ${table} (${rows.length} rows, columns: ${[...deferredCols].join(",")})`];
  for (const row of rows) {
    const sets = [...deferredCols]
      .filter(c => row[c] !== null && row[c] !== undefined)
      .map(c => format("%I = %L", c, prepareValue(row[c])))
      .join(", ");
    if (!sets) continue;
    lines.push(`UPDATE ${format.ident(table)} SET ${sets} WHERE ${format.ident(pkColumn)} = ${format.literal(row[pkColumn])};`);
  }
  return lines.join("\n") + "\n";
}

/* Employee photos live on Cloudinary (DB only stores the URL) — pull the actual image
   bytes into the backup too, so losing the Cloudinary account doesn't mean losing photos.
   Downloaded a few at a time rather than all at once to keep memory/network use bounded. */
const PHOTO_DOWNLOAD_CONCURRENCY = 5;

async function addEmployeePhotosToZip(zip: JSZip): Promise<{ added: number; failed: number }> {
  const result = await pool.query(
    `SELECT employee_id, photo FROM employees WHERE photo IS NOT NULL AND photo != ''`
  );
  const photosFolder = zip.folder("photos")!;
  let added = 0, failed = 0;

  for (let i = 0; i < result.rows.length; i += PHOTO_DOWNLOAD_CONCURRENCY) {
    const batch = result.rows.slice(i, i + PHOTO_DOWNLOAD_CONCURRENCY);
    await Promise.all(batch.map(async (row: { employee_id: number; photo: string }) => {
      try {
        const ext = path.extname(new URL(row.photo, "http://x").pathname) || ".jpg";
        let buffer: Buffer;
        if (row.photo.startsWith("http")) {
          const res = await fetch(row.photo);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          buffer = Buffer.from(await res.arrayBuffer());
        } else {
          buffer = await fs.readFile(path.join(__dirname, "../../", row.photo));
        }
        photosFolder.file(`${row.employee_id}${ext}`, buffer);
        added++;
      } catch (err) {
        failed++;
        console.error(`BACKUP PHOTO ERROR (employee_id=${row.employee_id})`, err);
      }
    }));
  }
  return { added, failed };
}

/* Email is on different credentials than Cloudinary, so it survives a compromised
   Cloudinary account. Gmail/SMTP attachment limits sit around 25MB after base64 overhead —
   stay well clear of that and just skip the email (Cloudinary copy still exists) if a backup
   ever grows past it, rather than trying to split/chunk it. */
const EMAIL_BACKUP_MAX_BYTES = 15 * 1024 * 1024;

async function sendSecondaryCopy(buffer: Buffer, triggeredBy: string) {
  try {
    const row = await pool.query(`SELECT value FROM app_settings WHERE key='admin_email'`);
    const adminEmail = row.rows[0]?.value;
    if (!adminEmail) return;
    if (buffer.length > EMAIL_BACKUP_MAX_BYTES) {
      console.warn(`Backup (${Math.round(buffer.length / 1024)}KB) exceeds email size limit — secondary copy skipped`);
      return;
    }
    await sendBackupEmail({ toEmail: adminEmail, buffer, sizeKb: Math.round(buffer.length / 1024), triggeredBy });
  } catch (err) {
    console.error("BACKUP EMAIL ERROR", err);
  }
}

export async function runBackupNow(triggeredBy: "manual" | "catch_up" | "startup"): Promise<{ ok: boolean; fileUrl?: string; error?: string }> {
  const histRes = await pool.query(
    `INSERT INTO backup_history (status, triggered_by) VALUES ('running',$1) RETURNING id`,
    [triggeredBy]
  );
  const historyId = histRes.rows[0].id;

  try {
    const { order, deferredColumns } = await planTableOrder();
    const sqlParts = [`-- CCMS data backup — generated ${new Date().toISOString()} — triggered_by: ${triggeredBy}\n`];
    const fixups: string[] = [];

    for (const table of order) {
      const deferredCols = deferredColumns.get(table) || new Set<string>();
      const { sql, pkColumn, deferredRows } = await tableToSql(table, deferredCols);
      sqlParts.push(sql);
      if (deferredCols.size > 0 && pkColumn && deferredRows.length > 0) {
        fixups.push(deferredFixupSql(table, pkColumn, deferredCols, deferredRows));
      }
    }
    if (fixups.length > 0) sqlParts.push(...fixups);
    const sqlContent = sqlParts.join("\n");

    const zip = new JSZip();
    zip.file("backup.sql", sqlContent);
    const { added: photosAdded, failed: photosFailed } = await addEmployeePhotosToZip(zip);
    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    const publicId = await uploadBackupToCloudinary(buffer);
    await sendSecondaryCopy(buffer, triggeredBy);

    await pool.query(
      `UPDATE backup_history SET status='success', file_public_id=$1, file_size_kb=$2, finished_at=NOW() WHERE id=$3`,
      [publicId, Math.round(buffer.length / 1024), historyId]
    );
    await logAudit({
      action: "BACKUP_RUN", entityType: "backup_history", entityId: historyId,
      afterData: { photosAdded, photosFailed },
    });
    return { ok: true, fileUrl: publicId };
  } catch (err: any) {
    const message = String(err?.message || err);
    await pool.query(
      `UPDATE backup_history SET status='failed', error_message=$1, finished_at=NOW() WHERE id=$2`,
      [message, historyId]
    ).catch(() => {});
    console.error("BACKUP RUN ERROR", err);
    return { ok: false, error: message };
  }
}

/* ── "Catch-up" check: has today's (ICT) auto backup already run? If not, and it's due, run it now.
   This is what makes "02:00 daily" work despite Render free tier's sleep behavior — whoever's
   request wakes the dyno (or the heartbeat below, if the app stays awake) triggers the overdue run. ── */
export async function maybeRunDueBackup(triggeredBy: "startup" | "catch_up") {
  try {
    const enabledRow = await pool.query(`SELECT value FROM app_settings WHERE key='auto_backup_enabled'`);
    if (enabledRow.rows[0]?.value !== "true") return;

    const hourRow = await pool.query(`SELECT value FROM app_settings WHERE key='auto_backup_hour_ict'`);
    const hour = parseInt(hourRow.rows[0]?.value || "2", 10);

    const nowIct = await pool.query(`SELECT NOW() AT TIME ZONE 'Asia/Vientiane' AS now_ict`);
    const ictNow: Date = nowIct.rows[0].now_ict;
    if (ictNow.getHours() < hour) return; // not due yet today

    const todayRow = await pool.query(
      `SELECT 1 FROM backup_history
       WHERE status='success' AND (started_at AT TIME ZONE 'Asia/Vientiane')::date = ($1::timestamp)::date`,
      [ictNow]
    );
    if (todayRow.rows.length > 0) return; // already ran today

    await runBackupNow(triggeredBy);
  } catch (err) {
    console.error("BACKUP CATCH-UP CHECK ERROR", err);
  }
}
