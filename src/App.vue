<script lang="ts">
import AddPlayer from "@/components/AddPlayer.vue";
import GetScenario from "@/components/GetScenario.vue";
import Reset from "@/components/Reset.vue";
import { RouterView } from "vue-router";
import { useTheme } from "vuetify";

export default {
  setup() {
    const theme = useTheme();
    return {
      theme,
    };
  },

  components: {
    AddPlayer,
    GetScenario,
    Reset,
  },

  methods: {
    toggleTheme() {
      this.theme.global.name.value = this.theme.global.current.value.dark
        ? "light"
        : "dark";
    },
  },
};
</script>

<template>
  <v-app class="rounded rounded-md">
    <v-app-bar class="d-flex">
      <v-btn @click="toggleTheme" icon="mdi-brightness-4"></v-btn>

      <AddPlayer v-if="$route.name === 'players'"></AddPlayer>
      <GetScenario v-if="$route.name === 'playing'"></GetScenario>
      <Reset v-if="$route.name === 'stats'"></Reset>
    </v-app-bar>

    <v-main
      class="d-flex align-center justify-center"
      style="min-height: 300px"
    >
      <router-view></router-view>
    </v-main>

    <v-bottom-navigation>
      <v-btn value="players" to="/">
        <v-icon>mdi-account-multiple</v-icon>
        <span>Players</span>
      </v-btn>

      <v-btn value="playing" to="/playing">
        <v-icon>mdi-progress-helper</v-icon>
        <span>Playing</span>
      </v-btn>

      <v-btn value="stats" to="/stats">
        <v-icon>mdi-database</v-icon>
        <span>Stats</span>
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>

<style></style>
