<script setup lang="ts">
import { onMounted } from "vue";
import DeviceStatusBadge from "../components/DeviceStatusBadge.vue";
import { useDevicesStore } from "../stores/devices.store";
import { useReadingsStore } from "../stores/readings.store";
import { LINE_STATUS_LABELS, SIGNAL_LABELS, type SignalType } from "../types";

const devicesStore = useDevicesStore();
const readingsStore = useReadingsStore();

const SIGNAL_ORDER: SignalType[] = ["line_status", "production_count", "motor_temp", "motor_current", "scrap_count"];

function formatValue(deviceId: string, signalType: SignalType): string {
  const reading = readingsStore.latest[deviceId]?.[signalType];
  if (!reading) return "—";
  if (signalType === "line_status") return LINE_STATUS_LABELS[reading.value] ?? String(reading.value);
  // Modbus float32 round-trip'i bazen uzun ondalık kuyruğu üretir (ör. 59.32131576538086) —
  // MQTT tarafı zaten 2 ondalığa yuvarlanmış geliyor; iki protokol arayüzde aynı görünmeli.
  const roundedValue = Math.round(reading.value * 100) / 100;
  return `${roundedValue}${reading.unit}`;
}

onMounted(async () => {
  readingsStore.attachLive();
  await devicesStore.fetchAll();
});
</script>

<template>
  <div>
    <h1>Gösterge Paneli</h1>
    <div class="grid">
      <section v-for="device in devicesStore.devices" :key="device.id" class="card">
        <header class="card__header">
          <h2>{{ device.name }}</h2>
          <DeviceStatusBadge :status="device.status" :last-seen-at="device.lastSeenAt" />
        </header>
        <dl class="signals">
          <div v-for="signalType in SIGNAL_ORDER" :key="signalType" class="signals__item">
            <dt>{{ SIGNAL_LABELS[signalType] }}</dt>
            <dd>{{ formatValue(device.id, signalType) }}</dd>
          </div>
        </dl>
      </section>
      <p v-if="devicesStore.loaded && devicesStore.devices.length === 0">Henüz tanımlı bir veri kaynağı yok.</p>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}
.card {
  background: white;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.card__header h2 {
  margin: 0;
  font-size: 1.1rem;
}
.signals {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.4rem 0.75rem;
  margin: 0;
}
.signals__item {
  display: contents;
}
dt {
  color: #6b7280;
}
dd {
  margin: 0;
  font-weight: 600;
  text-align: right;
}
</style>
