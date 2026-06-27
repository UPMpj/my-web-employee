import { Pool, types } from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

/* Supabase issues DB/pooler certs from its own private root CA, which isn't in the
   public/OS trust store — pin that root (extracted once via the TLS handshake, valid
   until 2031) instead of disabling verification, so the connection still resists MITM.
   Read from the project root (not __dirname) so it resolves the same from ts-node-dev
   (running out of src/) and from the compiled build (running out of dist/). */
const SUPABASE_CA = fs.readFileSync(path.join(__dirname, "..", "supabase-ca.pem"), "utf8");

/* DB timezone = UTC, so TIMESTAMP WITHOUT TIME ZONE values are UTC.
   Append 'Z' so JS Date.parse treats them as UTC regardless of server locale. */
types.setTypeParser(1114, (val: string) => val ? new Date(val + "Z") : null);  // timestamp
types.setTypeParser(1082, (val: string) => val);  // date — keep as string, don't convert

/* Supabase's free-tier Session pooler caps total connections at 15, and Supabase's own
   internal services (PostgREST, realtime, etc.) permanently hold most of that — leaving
   very little headroom. A low `max` here keeps this backend from starving itself (or a
   second environment, e.g. local dev running against the same DB as production). */
export const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { ca: SUPABASE_CA, rejectUnauthorized: true }, max: 3, idleTimeoutMillis: 10_000 }
    : {
        user:     process.env.DB_USER     || "postgres",
        host:     process.env.DB_HOST     || "localhost",
        database: process.env.DB_NAME     || "company_system",
        password: process.env.DB_PASSWORD,
        port:     Number(process.env.DB_PORT) || 5432,
      }
);