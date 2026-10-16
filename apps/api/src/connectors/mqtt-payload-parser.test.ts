import { describe, expect, it } from "vitest";
import { parseStatusMessage, parseTelemetryMessage } from "./mqtt-payload-parser.js";

describe("parseTelemetryMessage", () => {
  it("geçerli bir mesajı 5 NormalizedReading'e çevirir, alan adlarını case'in SignalType'ına map eder", () => {
    const raw = JSON.stringify({
      deviceId: "band2",
      timestamp: "2026-10-16T12:34:56.789Z",
      signals: { production_count: 1423, motor_temp_c: 61.23, motor_current_a: 4.85, line_status: 1, scrap_count: 37 },
    });

    const readings = parseTelemetryMessage(raw, "band2");

    expect(readings).toHaveLength(5);
    expect(readings).toEqual(
      expect.arrayContaining([
        { deviceId: "band2", signalType: "production_count", value: 1423, unit: "adet", timestamp: new Date("2026-10-16T12:34:56.789Z") },
        { deviceId: "band2", signalType: "motor_temp", value: 61.23, unit: "°C", timestamp: new Date("2026-10-16T12:34:56.789Z") },
        { deviceId: "band2", signalType: "motor_current", value: 4.85, unit: "A", timestamp: new Date("2026-10-16T12:34:56.789Z") },
        { deviceId: "band2", signalType: "line_status", value: 1, unit: "", timestamp: new Date("2026-10-16T12:34:56.789Z") },
        { deviceId: "band2", signalType: "scrap_count", value: 37, unit: "adet", timestamp: new Date("2026-10-16T12:34:56.789Z") },
      ]),
    );
  });

  it("bozuk JSON için null döner (crash etmez)", () => {
    expect(parseTelemetryMessage("{bozuk json", "band2")).toBeNull();
  });

  it("eksik alan içeren mesaj için null döner", () => {
    const raw = JSON.stringify({ deviceId: "band2", timestamp: "2026-10-16T12:00:00Z", signals: { production_count: 1 } });
    expect(parseTelemetryMessage(raw, "band2")).toBeNull();
  });
});

describe("parseStatusMessage", () => {
  it("online/offline değerlerini doğru okur", () => {
    expect(parseStatusMessage(JSON.stringify({ status: "online" }))).toBe("online");
    expect(parseStatusMessage(JSON.stringify({ status: "offline" }))).toBe("offline");
  });

  it("geçersiz status için null döner", () => {
    expect(parseStatusMessage(JSON.stringify({ status: "garbled" }))).toBeNull();
    expect(parseStatusMessage("{bozuk")).toBeNull();
  });
});
