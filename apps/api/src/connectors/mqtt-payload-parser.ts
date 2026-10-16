import type { NormalizedReading, SignalType } from "./types.js";

/** vm/bant2-mqtt-publisher/src/payload.ts ile aynı sözleşme — README'deki MQTT mesaj biçimi. */
interface TelemetryMessage {
  deviceId: string;
  timestamp: string;
  signals: {
    production_count: number;
    motor_temp_c: number;
    motor_current_a: number;
    line_status: number;
    scrap_count: number;
  };
}

interface StatusMessage {
  deviceId: string;
  status: "online" | "offline";
  timestamp: string;
}

const FIELD_MAP: Array<{ field: keyof TelemetryMessage["signals"]; signalType: SignalType; unit: string }> = [
  { field: "production_count", signalType: "production_count", unit: "adet" },
  { field: "motor_temp_c", signalType: "motor_temp", unit: "°C" },
  { field: "motor_current_a", signalType: "motor_current", unit: "A" },
  { field: "line_status", signalType: "line_status", unit: "" },
  { field: "scrap_count", signalType: "scrap_count", unit: "adet" },
];

function isTelemetryMessage(value: unknown): value is TelemetryMessage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.timestamp !== "string" || typeof v.signals !== "object" || v.signals === null) return false;
  const s = v.signals as Record<string, unknown>;
  return FIELD_MAP.every(({ field }) => typeof s[field] === "number");
}

/** Bozuk/eksik bir mesaj gelirse null döner — connector bunu loglayıp atlar, crash olmaz. */
export function parseTelemetryMessage(raw: Buffer | string, deviceId: string): NormalizedReading[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString());
  } catch {
    return null;
  }
  if (!isTelemetryMessage(parsed)) return null;

  const timestamp = new Date(parsed.timestamp);
  return FIELD_MAP.map(({ field, signalType, unit }) => ({
    deviceId,
    signalType,
    value: parsed.signals[field],
    unit,
    timestamp,
  }));
}

export function parseStatusMessage(raw: Buffer | string): StatusMessage["status"] | null {
  try {
    const parsed = JSON.parse(raw.toString());
    if (parsed && (parsed.status === "online" || parsed.status === "offline")) {
      return parsed.status;
    }
    return null;
  } catch {
    return null;
  }
}
