import JSZip from "jszip";
import format from "pg-format";
import path from "path";
import { PoolClient } from "pg";
import { pool } from "../db";
import { getBackupDownloadUrl, uploadToCloudinary } from "../cloudinary";
import { logAudit } from "./auditLog";
import { runBackupNow, getDataTableNames } from "./backupRun";

/* The restored rows carry their original explicit PK values, so each table's auto-increment
   sequence is left pointing at whatever RESTART IDENTITY reset it to (1), not past the
   restored data — the next ordinary insert would collide with an existing restored row's id. */
async function resyncSequences(client: PoolClient, tables: string[]) {
  for (const table of tables) {
    const pkRes = await client.query(
      `SELECT kcu.column_name FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       WHERE tc.table_schema='public' AND tc.table_name=$1 AND tc.constraint_type='PRIMARY KEY'
       LIMIT 1`,
      [table]
    );
    const pkColumn = pkRes.rows[0]?.column_name;
    if (!pkColumn) continue;

    const seqRes = await client.query(`SELECT pg_get_serial_sequence($1, $2) AS seq`, [table, pkColumn]);
    const seqName = seqRes.rows[0]?.seq;
    if (!seqName) continue; // PK isn't backed by a sequence — nothing to resync

    await client.query(
      `SELECT setval($1, COALESCE((SELECT MAX(${format.ident(pkColumn)}) FROM ${format.ident(table)}), 1))`,
      [seqName]
    );
  }
}

export async function restoreFromBackup(
  backupId: number,
  publicId: string
): Promise<{ ok: boolean; error?: string; photosRestored?: number; photosFailed?: number; safetyBackupId?: string }> {
  /* Snapshot current state first — if the restore itself goes wrong, this is the way back. */
  const safety = await runBackupNow("manual");
  if (!safety.ok) {
    return { ok: false, error: `Aborted — safety backup before restore failed: ${safety.error}` };
  }

  let zip: JSZip;
  try {
    const url = getBackupDownloadUrl(publicId);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not download backup file (HTTP ${res.status})`);
    zip = await JSZip.loadAsync(Buffer.from(await res.arrayBuffer()));
  } catch (err: any) {
    return { ok: false, error: String(err?.message || err), safetyBackupId: safety.fileUrl };
  }

  const sqlFile = zip.file("backup.sql");
  if (!sqlFile) return { ok: false, error: "backup.sql not found inside the zip", safetyBackupId: safety.fileUrl };
  const sqlContent = await sqlFile.async("string");

  const tables = await getDataTableNames();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`TRUNCATE TABLE ${tables.map(t => format.ident(t)).join(", ")} RESTART IDENTITY CASCADE`);
    await client.query(sqlContent);
    await resyncSequences(client, tables);
    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    const message = String(err?.message || err);
    await logAudit({ action: "RESTORE_FAILED", entityType: "backup_history", entityId: backupId, afterData: { error: message } });
    return { ok: false, error: message, safetyBackupId: safety.fileUrl };
  } finally {
    client.release();
  }

  /* Photos were embedded as raw image bytes under photos/ — re-upload each to Cloudinary
     and relink, since the original Cloudinary URLs may no longer point anywhere valid. */
  let photosRestored = 0, photosFailed = 0;
  const photoNames = Object.keys(zip.files).filter(name => name.startsWith("photos/") && !zip.files[name].dir);
  for (const name of photoNames) {
    const employeeId = parseInt(path.basename(name, path.extname(name)), 10);
    if (!employeeId) continue;
    try {
      const buffer = await zip.files[name].async("nodebuffer");
      const url = await uploadToCloudinary(buffer);
      await pool.query(`UPDATE employees SET photo=$1 WHERE employee_id=$2`, [url, employeeId]);
      photosRestored++;
    } catch (err) {
      photosFailed++;
      console.error(`RESTORE PHOTO ERROR (employee_id=${employeeId})`, err);
    }
  }

  await logAudit({
    action: "RESTORE_RUN", entityType: "backup_history", entityId: backupId,
    afterData: { photosRestored, photosFailed, safetyBackupId: safety.fileUrl },
  });
  return { ok: true, photosRestored, photosFailed, safetyBackupId: safety.fileUrl };
}
