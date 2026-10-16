import { z } from "zod";

export const signalTypeSchema = z.enum([
  "production_count",
  "motor_temp",
  "motor_current",
  "line_status",
  "scrap_count",
]);

const modbusRegisterSchema = z.object({
  address: z.number().int(),
  fc: z.union([z.literal(3), z.literal(4)]),
  dataType: z.enum(["uint32", "float32", "int16", "uint16"]),
  wordOrder: z.enum(["ABCD", "CDAB"]).optional(),
  scale: z.number(),
  unit: z.string(),
});

const modbusConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  unitId: z.number().int().min(0).max(255),
  registers: z.record(signalTypeSchema, modbusRegisterSchema),
  pollIntervalMs: z.number().int().positive().optional(),
});

const mqttConfigSchema = z.object({
  brokerUrl: z.string().min(1),
  telemetryTopic: z.string().min(1),
  statusTopic: z.string().min(1),
  watchdogTimeoutMs: z.number().int().positive().optional(),
});

export const deviceSchema = z.discriminatedUnion("protocol", [
  z.object({ name: z.string().min(1), protocol: z.literal("modbus"), config: modbusConfigSchema }),
  z.object({ name: z.string().min(1), protocol: z.literal("mqtt"), config: mqttConfigSchema }),
]);

export type DeviceInput = z.infer<typeof deviceSchema>;
