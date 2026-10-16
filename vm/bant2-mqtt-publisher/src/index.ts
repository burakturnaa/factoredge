import mqtt from "mqtt";
import { createInitialState, LineStatus, tick, toSignals, type LineSimState } from "@factoredge/sim-core";
import { buildStatusPayload, buildTelemetryPayload } from "./payload.js";
import { statusTopic, telemetryTopic } from "./topics.js";

const BROKER_URL = process.env.MQTT_BROKER_URL ?? "mqtt://127.0.0.1:1883";
const DEVICE_ID = process.env.DEVICE_ID ?? "band2";
const TICK_MS = Number(process.env.TICK_MS ?? 1000);

const TOPIC_TELEMETRY = telemetryTopic(DEVICE_ID);
const TOPIC_STATUS = statusTopic(DEVICE_ID);

const offlinePayload = buildStatusPayload(DEVICE_ID, "offline");

const client = mqtt.connect(BROKER_URL, {
  clientId: `${DEVICE_ID}-publisher-${process.pid}`,
  // LWT: bağlantı anormal şekilde koparsa broker bu mesajı OTOMATİK yayınlar — backend'in
  // kesintiyi aktif polling yapmadan, pasif/anında algılamasını sağlar (Modbus tarafındaki
  // watchdog'dan kasıtlı olarak farklı bir yaklaşım, bkz. README "önemli kararlar").
  will: {
    topic: TOPIC_STATUS,
    payload: JSON.stringify(offlinePayload),
    qos: 1,
    retain: true,
  },
});

let state: LineSimState = createInitialState({ status: LineStatus.STOPPED });

client.on("connect", () => {
  console.log(`[bant2-mqtt-publisher] ${BROKER_URL} bağlandı, telemetry topic: ${TOPIC_TELEMETRY}`);
  client.publish(TOPIC_STATUS, JSON.stringify(buildStatusPayload(DEVICE_ID, "online")), { qos: 1, retain: true });
});

client.on("error", (err) => {
  console.error("[bant2-mqtt-publisher] mqtt hatası:", err.message);
});

const tickTimer = setInterval(() => {
  state = tick(state, TICK_MS);
  if (!client.connected) return; // bağlantı yoksa simülasyon devam eder, publish atlanır
  const payload = buildTelemetryPayload(DEVICE_ID, toSignals(state));
  client.publish(TOPIC_TELEMETRY, JSON.stringify(payload), { qos: 1 });
}, TICK_MS);

function shutdown(): void {
  console.log("[bant2-mqtt-publisher] kapatılıyor...");
  clearInterval(tickTimer);
  client.publish(TOPIC_STATUS, JSON.stringify(buildStatusPayload(DEVICE_ID, "offline")), { qos: 1, retain: true }, () => {
    client.end(false, {}, () => process.exit(0));
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
