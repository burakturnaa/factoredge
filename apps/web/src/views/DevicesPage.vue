<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import DeviceStatusBadge from "../components/DeviceStatusBadge.vue";
import { useDevicesStore } from "../stores/devices.store";
import { SIGNAL_LABELS, type Device, type DeviceProtocol, type SignalType } from "../types";

const devicesStore = useDevicesStore();
const showForm = ref(false);
const editingId = ref<string | null>(null);
const error = ref("");

const SIGNAL_TYPES: SignalType[] = ["production_count", "motor_temp", "motor_current", "line_status", "scrap_count"];

function emptyRegister() {
  return { address: 30001, fc: 4 as 3 | 4, dataType: "uint16" as const, wordOrder: "ABCD" as const, scale: 1, unit: "" };
}

const form = reactive({
  name: "",
  protocol: "modbus" as DeviceProtocol,
  modbus: {
    host: "127.0.0.1",
    port: 5020,
    unitId: 1,
    registers: Object.fromEntries(SIGNAL_TYPES.map((s) => [s, emptyRegister()])) as Record<SignalType, ReturnType<typeof emptyRegister>>,
  },
  mqtt: {
    brokerUrl: "mqtt://127.0.0.1:1883",
    telemetryTopic: "factoryedge/band2/telemetry",
    statusTopic: "factoryedge/band2/status",
  },
});

function resetForm(): void {
  editingId.value = null;
  form.name = "";
  form.protocol = "modbus";
  form.modbus = { host: "127.0.0.1", port: 5020, unitId: 1, registers: Object.fromEntries(SIGNAL_TYPES.map((s) => [s, emptyRegister()])) as any };
  form.mqtt = { brokerUrl: "mqtt://127.0.0.1:1883", telemetryTopic: "factoryedge/band2/telemetry", statusTopic: "factoryedge/band2/status" };
}

function openCreateForm(): void {
  resetForm();
  showForm.value = true;
}

function openEditForm(device: Device): void {
  editingId.value = device.id;
  form.name = device.name;
  form.protocol = device.protocol;
  if (device.protocol === "modbus") {
    form.modbus = device.config as typeof form.modbus;
  } else {
    form.mqtt = device.config as typeof form.mqtt;
  }
  showForm.value = true;
}

async function submit(): Promise<void> {
  error.value = "";
  const payload = {
    name: form.name,
    protocol: form.protocol,
    config: form.protocol === "modbus" ? form.modbus : form.mqtt,
  };
  try {
    if (editingId.value) {
      await devicesStore.update(editingId.value, payload);
    } else {
      await devicesStore.create(payload);
    }
    showForm.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Kaydedilemedi";
  }
}

async function remove(id: string): Promise<void> {
  if (!confirm("Bu cihazı silmek istediğinize emin misiniz?")) return;
  await devicesStore.remove(id);
}

onMounted(() => devicesStore.fetchAll());
</script>

<template>
  <div>
    <div class="header">
      <h1>Cihazlar</h1>
      <button @click="openCreateForm">+ Cihaz Ekle</button>
    </div>

    <table>
      <thead>
        <tr>
          <th>Ad</th>
          <th>Protokol</th>
          <th>Durum</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="device in devicesStore.devices" :key="device.id">
          <td>{{ device.name }}</td>
          <td>{{ device.protocol }}</td>
          <td><DeviceStatusBadge :status="device.status" :last-seen-at="device.lastSeenAt" /></td>
          <td class="actions">
            <button @click="openEditForm(device)">Düzenle</button>
            <button @click="remove(device.id)">Sil</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <form class="modal" @submit.prevent="submit">
        <h2>{{ editingId ? "Cihazı Düzenle" : "Yeni Cihaz" }}</h2>
        <label>Ad <input v-model="form.name" required /></label>
        <label>
          Protokol
          <select v-model="form.protocol" :disabled="Boolean(editingId)">
            <option value="modbus">Modbus TCP</option>
            <option value="mqtt">MQTT</option>
          </select>
        </label>

        <template v-if="form.protocol === 'modbus'">
          <div class="row">
            <label>Host <input v-model="form.modbus.host" required /></label>
            <label>Port <input v-model.number="form.modbus.port" type="number" required /></label>
            <label>Unit ID <input v-model.number="form.modbus.unitId" type="number" required /></label>
          </div>
          <h3>Register Haritası</h3>
          <table class="register-table">
            <thead>
              <tr>
                <th>Sinyal</th>
                <th>Adres</th>
                <th>FC</th>
                <th>Tip</th>
                <th>Word Sırası</th>
                <th>Scale</th>
                <th>Birim</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="signal in SIGNAL_TYPES" :key="signal">
                <td>{{ SIGNAL_LABELS[signal] }}</td>
                <td><input v-model.number="form.modbus.registers[signal].address" type="number" /></td>
                <td>
                  <select v-model.number="form.modbus.registers[signal].fc">
                    <option :value="3">03 (holding)</option>
                    <option :value="4">04 (input)</option>
                  </select>
                </td>
                <td>
                  <select v-model="form.modbus.registers[signal].dataType">
                    <option value="uint32">uint32</option>
                    <option value="float32">float32</option>
                    <option value="int16">int16</option>
                    <option value="uint16">uint16</option>
                  </select>
                </td>
                <td>
                  <select v-model="form.modbus.registers[signal].wordOrder">
                    <option value="ABCD">ABCD</option>
                    <option value="CDAB">CDAB</option>
                  </select>
                </td>
                <td><input v-model.number="form.modbus.registers[signal].scale" type="number" step="0.01" /></td>
                <td><input v-model="form.modbus.registers[signal].unit" /></td>
              </tr>
            </tbody>
          </table>
        </template>

        <template v-else>
          <label>Broker Adresi <input v-model="form.mqtt.brokerUrl" required /></label>
          <label>Telemetry Topic <input v-model="form.mqtt.telemetryTopic" required /></label>
          <label>Status Topic <input v-model="form.mqtt.statusTopic" required /></label>
        </template>

        <p v-if="error" class="form-error">{{ error }}</p>
        <div class="modal-actions">
          <button type="button" @click="showForm = false">İptal</button>
          <button type="submit">Kaydet</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.actions {
  display: flex;
  gap: 0.5rem;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.modal {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  width: min(720px, 90vw);
  max-height: 85vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.modal label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
}
.modal input,
.modal select {
  padding: 0.4rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font: inherit;
}
.row {
  display: flex;
  gap: 1rem;
}
.row label {
  flex: 1;
}
.register-table th,
.register-table td {
  padding: 0.25rem 0.35rem;
}
.register-table input,
.register-table select {
  width: 100%;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.form-error {
  color: #b91c1c;
  margin: 0;
}
</style>
