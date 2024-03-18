import { createVuetify } from "vuetify";
import { md1 } from "vuetify/blueprints";
import "vuetify/styles";

import "@mdi/font/css/materialdesignicons.css";
import { createApp } from "vue";
import { mdi } from "vuetify/iconsets/mdi";
import App from "./App.vue";
import router from "./router";

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
