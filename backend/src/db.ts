import { Pool, types } from "pg";
import dotenv from "dotenv";
dotenv.config();

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
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3, idleTimeoutMillis: 10_000 }
    : {
        user:     process.env.DB_USER     || "postgres",
        host:     process.env.DB_HOST     || "localhost",
        database: process.env.DB_NAME     || "company_system",
        password: process.env.DB_PASSWORD,
        port:     Number(process.env.DB_PORT) || 5432,
      }
);