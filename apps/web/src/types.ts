export type SignalType = "production_count" | "motor_temp" | "motor_current" | "line_status" | "scrap_count";
export type DeviceProtocol = "modbus" | "mqtt";
export type ConnectionStatus = "connected" | "disconnected" | "error";
export type UserRole = "admin" | "viewer";

export interface Device {
  id: string;
  name: string;
  protocol: DeviceProtocol;
  config: Record<string, unknown>;
  status: ConnectionStatus;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignalReading {
  id: string;
  deviceId: string;
  signalType: SignalType;
  value: number;
  unit: string;
  timestamp: string;
}

export interface NormalizedReading {
  deviceId: string;
  signalType: SignalType;
  value: number;
  unit: string;
  timestamp: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

export const SIGNAL_LABELS: Record<SignalType, string> = {
  production_count: "Üretim Adedi",
  motor_temp: "Motor Sıcaklığı",
  motor_current: "Motor Akımı",
  line_status: "Bant Durumu",
  scrap_count: "Fire Adedi",
};

export const LINE_STATUS_LABELS: Record<number, string> = {
  0: "Durdu",
  1: "Çalışıyor",
  2: "Arıza",
};
