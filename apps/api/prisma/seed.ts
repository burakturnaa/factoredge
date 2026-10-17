import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db/prisma.js";

async function upsertUser(username: string, password: string, role: "admin" | "viewer") {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash, role },
  });
  console.log(`[seed] kullanıcı hazır: ${username} (${role})`);
}

async function upsertDevice(name: string, protocol: "modbus" | "mqtt", config: object) {
  const existing = await prisma.device.findFirst({ where: { name } });
  if (existing) {
    console.log(`[seed] cihaz zaten var, atlanıyor: ${name}`);
    return;
  }
  await prisma.device.create({ data: { name, protocol, config } });
  console.log(`[seed] cihaz oluşturuldu: ${name} (${protocol})`);
}

async function main() {
  await upsertUser("admin", "admin123", "admin");
  await upsertUser("viewer", "viewer123", "viewer");

  // VM'in host-only ağdaki statik IP'si (bkz. README "VM Kurulum Adımları").
  // Host'ta docker compose ile test ediliyorsa SIMULATOR_HOST=127.0.0.1 olarak override edilebilir.
  const simulatorHost = process.env.SIMULATOR_HOST ?? "192.168.58.5";

  await upsertDevice("Bant 1", "modbus", {
    host: simulatorHost,
    port: 5020,
    unitId: 1,
    registers: {
      production_count: { address: 30001, fc: 4, dataType: "uint32", wordOrder: "ABCD", scale: 1, unit: "adet" },
      motor_temp: { address: 30003, fc: 4, dataType: "float32", wordOrder: "CDAB", scale: 1, unit: "°C" },
      motor_current: { address: 30010, fc: 4, dataType: "int16", scale: 0.01, unit: "A" },
      scrap_count: { address: 30020, fc: 4, dataType: "uint16", scale: 1, unit: "adet" },
      line_status: { address: 40001, fc: 3, dataType: "uint16", scale: 1, unit: "" },
    },
  });

  await upsertDevice("Bant 2", "mqtt", {
    brokerUrl: `mqtt://${simulatorHost}:1883`,
    telemetryTopic: "factoryedge/band2/telemetry",
    statusTopic: "factoryedge/band2/status",
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
