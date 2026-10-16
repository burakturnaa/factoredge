import { Router } from "express";
import { signToken } from "../auth/jwt.js";
import { verifyPassword } from "../auth/password.js";
import { prisma } from "../db/prisma.js";
import { loginSchema } from "../validation/auth.schema.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Geçersiz istek", details: parsed.error.flatten() });
    return;
  }

  const { username, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Kullanıcı adı veya parola hatalı" });
    return;
  }

  const token = signToken({ sub: user.id, username: user.username, role: user.role });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});
