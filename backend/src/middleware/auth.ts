import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "cms_super_secret_jwt_2024_do_not_share";

export const auth = (req: any, res: any, next: any) => {
  const header = req.headers.authorization;
  if (!header) return res.sendStatus(401);

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.sendStatus(401);
  }
};