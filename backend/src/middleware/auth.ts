import jwt from "jsonwebtoken";
import { pool } from "../db";
import { maybeRunExpiryAlertCheck } from "../utils/expiryAlerts";

export function JWT_SECRET(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return secret;
}

export const auth = async (req: any, res: any, next: any) => {
  // Accept token from httpOnly cookie first, fall back to Authorization header
  const cookieToken = req.cookies?.token as string | undefined;
  const header      = req.headers.authorization;
  const bearerToken = header?.startsWith("Bearer ") ? header.split(" ")[1] : undefined;
  const token       = cookieToken ?? bearerToken;

  if (!token) return res.sendStatus(401);

  try {
    const payload = jwt.verify(token, JWT_SECRET()) as any;

    /* Single-purpose tokens (2FA login challenge / forced-setup) are signed with the same
       secret but must never be usable as a real session — reject them here centrally. */
    if (payload.purpose) return res.sendStatus(401);

    /* Check DB revocation list (persists across restarts, auto-expires) */
    if (payload.jti) {
      const revoked = await pool.query(
        `SELECT 1 FROM revoked_tokens WHERE jti=$1 AND expires_at > NOW()`,
        [payload.jti]
      );
      if (revoked.rows.length > 0) return res.sendStatus(401);
    }

    req.user = payload;
    maybeRunExpiryAlertCheck(); // fire-and-forget, cooldown-gated — catches up after the app wakes from sleep
    next();
  } catch {
    return res.sendStatus(401);
  }
};
