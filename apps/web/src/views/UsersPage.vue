<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useUsersStore } from "../stores/users.store";

const usersStore = useUsersStore();
const showForm = ref(false);
const error = ref("");

const form = reactive({ username: "", password: "", role: "viewer" as "admin" | "viewer" });

function resetForm(): void {
  form.username = "";
  form.password = "";
  form.role = "viewer";
}

async function submit(): Promise<void> {
  error.value = "";
  try {
    await usersStore.create({ ...form });
    showForm.value = false;
    resetForm();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Kaydedilemedi";
  }
}

async function remove(id: string): Promise<void> {
  if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
  await usersStore.remove(id);
}

onMounted(() => usersStore.fetchAll());
</script>

<template>
  <div>
    <div class="header">
      <h1>Kullanıcılar</h1>
      <button @click="showForm = true">+ Kullanıcı Ekle</button>
    </div>

    <table>
      <thead>
        <tr>
          <th>Kullanıcı Adı</th>
          <th>Rol</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in usersStore.users" :key="user.id">
          <td>{{ user.username }}</td>
          <td>{{ user.role === "admin" ? "Yönetici" : "İzleyici" }}</td>
          <td><button @click="remove(user.id)">Sil</button></td>
        </tr>
      </tbody>
    </table>

    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <form class="modal" @submit.prevent="submit">
        <h2>Yeni Kullanıcı</h2>
        <label>Kullanıcı adı <input v-model="form.username" required minlength="3" /></label>
        <label>Parola <input v-model="form.password" type="password" required minlength="6" /></label>
        <label>
          Rol
          <select v-model="form.role">
            <option value="admin">Yönetici</option>
            <option value="viewer">İzleyici</option>
          </select>
        </label>
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
  width: min(360px, 90vw);
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
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.form-error {
  color: #b91c1c;
  margin: 0;
}
</style>
