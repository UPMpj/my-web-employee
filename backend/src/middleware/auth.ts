import jwt from "jsonwebtoken";

export function JWT_SECRET(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return secret;
}

/* Lazy import to avoid circular dependency */
function getRevokedTokens(): Set<string> {
  return require("../routes/auth").revokedTokens as Set<string>;
}

export const auth = (req: any, res: any, next: any) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return res.sendStatus(401);

  const token = header.split(" ")[1];

  try {
    /* check blocklist first */
    if (getRevokedTokens().has(token)) return res.sendStatus(401);

    req.user = jwt.verify(token, JWT_SECRET());
    next();
  } catch {
    return res.sendStatus(401);
  }
};
