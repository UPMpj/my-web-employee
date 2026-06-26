import bcrypt from "bcrypt";
import crypto from "crypto";
import { pool } from "../db";

export async function generateBackupCodes(count = 8): Promise<{ plain: string[]; hashed: string[] }> {
  const plain = Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 hex chars
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  const hashed = await Promise.all(plain.map(code => bcrypt.hash(code, 10)));
  return { plain, hashed };
}

/* One-time use — removes the matched code from storage so it can't be reused */
export async function consumeBackupCode(userId: number, hashedCodesJson: string | null, inputCode: string): Promise<boolean> {
  if (!hashedCodesJson) return false;
  let hashedCodes: string[];
  try { hashedCodes = JSON.parse(hashedCodesJson); } catch { return false; }

  const normalized = inputCode.trim().toUpperCase();
  for (let i = 0; i < hashedCodes.length; i++) {
    if (await bcrypt.compare(normalized, hashedCodes[i])) {
      hashedCodes.splice(i, 1);
      await pool.query(`UPDATE users SET totp_backup_codes=$1 WHERE user_id=$2`, [JSON.stringify(hashedCodes), userId]);
      return true;
    }
  }
  return false;
}
