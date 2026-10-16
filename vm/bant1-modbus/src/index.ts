import net from "node:net";
import { server as modbusServer } from "jsmodbus";
import { createInitialState, LineStatus, tick, toSignals, type LineSimState } from "@factoredge/sim-core";
import { encodeFloat32CDAB, encodeInt16Scaled, encodeUInt16, encodeUInt32ABCD } from "./register-encoder.js";

const PORT = Number(process.env.PORT ?? 5020);
const TICK_MS = Number(process.env.TICK_MS ?? 1000);
const CURRENT_SCALE = 0.01;

// Case'teki register haritasına göre byte ofsetleri (adres - 30001, * 2 byte/word).
const OFFSET = {
  PRODUCTION_HIGH: (30001 - 30001) * 2, // 0
  PRODUCTION_LOW: (30002 - 30001) * 2, // 2
  TEMP_LOW: (30003 - 30001) * 2, // 4  (CDAB: düşük word önce)
  TEMP_HIGH: (30004 - 30001) * 2, // 6
  CURRENT: (30010 - 30001) * 2, // 18
  SCRAP: (30020 - 30001) * 2, // 38
} as const;
const INPUT_REGISTER_COUNT = 30020 - 30001 + 1; // 20 register -> 40 byte buffer
const HOLDING_STATUS_OFFSET = (40001 - 40001) * 2; // 0

const inputRegisters = Buffer.alloc(INPUT_REGISTER_COUNT * 2);
const holdingRegisters = Buffer.alloc(2);

function writeSignalsToRegisters(signals: ReturnType<typeof toSignals>): void {
  const [prodHigh, prodLow] = encodeUInt32ABCD(signals.productionCount);
  inputRegisters.writeUInt16BE(prodHigh, OFFSET.PRODUCTION_HIGH);
  inputRegisters.writeUInt16BE(prodLow, OFFSET.PRODUCTION_LOW);

  const [tempLow, tempHigh] = encodeFloat32CDAB(signals.motorTempC);
  inputRegisters.writeUInt16BE(tempLow, OFFSET.TEMP_LOW);
  inputRegisters.writeUInt16BE(tempHigh, OFFSET.TEMP_HIGH);

  inputRegisters.writeUInt16BE(encodeInt16Scaled(signals.motorCurrentA, CURRENT_SCALE), OFFSET.CURRENT);
  inputRegisters.writeUInt16BE(encodeUInt16(signals.scrapCount), OFFSET.SCRAP);

  holdingRegisters.writeUInt16BE(encodeUInt16(signals.status), HOLDING_STATUS_OFFSET);
}

let state: LineSimState = createInitialState({ status: LineStatus.STOPPED });
writeSignalsToRegisters(toSignals(state));

const netServer = new net.Server();
// jsmodbus'un "holding"/"input" seçenekleri referans olarak saklanır; buffer'ı yerinde (in-place)
// mutate etmek yeterlidir, server her istekte güncel içeriği okur.
new modbusServer.TCP(netServer, {
  holding: holdingRegisters,
  input: inputRegisters,
});

netServer.listen(PORT, "0.0.0.0", () => {
  console.log(`[bant1-modbus] Modbus TCP sunucusu 0.0.0.0:${PORT} üzerinde dinliyor (unit id 1 bekleniyor)`);
});

const tickTimer = setInterval(() => {
  state = tick(state, TICK_MS);
  const signals = toSignals(state);
  writeSignalsToRegisters(signals);
}, TICK_MS);

function shutdown(): void {
  console.log("[bant1-modbus] kapatılıyor...");
  clearInterval(tickTimer);
  netServer.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
