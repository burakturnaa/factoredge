import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { verifyToken } from "../auth/jwt.js";
import { connectorManager } from "../connectors/manager-instance.js";

/** Canlı veri yayını: sayfa yenilenmeden dashboard güncellensin diye signal:update/device:status. */
export function createSocketGateway(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, { cors: { origin: "*" } });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string") {
      next(new Error("Kimlik doğrulama gerekli"));
      return;
    }
    try {
      socket.data.user = verifyToken(token);
      next();
    } catch {
      next(new Error("Geçersiz veya süresi dolmuş token"));
    }
  });

  connectorManager.onReading((reading) => {
    io.emit("signal:update", reading);
  });
  connectorManager.onStatusChange((deviceId, status) => {
    io.emit("device:status", { deviceId, status });
  });

  return io;
}
