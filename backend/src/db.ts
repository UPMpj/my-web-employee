import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

export const pool = new Pool({
  user:     process.env.DB_USER     || "postgres",
  host:     process.env.DB_HOST     || "localhost",
  database: process.env.DB_NAME     || "company_system",
  password: process.env.DB_PASSWORD || "66668888",
  port:     Number(process.env.DB_PORT) || 5432,
});