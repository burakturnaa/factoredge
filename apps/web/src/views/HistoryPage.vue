<script setup lang="ts">
import type { ApexOptions } from "apexcharts";
import { computed, onMounted, ref, watch } from "vue";
import VueApexCharts from "vue3-apexcharts";
import { useDevicesStore } from "../stores/devices.store";
import { useReadingsStore } from "../stores/readings.store";
import { SIGNAL_LABELS, type SignalReading, type SignalType } from "../types";

const devicesStore = useDevicesStore();
const readingsStore = useReadingsStore();

const selectedDeviceId = ref("");
const selectedSignal = ref<SignalType>("motor_temp");
const readings = ref<SignalReading[]>([]);
const loading = ref(false);

const SIGNAL_OPTIONS: SignalType[] = ["production_count", "motor_temp", "motor_current", "line_status", "scrap_count"];

const selectedUnit = computed(() => readings.value.at(-1)?.unit ?? "");

const chartOptions = computed<ApexOptions>(() => ({
  chart: { id: "history-chart", animations: { enabled: false } },
  xaxis: { type: "datetime" },
  yaxis: { title: { text: selectedUnit.value }, labels: { formatter: (value: number) => value.toFixed(2) } },
  stroke: { curve: "smooth", width: 2 },
  noData: { text: "Bu aralıkta veri yok" },
}));

const chartSeries = computed(() => [
  {
    name: SIGNAL_LABELS[selectedSignal.value],
    data: readings.value.map((r) => [new Date(r.timestamp).getTime(), r.value]),
  },
]);

async function loadHistory(): Promise<void> {
  if (!selectedDeviceId.value) return;
  loading.value = true;
  try {
    readings.value = await readingsStore.fetchHistory(selectedDeviceId.value, selectedSignal.value);
  } finally {
    loading.value = false;
  }
}

watch([selectedDeviceId, selectedSignal], loadHistory);

onMounted(async () => {
  await devicesStore.fetchAll();
  if (devicesStore.devices.length > 0) {
    selectedDeviceId.value = devicesStore.devices[0].id;
  }
});
</script>

<template>
  <div>
    <h1>Geçmiş</h1>
    <div class="controls">
      <label>
        Cihaz
        <select v-model="selectedDeviceId">
          <option v-for="device in devicesStore.devices" :key="device.id" :value="device.id">{{ device.name }}</option>
        </select>
      </label>
      <label>
        Sinyal
        <select v-model="selectedSignal">
          <option v-for="signal in SIGNAL_OPTIONS" :key="signal" :value="signal">{{ SIGNAL_LABELS[signal] }}</option>
        </select>
      </label>
      <button @click="loadHistory" :disabled="loading">Yenile</button>
    </div>
    <div class="chart-card">
      <VueApexCharts type="line" height="360" :options="chartOptions" :series="chartSeries" />
    </div>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 1rem;
}
.controls label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: #374151;
}
select,
button {
  padding: 0.4rem 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font: inherit;
}
.chart-card {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
</style>
