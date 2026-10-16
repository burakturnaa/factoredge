import { defineStore } from "pinia";
import { api } from "../services/api";
import { onDeviceStatus } from "../services/socket";
import type { ConnectionStatus, Device } from "../types";

let statusListenerAttached = false;

export const useDevicesStore = defineStore("devices", {
  state: () => ({
    devices: [] as Device[],
    loaded: false,
  }),
  actions: {
    async fetchAll(): Promise<void> {
      this.devices = await api.get<Device[]>("/api/devices");
      this.loaded = true;
      this.attachLiveStatus();
    },
    attachLiveStatus(): void {
      if (statusListenerAttached) return;
      statusListenerAttached = true;
      onDeviceStatus(({ deviceId, status }) => this.applyStatus(deviceId, status));
    },
    applyStatus(deviceId: string, status: ConnectionStatus): void {
      const device = this.devices.find((d) => d.id === deviceId);
      if (device) {
        device.status = status;
        device.lastSeenAt = new Date().toISOString();
      }
    },
    async create(payload: Pick<Device, "name" | "protocol" | "config">): Promise<void> {
      const device = await api.post<Device>("/api/devices", payload);
      this.devices.push(device);
    },
    async update(id: string, payload: Pick<Device, "name" | "protocol" | "config">): Promise<void> {
      const updated = await api.put<Device>(`/api/devices/${id}`, payload);
      const index = this.devices.findIndex((d) => d.id === id);
      if (index !== -1) this.devices[index] = updated;
    },
    async remove(id: string): Promise<void> {
      await api.delete(`/api/devices/${id}`);
      this.devices = this.devices.filter((d) => d.id !== id);
    },
  },
});
