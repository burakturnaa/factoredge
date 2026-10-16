import { Router } from "express";
import { connectorManager } from "../connectors/manager-instance.js";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { deviceSchema } from "../validation/device.schema.js";

export const devicesRouter = Router();
devicesRouter.use(requireAuth);

// Yönetici ve izleyici: cihaz listesi + bağlantı durumu + son veri zamanı görülebilir.
devicesRouter.get("/", async (_req, res) => {
  const devices = await prisma.device.findMany({ orderBy: { createdAt: "asc" } });
  res.json(devices);
});

// Sadece yönetici: cihaz ekleme/düzenleme/silme. Hem UI'da gizlenir hem burada reddedilir.
devicesRouter.post("/", requireRole("admin"), async (req, res) => {
  const parsed = deviceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Geçersiz cihaz tanımı", details: parsed.error.flatten() });
    return;
  }
  const device = await prisma.device.create({ data: parsed.data });
  await connectorManager.addDevice(device);
  res.status(201).json(device);
});

devicesRouter.put("/:id", requireRole("admin"), async (req, res) => {
  const parsed = deviceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Geçersiz cihaz tanımı", details: parsed.error.flatten() });
    return;
  }
  const device = await prisma.device.update({ where: { id: req.params.id }, data: parsed.data });
  await connectorManager.restartDevice(device);
  res.json(device);
});

devicesRouter.delete("/:id", requireRole("admin"), async (req, res) => {
  await connectorManager.removeDevice(req.params.id);
  await prisma.device.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
