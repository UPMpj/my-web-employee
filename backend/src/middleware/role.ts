export const allow =
  (...roles: string[]) =>
  (req: any, res: any, next: any) => {
    if (!roles.includes(req.user.role)) {
      return res.sendStatus(403);
    }
    next();
  };