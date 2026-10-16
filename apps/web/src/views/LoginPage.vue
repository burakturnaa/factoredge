<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { api, ApiError } from "../services/api";
import { useAuthStore } from "../stores/auth.store";
import type { AuthUser } from "../types";

const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

const auth = useAuthStore();
const router = useRouter();

async function submit(): Promise<void> {
  error.value = "";
  loading.value = true;
  try {
    const result = await api.post<{ token: string; user: AuthUser }>("/api/auth/login", {
      username: username.value,
      password: password.value,
    });
    auth.setSession(result.token, result.user);
    router.push({ name: "dashboard" });
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : "Giriş yapılamadı";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login">
    <form class="login__card" @submit.prevent="submit">
      <h1>FactorEdge</h1>
      <p class="login__subtitle">Mini Akıllı Fabrika</p>
      <label>
        Kullanıcı adı
        <input v-model="username" type="text" autocomplete="username" required />
      </label>
      <label>
        Parola
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <p v-if="error" class="login__error">{{ error }}</p>
      <button type="submit" :disabled="loading">{{ loading ? "Giriş yapılıyor..." : "Giriş yap" }}</button>
    </form>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
.login__card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 320px;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.login__card h1 {
  margin: 0;
}
.login__subtitle {
  margin: 0 0 1rem;
  color: #6b7280;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}
input {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font: inherit;
}
button {
  padding: 0.6rem;
  border: none;
  border-radius: 4px;
  background: #1f2937;
  color: white;
  font-weight: 600;
}
button:disabled {
  opacity: 0.6;
}
.login__error {
  color: #b91c1c;
  margin: 0;
  font-size: 0.85rem;
}
</style>
