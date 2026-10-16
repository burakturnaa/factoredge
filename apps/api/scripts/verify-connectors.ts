// Geliştirme aracı: DB'deki cihazları yükler, connector'ları başlatır ve gelen okuma/durum
// olaylarını konsola yazar. VM/Docker simülatörleri çalışır durumdayken manuel doğrulama içindir.
import "dotenv/config";
import { ConnectorManager } from "../src/connectors/connector-manager.js";
import { prisma } from "../src/db/prisma.js";

const DURATION_MS = Number(process.env.DURATION_MS ?? 15000);

const manager = new ConnectorManager();
manager.onReading((r) => {
  console.log(`[reading] ${r.deviceId.slice(0, 8)} ${r.signalType}=${r.value}${r.unit} @ ${r.timestamp.toISOString()}`);
});
manager.onStatusChange((deviceId, status) => {
  console.log(`[status] ${deviceId.slice(0, 8)} -> ${status}`);
});

await manager.loadAllFromDb();
console.log(`Connector'lar başlatıldı, ${DURATION_MS / 1000} saniye izleniyor...`);

setTimeout(async () => {
  await manager.stopAll();
  await prisma.$disconnect();
  process.exit(0);
}, DURATION_MS);
