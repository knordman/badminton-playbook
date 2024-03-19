import { createVuetify } from "vuetify";
import { md1 } from "vuetify/blueprints";
import "vuetify/styles";

import App from "@/App.vue";
import router from "@/router";
import { createBadmintonDebug, type BadmintonDebug } from "@/shared/debug";
import "@mdi/font/css/materialdesignicons.css";
import { createApp } from "vue";
import { mdi } from "vuetify/iconsets/mdi";

declare global {
  interface Window {
    badminton: BadmintonDebug;
  }
}

window.badminton = createBadmintonDebug();

const app = createApp(App);
const vuetify = createVuetify({
  blueprint: md1,
  theme: {
    // defaultTheme: "dark",
  },
  icons: {
    defaultSet: "mdi",
    sets: {
      mdi,
    },
  },
});

app.use(router);
app.use(vuetify);

app.mount("#app");
