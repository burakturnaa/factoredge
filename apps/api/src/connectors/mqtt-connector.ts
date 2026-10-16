import mqtt, { type MqttClient } from "mqtt";
import type { ConnectionStatus, DataSourceConnector, NormalizedReading } from "./types.js";
import { parseStatusMessage, parseTelemetryMessage } from "./mqtt-payload-parser.js";

export interface MqttDeviceConfig {
  brokerUrl: string;
  telemetryTopic: string;
  statusTopic: string;
  /** Bu süre kadar telemetry gelmezse (bağlantı açık görünse de) durum "error"a çekilir. */
  watchdogTimeoutMs?: number;
}

const DEFAULT_WATCHDOG_TIMEOUT_MS = 5000;

export class MqttConnector implements DataSourceConnector {
  readonly deviceId: string;
  private readonly cfg: MqttDeviceConfig;
  private client?: MqttClient;
  private status: ConnectionStatus = "disconnected";
  private readingCbs: Array<(r: NormalizedReading) => void> = [];
  private statusCbs: Array<(s: ConnectionStatus) => void> = [];
  private watchdogTimer?: NodeJS.Timeout;

  constructor(deviceId: string, config: MqttDeviceConfig) {
    this.deviceId = deviceId;
    this.cfg = config;
  }

  onReading(cb: (r: NormalizedReading) => void): void {
    this.readingCbs.push(cb);
  }

  onStatusChange(cb: (s: ConnectionStatus) => void): void {
    this.statusCbs.push(cb);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  async start(): Promise<void> {
    // mqtt.js kendi reconnect/backoff mantığına sahip (varsayılan reconnectPeriod); ayrıca
    // Modbus'taki gibi kendi backoff döngüsü kurmaya gerek yok.
    this.client = mqtt.connect(this.cfg.brokerUrl, {
      clientId: `factoredge-backend-${this.deviceId}-${process.pid}`,
    });

    this.client.on("connect", () => {
      this.client?.subscribe([this.cfg.telemetryTopic, this.cfg.statusTopic]);
      this.setStatus("connected");
      this.armWatchdog();
    });

    this.client.on("reconnect", () => this.setStatus("error"));
    this.client.on("close", () => this.setStatus("disconnected"));
    this.client.on("error", () => this.setStatus("error"));

    this.client.on("message", (topic, payload) => {
      if (topic === this.cfg.telemetryTopic) {
        this.handleTelemetry(payload);
      } else if (topic === this.cfg.statusTopic) {
        this.handleStatus(payload);
      }
    });
  }

  async stop(): Promise<void> {
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    await new Promise<void>((resolve) => this.client?.end(false, {}, () => resolve()));
    this.setStatus("disconnected");
  }

  private setStatus(next: ConnectionStatus): void {
    if (this.status === next) return;
    this.status = next;
    for (const cb of this.statusCbs) cb(next);
  }

  private handleTelemetry(payload: Buffer): void {
    const readings = parseTelemetryMessage(payload, this.deviceId);
    if (!readings) return; // bozuk mesaj: logla/atla, crash etme
    this.setStatus("connected");
    this.armWatchdog();
    for (const reading of readings) {
      for (const cb of this.readingCbs) cb(reading);
    }
  }

  private handleStatus(payload: Buffer): void {
    // LWT ile broker'ın yayınladığı "offline" mesajı da buradan geçer — publisher'ın kendisi
    // çökse bile (Modbus'taki watchdog'un aksine) kesinti PASİF olarak anında algılanır.
    const status = parseStatusMessage(payload);
    if (status === "offline") this.setStatus("error");
    if (status === "online") this.setStatus("connected");
  }

  private armWatchdog(): void {
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    const timeout = this.cfg.watchdogTimeoutMs ?? DEFAULT_WATCHDOG_TIMEOUT_MS;
    this.watchdogTimer = setTimeout(() => this.setStatus("error"), timeout);
  }
}
