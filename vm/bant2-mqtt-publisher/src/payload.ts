import type { LineSignals } from "@factoredge/sim-core";

export interface TelemetryPayload {
  deviceId: string;
  timestamp: string;
  signals: {
    production_count: number;
    motor_temp_c: number;
    motor_current_a: number;
    line_status: 0 | 1 | 2;
    scrap_count: number;
  };
}

export interface StatusPayload {
  deviceId: string;
  status: "online" | "offline";
  timestamp: string;
}

/** README'de belgelenen MQTT mesaj biçimi: her mesajda ISO8601 timestamp + case'in 5 sinyali. */
export function buildTelemetryPayload(deviceId: string, signals: LineSignals, timestamp: Date = new Date()): TelemetryPayload {
  return {
    deviceId,
    timestamp: timestamp.toISOString(),
    signals: {
      production_count: signals.productionCount,
      motor_temp_c: Math.round(signals.motorTempC * 100) / 100,
      motor_current_a: Math.round(signals.motorCurrentA * 100) / 100,
      line_status: signals.status,
      scrap_count: signals.scrapCount,
    },
  };
}

export function buildStatusPayload(deviceId: string, status: StatusPayload["status"], timestamp: Date = new Date()): StatusPayload {
  return { deviceId, status, timestamp: timestamp.toISOString() };
}
