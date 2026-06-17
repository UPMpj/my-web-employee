import { Pool, types } from "pg";
import dotenv from "dotenv";
dotenv.config();

/* DB timezone = UTC, so TIMESTAMP WITHOUT TIME ZONE values are UTC.
   Append 'Z' so JS Date.parse treats them as UTC regardless of server locale. */
types.setTypeParser(1114, (val: string) => val ? new Date(val + "Z") : null);  // timestamp
types.setTypeParser(1082, (val: string) => val);  // date — keep as string, don't convert

export const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        user:     process.env.DB_USER     || "postgres",
        host:     process.env.DB_HOST     || "localhost",
        database: process.env.DB_NAME     || "company_system",
        password: process.env.DB_PASSWORD || "66668888",
        port:     Number(process.env.DB_PORT) || 5432,
      }
);