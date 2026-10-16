export type SignalType = "production_count" | "motor_temp" | "motor_current" | "line_status" | "scrap_count";

export type ConnectionStatus = "connected" | "disconnected" | "error";

/** Protokolden bağımsız ortak okuma modeli — Prisma'nın SignalReading modeliyle bire bir eşleşir. */
export interface NormalizedReading {
  deviceId: string;
  signalType: SignalType;
  value: number;
  unit: string;
  timestamp: Date;
}

/**
 * Her veri kaynağı türü (Modbus, MQTT, ileride eklenecek başka bir protokol) bu interface'i
 * implemente eder. ConnectorManager sadece bu soyutlamayı bilir — yeni bir kaynak türü eklemek
 * için DB/route/frontend kodunun hiçbiri değişmez, sadece bu interface'i implemente eden yeni bir
 * sınıf + ConnectorManager'daki factory'ye bir case eklenir.
 */
export interface DataSourceConnector {
  readonly deviceId: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): ConnectionStatus;
  onReading(cb: (reading: NormalizedReading) => void): void;
  onStatusChange(cb: (status: ConnectionStatus) => void): void;
}
