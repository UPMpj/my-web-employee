import bcrypt from "bcrypt";
import { pool } from "./src/db";

async function run() {
  const hash = await bcrypt.hash("123456", 10);

  await pool.query(`
    UPDATE users
    SET password_hash = $1
    WHERE email = 'admin@gmail.com'
  `, [hash]);

  console.log("done:", hash);
  process.exit();
}

run();
