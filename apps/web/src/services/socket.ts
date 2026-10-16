import { io, type Socket } from "socket.io-client";
import { ref, type Ref } from "vue";
import { useAuthStore } from "../stores/auth.store";
import type { ConnectionStatus, NormalizedReading } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

let socket: Socket | null = null;

// Platformun kendi WS bağlantı durumu — connectSocket() her yeni client yarattığında burada
// anında bağlanır (App.vue'da bir kere "onMounted" ile dinlemek yerine), böylece logout/login
// arasında socket instance'ı yeniden yaratıldığında durum asla eski/yanlış kalmaz.
const platformConnected: Ref<boolean> = ref(true);

/**
 * Tekil Socket.IO client. Platformun kendi WS bağlantı durumu ("connect"/"disconnect") ile
 * kaynak cihazların bağlantı durumu ("device:status" event'i) kasıtlı olarak ayrı tutulur —
 * ikisi UI'da karıştırılmamalı.
 */
export function connectSocket(): Socket {
  if (socket) return socket;
  const auth = useAuthStore();
  socket = io(BASE_URL, { auth: { token: auth.token } });
  socket.on("connect", () => (platformConnected.value = true));
  socket.on("disconnect", () => (platformConnected.value = false));
  return socket;
}

export function disconnectSocket(): void {
  socket?.close();
  socket = null;
  platformConnected.value = true; // çıkışta uyarı banner'ı gösterilmesin
}

export function onSignalUpdate(cb: (reading: NormalizedReading) => void): void {
  connectSocket().on("signal:update", cb);
}

export function onDeviceStatus(cb: (payload: { deviceId: string; status: ConnectionStatus }) => void): void {
  connectSocket().on("device:status", cb);
}

export function usePlatformConnection(): Ref<boolean> {
  connectSocket();
  return platformConnected;
}
