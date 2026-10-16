<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from "vue-router";
import { useAuthStore } from "./stores/auth.store";
import { disconnectSocket, usePlatformConnection } from "./services/socket";

const auth = useAuthStore();
const router = useRouter();
const platformConnected = usePlatformConnection();

function logout(): void {
  disconnectSocket();
  auth.logout();
  router.push({ name: "login" });
}
</script>

<template>
  <div class="app-shell">
    <header v-if="auth.isAuthenticated" class="app-nav">
      <div class="app-nav__brand">FactorEdge</div>
      <nav class="app-nav__links">
        <RouterLink to="/">Gösterge Paneli</RouterLink>
        <RouterLink to="/history">Geçmiş</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/devices">Cihazlar</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/users">Kullanıcılar</RouterLink>
      </nav>
      <div class="app-nav__user">
        <span>{{ auth.user?.username }} ({{ auth.user?.role }})</span>
        <button @click="logout">Çıkış</button>
      </div>
    </header>
    <div v-if="auth.isAuthenticated && !platformConnected" class="app-banner app-banner--warning">
      Sunucuya bağlanılamıyor, yeniden bağlanmaya çalışılıyor...
    </div>
    <main class="app-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.app-nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  padding: 0.75rem 1.5rem;
  background: #1f2937;
  color: white;
}
.app-nav__brand {
  font-weight: 700;
  white-space: nowrap;
}
.app-nav__links {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  flex: 1;
}
.app-nav__links a {
  white-space: nowrap;
  color: #d1d5db;
  text-decoration: none;
}
.app-nav__links a.router-link-active {
  color: white;
  font-weight: 600;
}
.app-nav__user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
}
.app-banner {
  padding: 0.5rem 1rem;
  text-align: center;
  font-size: 0.9rem;
}
.app-banner--warning {
  background: #fef3c7;
  color: #92400e;
}
.app-content {
  flex: 1;
  padding: 1.5rem;
}
</style>
