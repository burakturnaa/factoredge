import { defineStore } from "pinia";
import { api } from "../services/api";
import type { AuthUser } from "../types";

interface ManagedUser extends AuthUser {
  createdAt: string;
}

export const useUsersStore = defineStore("users", {
  state: () => ({
    users: [] as ManagedUser[],
  }),
  actions: {
    async fetchAll(): Promise<void> {
      this.users = await api.get<ManagedUser[]>("/api/users");
    },
    async create(payload: { username: string; password: string; role: "admin" | "viewer" }): Promise<void> {
      const user = await api.post<AuthUser>("/api/users", payload);
      this.users.push({ ...user, createdAt: new Date().toISOString() });
    },
    async remove(id: string): Promise<void> {
      await api.delete(`/api/users/${id}`);
      this.users = this.users.filter((u) => u.id !== id);
    },
  },
});
