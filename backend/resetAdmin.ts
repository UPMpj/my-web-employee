import bcrypt from "bcrypt";
import { pool } from "./src/db";

async function run() {
  const newPassword = "Admin@1234";
  const hash = await bcrypt.hash(newPassword, 10);

  /* ດຶງ user ທັງໝົດ */
  const all = await pool.query(`SELECT user_id, fullname, email FROM users ORDER BY user_id`);
  console.log("\n=== Users in DB ===");
  all.rows.forEach(u => console.log(`  [${u.user_id}] ${u.fullname} — ${u.email}`));

  /* reset Super Admin (user_id=1 ຫຼື role Super Admin) */
  const res = await pool.query(
    `UPDATE users SET password_hash=$1
     WHERE role_id = (SELECT role_id FROM role WHERE role_name='Super Admin')
     RETURNING email, fullname`,
    [hash]
  );

  if (res.rows.length > 0) {
    console.log(`\n✅ Reset password ສຳເລັດສຳລັບ:`);
    res.rows.forEach(u => console.log(`  ${u.fullname} (${u.email})`));
    console.log(`\n🔑 Password ໃໝ່: ${newPassword}`);
  } else {
    console.log("\n❌ ບໍ່ພົບ Super Admin");
  }

  process.exit();
}

run().catch(e => { console.error(e); process.exit(1); });
