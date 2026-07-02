const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const DB_URL = "postgresql://employee_db_jder_user:7NxIJhEvzIF9LOyORlvabniso5zRrWIr@dpg-d86n21f7f7vs73arsnd0-a.virginia-postgres.render.com/employee_db_jder";

const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

function parseValue(val) {
  if (val === "\\N") return null;
  return val
    .replace(/\\t/g, "\t")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\\\/g, "\\");
}

function shouldSkip(stmt) {
  return (
    stmt.includes("OWNER TO") ||
    stmt.startsWith("SET ROLE") ||
    stmt.startsWith("GRANT") ||
    stmt.startsWith("REVOKE") ||
    stmt.startsWith("\\")
  );
}

async function main() {
  const client = await pool.connect();
  console.log("Connected to Render PostgreSQL\n");

  console.log("Wiping existing schema...");
  await client.query("DROP SCHEMA public CASCADE;");
  await client.query("CREATE SCHEMA public;");
  console.log("Schema wiped.\n");

  const sql = fs.readFileSync(path.join(__dirname, "../database-backup.sql"), "utf8");
  const lines = sql.split("\n");

  let ok = 0, skipped = 0, errors = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith("\\") || line.startsWith("--") || line === "") { i++; continue; }

    if (line.startsWith("COPY ") && line.includes("FROM stdin")) {
      const match = line.match(/COPY (?:public\.)?(\w+)\s*\(([^)]+)\)/);
      if (!match) { i++; continue; }
      const tableName = match[1];
      const columns = match[2].split(",").map(c => c.trim());

      i++;
      const rows = [];

      while (i < lines.length && lines[i].trim() !== "\\.") {
        const dataLine = lines[i];
        if (dataLine.trim() !== "") {
          rows.push(dataLine.split("\t").map(parseValue));
        }
        i++;
      }
      i++;

      if (rows.length === 0) { console.log(`   - ${tableName}: 0 rows`); continue; }

      const placeholders = columns.map((_, ci) => `$${ci + 1}`).join(", ");
      const insertSql = `INSERT INTO public.${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;

      let tableOk = 0;
      for (const row of rows) {
        try {
          await client.query(insertSql, row);
          tableOk++;
          ok++;
        } catch (e) {
          console.error(`   SKIP [${tableName}] ${e.message.slice(0, 120)}`);
          errors++;
        }
      }
      console.log(`   ${tableName}: ${tableOk}/${rows.length} rows`);
      continue;
    }

    let stmt = "";
    while (i < lines.length) {
      const l = lines[i];
      stmt += l + "\n";
      i++;
      if (l.trim().endsWith(";")) break;
    }
    stmt = stmt.trim();

    if (!stmt || shouldSkip(stmt)) { skipped++; continue; }

    try {
      await client.query(stmt);
      ok++;
    } catch (e) {
      console.error(`   ERR: ${e.message.slice(0, 150)}`);
      errors++;
    }
  }

  console.log(`\nRestore complete. ok=${ok} skipped=${skipped} errors=${errors}`);
  client.release();
  await pool.end();
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
