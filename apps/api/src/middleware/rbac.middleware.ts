import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../auth/jwt.js";

/** requireAuth'tan SONRA kullanılmalı. Yetkisiz rol -> 403 (401 ile karıştırılmaz). */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Kimlik doğrulama gerekli" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
      return;
    }
    next();
  };
}
