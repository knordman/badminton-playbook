import { fileURLToPath, URL } from "node:url";
import { VitePWA } from "vite-plugin-pwa";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import vuetify from "vite-plugin-vuetify";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/badminton-playbook/",
  publicDir: "public",
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "Badminton Playbook",
        description:
          "Generate the optimal badminton games for a set of players",
        theme_color: "#ffffff",
        display: "standalone",
        icons: [{ src: "icon.png", sizes: "256x256", type: "image/png" }],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
