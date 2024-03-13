import PlayersView from "@/views/PlayersView.vue";
import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "players",
      component: PlayersView,
    },
    {
      path: "/playing",
      name: "playing",
      component: () => import("@/views/PlayingView.vue"),
    },
    {
      path: "/stats",
      name: "stats",
      component: () => import("@/views/StatsView.vue"),
    },
  ],
});

export default router;
