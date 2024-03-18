<script lang="ts">
import Break from "@/components/Break.vue";
import Game from "@/components/Game.vue";
import { playersContextId } from "@/components/GetScenario.vue";
import { db } from "@/shared/db";
import type * as Scenario from "@/shared/scenario";
import { isPlayable } from "@/shared/scenario";
import { from, useObservable } from "@vueuse/rxjs";
import { liveQuery } from "dexie";

export default {
  setup() {
    return {
      playing: useObservable(from(liveQuery(() => db.playing.toArray()))),
      numberOfPlayers: useObservable(from(liveQuery(() => db.players.count()))),
      storedContext: useObservable(
        from(liveQuery(() => db.context.get(playersContextId)))
      ),
    };
  },
  components: {
    Game,
    Break,
  },
  computed: {
    breaks() {
      return (
        this.playing?.filter((p): p is Scenario.Break => p.type === "break") ??
        []
      );
    },
    singles() {
      return (
        this.playing?.filter(
          (p): p is Scenario.Single & { id: number } => p.type === "single"
        ) ?? []
      );
    },
    doubles() {
      return (
        this.playing?.filter(
          (p): p is Scenario.Double & { id: number } => p.type === "double"
        ) ?? []
      );
    },
  },
  methods: {
    playable() {
      return this.numberOfPlayers && isPlayable(this.numberOfPlayers);
    },
  },
};
</script>

<template>
  <div class="flex-column">
    <div v-if="playing && playing.length > 0">
      <Break
        v-if="breaks.length > 0"
        class="ma-2"
        :persons="breaks.map((b) => b.players).flat()"
      />
      <Game v-for="game in singles" class="ma-2" :game="game" />
      <Game v-for="game in doubles" class="ma-2" :game="game" />
    </div>
    <div v-else-if="storedContext"></div>
    <div v-else-if="playable()">Press start to generate game plan</div>
    <div v-else>
      Add between 2 and 9 players to generate game plan. There
      {{
        numberOfPlayers === 1
          ? "is currently 1 player"
          : `are currently ${numberOfPlayers} players`
      }}
      added
    </div>
  </div>
</template>

<style></style>
