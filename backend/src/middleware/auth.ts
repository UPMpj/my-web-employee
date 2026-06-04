import jwt from "jsonwebtoken";
import { pool } from "../db";

export function JWT_SECRET(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return secret;
}

export const auth = async (req: any, res: any, next: any) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return res.sendStatus(401);

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET()) as any;

    /* Check DB revocation list (persists across restarts, auto-expires) */
    if (payload.jti) {
      const revoked = await pool.query(
        `SELECT 1 FROM revoked_tokens WHERE jti=$1 AND expires_at > NOW()`,
        [payload.jti]
      );
      if (revoked.rows.length > 0) return res.sendStatus(401);
    }

    req.user = payload;
    next();
  } catch {
    return res.sendStatus(401);
  }
};
