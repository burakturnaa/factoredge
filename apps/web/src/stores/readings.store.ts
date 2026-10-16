import { defineStore } from "pinia";
import { api } from "../services/api";
import { onSignalUpdate } from "../services/socket";
import type { NormalizedReading, SignalReading, SignalType } from "../types";

let liveListenerAttached = false;

export const useReadingsStore = defineStore("readings", {
  // latest[deviceId][signalType] = en son gelen okuma — dashboard kartları için.
  state: () => ({
    latest: {} as Record<string, Partial<Record<SignalType, NormalizedReading>>>,
  }),
  actions: {
    attachLive(): void {
      if (liveListenerAttached) return;
      liveListenerAttached = true;
      onSignalUpdate((reading) => {
        if (!this.latest[reading.deviceId]) this.latest[reading.deviceId] = {};
        this.latest[reading.deviceId][reading.signalType] = reading;
      });
    },
    async fetchHistory(deviceId: string, signalType: SignalType, from?: string, to?: string): Promise<SignalReading[]> {
      const params = new URLSearchParams({ deviceId, signalType });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      return api.get<SignalReading[]>(`/api/readings?${params.toString()}`);
    },
  },
});
