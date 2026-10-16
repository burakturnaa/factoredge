import type { Device } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { ModbusConnector, type ModbusDeviceConfig } from "./modbus-connector.js";
import { MqttConnector, type MqttDeviceConfig } from "./mqtt-connector.js";
import type { ConnectionStatus, DataSourceConnector, NormalizedReading } from "./types.js";

type ReadingListener = (reading: NormalizedReading) => void;
type StatusListener = (deviceId: string, status: ConnectionStatus) => void;

/**
 * Cihaz CRUD'u ve Modbus/MQTT connector'ları arasındaki tek bağlantı noktası. Yeni bir protokol
 * eklemek için createConnector'daki switch'e bir case eklemek yeterli — çağıran kod
 * (route'lar, DB, frontend) değişmez.
 */
export class ConnectorManager {
  private connectors = new Map<string, DataSourceConnector>();
  private readingListeners: ReadingListener[] = [];
  private statusListeners: StatusListener[] = [];

  onReading(cb: ReadingListener): void {
    this.readingListeners.push(cb);
  }

  onStatusChange(cb: StatusListener): void {
    this.statusListeners.push(cb);
  }

  async loadAllFromDb(): Promise<void> {
    const devices = await prisma.device.findMany();
    await Promise.all(devices.map((device) => this.addDevice(device)));
  }

  async addDevice(device: Device): Promise<void> {
    if (this.connectors.has(device.id)) return;
    const connector = this.createConnector(device);
    connector.onReading((reading) => void this.handleReading(reading));
    connector.onStatusChange((status) => void this.handleStatusChange(device.id, status));
    this.connectors.set(device.id, connector);
    await connector.start();
  }

  async removeDevice(deviceId: string): Promise<void> {
    const connector = this.connectors.get(deviceId);
    if (!connector) return;
    await connector.stop();
    this.connectors.delete(deviceId);
  }

  async restartDevice(device: Device): Promise<void> {
    await this.removeDevice(device.id);
    await this.addDevice(device);
  }

  getStatus(deviceId: string): ConnectionStatus | undefined {
    return this.connectors.get(deviceId)?.getStatus();
  }

  async stopAll(): Promise<void> {
    await Promise.all([...this.connectors.values()].map((c) => c.stop()));
    this.connectors.clear();
  }

  private createConnector(device: Device): DataSourceConnector {
    switch (device.protocol) {
      case "modbus":
        return new ModbusConnector(device.id, device.config as unknown as ModbusDeviceConfig);
      case "mqtt":
        return new MqttConnector(device.id, device.config as unknown as MqttDeviceConfig);
      default:
        throw new Error(`Desteklenmeyen protokol: ${String(device.protocol)}`);
    }
  }

  private async handleReading(reading: NormalizedReading): Promise<void> {
    for (const cb of this.readingListeners) cb(reading);
    try {
      await prisma.signalReading.create({ data: reading });
      await prisma.device.update({ where: { id: reading.deviceId }, data: { lastSeenAt: reading.timestamp } });
    } catch (err) {
      console.error(`[connector-manager] okuma kaydedilemedi (${reading.deviceId}):`, err);
    }
  }

  private async handleStatusChange(deviceId: string, status: ConnectionStatus): Promise<void> {
    for (const cb of this.statusListeners) cb(deviceId, status);
    try {
      await prisma.device.update({ where: { id: deviceId }, data: { status } });
    } catch (err) {
      console.error(`[connector-manager] durum güncellenemedi (${deviceId}):`, err);
    }
  }
}
