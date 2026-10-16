import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { signalTypeSchema } from "../validation/device.schema.js";

export const readingsRouter = Router();
readingsRouter.use(requireAuth);

const ONE_HOUR_MS = 60 * 60 * 1000;

const querySchema = z.object({
  deviceId: z.string().min(1),
  signalType: signalTypeSchema,
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// "Geçmiş: seçilen bir sinyalin son 1 saatlik grafiği" — from/to verilmezse varsayılan son 1 saat.
readingsRouter.get("/", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Geçersiz sorgu", details: parsed.error.flatten() });
    return;
  }

  const { deviceId, signalType, from, to } = parsed.data;
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - ONE_HOUR_MS);

  const readings = await prisma.signalReading.findMany({
    where: { deviceId, signalType, timestamp: { gte: fromDate, lte: toDate } },
    orderBy: { timestamp: "asc" },
  });
  res.json(readings);
});
