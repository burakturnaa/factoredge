import type { NextFunction, Request, Response } from "express";
import { verifyToken, type AuthTokenPayload } from "../auth/jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

/** Token yoksa/geçersizse 401 — rol yetersizliği (403) ile burada KASITLI olarak ayrılır. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  try {
    req.user = verifyToken(header.slice("Bearer ".length));
    next();
  } catch {
    res.status(401).json({ error: "Geçersiz veya süresi dolmuş token" });
  }
}
