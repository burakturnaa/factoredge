import { io, type Socket } from "socket.io-client";
import { ref, type Ref } from "vue";
import { useAuthStore } from "../stores/auth.store";
import type { ConnectionStatus, NormalizedReading } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

let socket: Socket | null = null;
// Mevcut socket'in hangi token ile yaratıldığı — login SPA içinde (sayfa yenilenmeden) olduğunda
// App.vue henüz auth.token=null iken ilk socket'i yaratmış olabilir; aşağıdaki connectSocket()
// her çağrıldığında token'ın değişip değişmediğini kontrol edip gerekirse yeniden bağlanır.
let socketToken: string | null = null;

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
  const auth = useAuthStore();
  if (socket && socketToken === auth.token) return socket;
  // Token değişti (ör. login SPA içinde gerçekleşti, socket daha önce token=null ile yaratılmıştı)
  // ya da hiç socket yok — eskisini kapatıp güncel token'la yenisini yarat.
  socket?.close();
  socketToken = auth.token;
  socket = io(BASE_URL, { auth: { token: auth.token } });
  socket.on("connect", () => (platformConnected.value = true));
  socket.on("disconnect", () => (platformConnected.value = false));
  return socket;
}

export function disconnectSocket(): void {
  socket?.close();
  socket = null;
  socketToken = null;
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
