import { describe, expect, it } from "vitest";
import { LineStatus } from "@factoredge/sim-core";
import { buildStatusPayload, buildTelemetryPayload } from "./payload.js";

describe("buildTelemetryPayload", () => {
  it("case'in istediği 5 sinyali snake_case alan adlarıyla ve ISO8601 timestamp ile üretir", () => {
    const timestamp = new Date("2026-10-16T12:34:56.789Z");
    const payload = buildTelemetryPayload(
      "band2",
      { productionCount: 1423, motorTempC: 61.234, motorCurrentA: 4.851, scrapCount: 37, status: LineStatus.RUNNING },
      timestamp,
    );

    expect(payload).toEqual({
      deviceId: "band2",
      timestamp: "2026-10-16T12:34:56.789Z",
      signals: {
        production_count: 1423,
        motor_temp_c: 61.23,
        motor_current_a: 4.85,
        line_status: 1,
        scrap_count: 37,
      },
    });
  });

  it("status değerini sayısal (0/1/2) olarak taşır, Modbus holding register ile aynı kodlama", () => {
    const stopped = buildTelemetryPayload("band2", {
      productionCount: 0,
      motorTempC: 25,
      motorCurrentA: 0,
      scrapCount: 0,
      status: LineStatus.STOPPED,
    });
    const fault = buildTelemetryPayload("band2", {
      productionCount: 0,
      motorTempC: 120,
      motorCurrentA: 2,
      scrapCount: 0,
      status: LineStatus.FAULT,
    });
    expect(stopped.signals.line_status).toBe(0);
    expect(fault.signals.line_status).toBe(2);
  });
});

describe("buildStatusPayload", () => {
  it("LWT ve online mesajları için deviceId/status/timestamp üretir", () => {
    const timestamp = new Date("2026-10-16T12:00:00.000Z");
    expect(buildStatusPayload("band2", "online", timestamp)).toEqual({
      deviceId: "band2",
      status: "online",
      timestamp: "2026-10-16T12:00:00.000Z",
    });
    expect(buildStatusPayload("band2", "offline", timestamp).status).toBe("offline");
  });
});
