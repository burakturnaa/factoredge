import { defineStore } from "pinia";
import type { AuthUser } from "../types";

const STORAGE_KEY = "factoredge.auth";

interface StoredAuth {
  token: string;
  user: AuthUser;
}

function loadStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore("auth", {
  state: () => {
    const stored = loadStoredAuth();
    return {
      token: stored?.token ?? null,
      user: stored?.user ?? null,
    } as { token: string | null; user: AuthUser | null };
  },
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    isAdmin: (state) => state.user?.role === "admin",
  },
  actions: {
    setSession(token: string, user: AuthUser): void {
      this.token = token;
      this.user = user;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    },
    logout(): void {
      this.token = null;
      this.user = null;
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});
