<script setup lang="ts">
import { computed } from "vue";
import type { ConnectionStatus } from "../types";

const props = defineProps<{ status: ConnectionStatus; lastSeenAt: string | null }>();

const label = computed(() => ({ connected: "Bağlı", disconnected: "Kopuk", error: "Kopuk" }[props.status]));

const lastSeenLabel = computed(() => {
  if (!props.lastSeenAt) return "henüz veri yok";
  return new Date(props.lastSeenAt).toLocaleTimeString("tr-TR");
});
</script>

<template>
  <span class="badge" :class="`badge--${status}`">
    ● {{ label }}
    <span class="badge__time">· son veri: {{ lastSeenLabel }}</span>
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}
.badge--connected {
  background: #dcfce7;
  color: #166534;
}
.badge--disconnected,
.badge--error {
  background: #fee2e2;
  color: #991b1b;
}
.badge__time {
  font-weight: normal;
  opacity: 0.8;
}
</style>
