<script lang="ts">
import { db } from "@/shared/db";
import { from, useObservable } from "@vueuse/rxjs";
import { liveQuery } from "dexie";

export default {
  setup() {
    return {
      players: useObservable(from(liveQuery(() => db.players.toArray()))),
    };
  },

  methods: {
    async removePlayer(name: string, event: Event) {
      if (
        event.target instanceof HTMLElement &&
        event.target.classList.contains("mdi-close")
      ) {
        await db.players.delete(name);
      }
    },
  },
};
</script>

<template>
  <div v-if="players && players.length > 0">
    <v-list class="list-of-players">
      <v-list-item
        v-for="player of players"
        :key="player.name"
        :title="player.name"
        append-icon="mdi-close"
        @click="removePlayer(player.name, $event)"
      ></v-list-item>
    </v-list>
  </div>
  <div v-else class="fallback">No players added yet</div>
</template>

<style>
.list-of-players {
  min-width: 350px;
}
</style>
