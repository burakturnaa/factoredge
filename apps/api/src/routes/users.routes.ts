import { Router } from "express";
import { hashPassword } from "../auth/password.js";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { createUserSchema } from "../validation/user.schema.js";

export const usersRouter = Router();
// Kullanıcı yönetimi tamamen yönetici yetkisi gerektirir — hem UI'da gizlenir hem burada reddedilir.
usersRouter.use(requireAuth, requireRole("admin"));

usersRouter.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(users);
});

usersRouter.post("/", async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Geçersiz kullanıcı", details: parsed.error.flatten() });
    return;
  }
  const { username, password, role } = parsed.data;
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { username, passwordHash, role } });
  res.status(201).json({ id: user.id, username: user.username, role: user.role });
});

usersRouter.delete("/:id", async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
