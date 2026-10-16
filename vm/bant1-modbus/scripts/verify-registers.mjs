// Geliştirme/doğrulama aracı: çalışan bant1-modbus sunucusunu BAĞIMSIZ bir Modbus client
// kütüphanesiyle (modbus-serial — sunucu tarafında kullanılan jsmodbus'tan farklı) okuyup
// case'in register haritasına (word order, scale, unit id) uygunluğunu gerçek bir TCP
// bağlantısı üzerinden doğrular.
//
// Kullanım: node scripts/verify-registers.mjs
// Ortam değişkenleri: MODBUS_HOST (127.0.0.1), MODBUS_PORT (5020), UNIT_ID (1),
//                     ITERATIONS (6), INTERVAL_MS (5000)
import ModbusRTU from "modbus-serial";

const HOST = process.env.MODBUS_HOST ?? "127.0.0.1";
const PORT = Number(process.env.MODBUS_PORT ?? 5020);
const UNIT_ID = Number(process.env.UNIT_ID ?? 1);
const ITERATIONS = Number(process.env.ITERATIONS ?? 6);
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 5000);

const STATUS_LABEL = { 0: "STOPPED", 1: "RUNNING", 2: "FAULT" };

function decodeFloat32CDAB(low, high) {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(high, 0);
  buf.writeUInt16BE(low, 2);
  return buf.readFloatBE(0);
}

async function main() {
  const client = new ModbusRTU();
  await client.connectTCP(HOST, { port: PORT });
  client.setID(UNIT_ID);
  console.log(`Bağlandı: ${HOST}:${PORT} (unit id ${UNIT_ID})`);

  for (let i = 0; i < ITERATIONS; i++) {
    const production = await client.readInputRegisters(0, 2); // 30001-30002, uint32 ABCD
    const temp = await client.readInputRegisters(2, 2); // 30003-30004, float32 CDAB
    const current = await client.readInputRegisters(9, 1); // 30010, int16 scale 0.01
    const scrap = await client.readInputRegisters(19, 1); // 30020, uint16
    const status = await client.readHoldingRegisters(0, 1); // 40001

    const productionCount = (production.data[0] << 16) | production.data[1];
    const motorTempC = decodeFloat32CDAB(temp.data[0], temp.data[1]);
    const motorCurrentA = current.data[0] / 100;
    const statusValue = status.data[0];

    console.log(
      `[t=${i * (INTERVAL_MS / 1000)}s] üretim=${productionCount} adet  sıcaklık=${motorTempC.toFixed(2)}°C  ` +
        `akım=${motorCurrentA.toFixed(2)}A  fire=${scrap.data[0]} adet  durum=${STATUS_LABEL[statusValue] ?? statusValue}`,
    );
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }

  await client.close();
}

main().catch((err) => {
  console.error("Doğrulama başarısız:", err);
  process.exit(1);
});
