import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth.store";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", name: "login", component: () => import("../views/LoginPage.vue"), meta: { public: true } },
    { path: "/", name: "dashboard", component: () => import("../views/DashboardPage.vue") },
    { path: "/history", name: "history", component: () => import("../views/HistoryPage.vue") },
    { path: "/devices", name: "devices", component: () => import("../views/DevicesPage.vue"), meta: { adminOnly: true } },
    { path: "/users", name: "users", component: () => import("../views/UsersPage.vue"), meta: { adminOnly: true } },
  ],
});

// Bu sadece UX içindir — gerçek yetki kontrolü backend'de (401/403) yapılır.
router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: "login" };
  }
  if (to.meta.adminOnly && !auth.isAdmin) {
    return { name: "dashboard" };
  }
  if (to.name === "login" && auth.isAuthenticated) {
    return { name: "dashboard" };
  }
  return true;
});

export default router;
