import ModbusRTUNamespace from "modbus-serial";
import type { ModbusRTU as ModbusRTUInstance } from "modbus-serial/ModbusRTU.js";
import type { ConnectionStatus, DataSourceConnector, NormalizedReading, SignalType } from "./types.js";
import { decodeFloat32, decodeInt16Scaled, decodeUInt16, decodeUInt32 } from "./register-decoder.js";

// modbus-serial'ın .d.ts'i (ESM `export default`) ile gerçek runtime'ı (düz CJS
// `module.exports = ModbusRTU`) birbiriyle uyuşmuyor; bu da TS'in default import'u constructable
// olmayan bir namespace tipi olarak görmesine yol açıyor (TS2351). Çalışma zamanında doğru
// olduğu bağımsız bir script ile doğrulandı (bkz. plan "AI/kütüphane tipi uyuşmazlığı") — burada
// tek bir noktada, gerçek ModbusRTU sınıf tipine cast ediyoruz.
type ModbusRTUConstructor = new () => ModbusRTUInstance;
const ModbusRTU = ModbusRTUNamespace as unknown as ModbusRTUConstructor;

interface ModbusRegisterConfig {
  address: number; // case'teki gibi 30001/40001 tarzı geleneksel adres (1-tabanlı, protokol adresine çevrilir)
  fc: 3 | 4; // 03 holding, 04 input
  dataType: "uint32" | "float32" | "int16" | "uint16";
  wordOrder?: "ABCD" | "CDAB";
  scale: number;
  unit: string;
}

export interface ModbusDeviceConfig {
  host: string;
  port: number;
  unitId: number;
  /** key'ler SignalType değerleriyle eşleşir (ör. "motor_temp") — herhangi bir register haritası tanımlanabilir. */
  registers: Record<SignalType, ModbusRegisterConfig>;
  pollIntervalMs?: number;
}

const BACKOFF_STEPS_MS = [1000, 2000, 4000, 8000, 16000, 30000];
// 30001 gibi "geleneksel" adresleri 0-tabanlı protokol adresine çevirir (binlik basamak 3=input, 4=holding vb.,
// gerçek ofset binlik basamaktan sonraki kısımdır).
function toProtocolAddress(conventionalAddress: number): number {
  return (conventionalAddress % 10000) - 1;
}

export class ModbusConnector implements DataSourceConnector {
  readonly deviceId: string;
  private readonly cfg: ModbusDeviceConfig;
  private readonly client: ModbusRTUInstance = new ModbusRTU();
  private status: ConnectionStatus = "disconnected";
  private readingCbs: Array<(r: NormalizedReading) => void> = [];
  private statusCbs: Array<(s: ConnectionStatus) => void> = [];
  private pollTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private stopped = true;
  private backoffIndex = 0;

  constructor(deviceId: string, config: ModbusDeviceConfig) {
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
    this.stopped = false;
    await this.connectWithBackoff();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    try {
      this.client.close(() => {});
    } catch {
      // bağlantı zaten kapalıysa yut
    }
    this.setStatus("disconnected");
  }

  private setStatus(next: ConnectionStatus): void {
    if (this.status === next) return;
    this.status = next;
    for (const cb of this.statusCbs) cb(next);
  }

  private async connectWithBackoff(): Promise<void> {
    if (this.stopped) return;
    try {
      await this.client.connectTCP(this.cfg.host, { port: this.cfg.port });
      this.client.setID(this.cfg.unitId);
      this.backoffIndex = 0;
      this.setStatus("connected");
      this.startPolling();
    } catch {
      this.setStatus("error");
      const delay = BACKOFF_STEPS_MS[Math.min(this.backoffIndex, BACKOFF_STEPS_MS.length - 1)];
      this.backoffIndex++;
      this.reconnectTimer = setTimeout(() => void this.connectWithBackoff(), delay);
    }
  }

  private startPolling(): void {
    const intervalMs = this.cfg.pollIntervalMs ?? 1000;
    this.pollTimer = setInterval(() => {
      this.pollOnce().catch(() => this.handleConnectionLost());
    }, intervalMs);
  }

  private handleConnectionLost(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.setStatus("error");
    this.backoffIndex = 0;
    this.reconnectTimer = setTimeout(() => void this.connectWithBackoff(), BACKOFF_STEPS_MS[0]);
  }

  private async pollOnce(): Promise<void> {
    const timestamp = new Date();
    for (const [signalType, reg] of Object.entries(this.cfg.registers) as Array<[SignalType, ModbusRegisterConfig]>) {
      const value = await this.readRegister(reg);
      const reading: NormalizedReading = { deviceId: this.deviceId, signalType, value, unit: reg.unit, timestamp };
      for (const cb of this.readingCbs) cb(reading);
    }
    this.setStatus("connected"); // her başarılı tur canlılığı teyit eder
  }

  private async readRegister(reg: ModbusRegisterConfig): Promise<number> {
    const protocolAddress = toProtocolAddress(reg.address);
    const isTwoRegister = reg.dataType === "uint32" || reg.dataType === "float32";
    const length = isTwoRegister ? 2 : 1;
    const result =
      reg.fc === 4
        ? await this.client.readInputRegisters(protocolAddress, length)
        : await this.client.readHoldingRegisters(protocolAddress, length);
    const [reg0, reg1] = result.data;

    switch (reg.dataType) {
      case "uint32":
        return decodeUInt32(reg0, reg1, reg.wordOrder ?? "ABCD") * reg.scale;
      case "float32":
        return decodeFloat32(reg0, reg1, reg.wordOrder ?? "CDAB") * reg.scale;
      case "int16":
        return decodeInt16Scaled(reg0, reg.scale);
      case "uint16":
        return decodeUInt16(reg0, reg.scale);
    }
  }
}
