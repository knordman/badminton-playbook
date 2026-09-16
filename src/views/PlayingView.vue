<script lang="ts">
import Break from "@/components/Break.vue";
import Game from "@/components/Game.vue";
import { db, playersContextId } from "@/shared/db";
import type * as Scenario from "@/shared/scenarios";
import { isPlayable, playsSingles } from "@/shared/scenarios";
import { from, useObservable } from "@vueuse/rxjs";
import { liveQuery } from "dexie";

export default {
  setup() {
    return {
      playing: useObservable(from(liveQuery(() => db.playing.toArray()))),
      players: useObservable(from(liveQuery(() => db.players.toArray()))),
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
    numberOfPlayers(): number {
      return this.players?.length ?? 0;
    },
    numberOfSinglesEligible(): number {
      return this.players?.filter(playsSingles).length ?? 0;
    },
    /** 2 or 3 players, of whom too few play singles - no other shape fits */
    tooFewForSingles(): boolean {
      return (
        this.numberOfPlayers >= 2 &&
        this.numberOfPlayers <= 3 &&
        this.numberOfSinglesEligible < 2
      );
    },
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
      return isPlayable(this.numberOfPlayers, this.numberOfSinglesEligible);
    },
  },
};
</script>

<template>
  <div class="flex-column">
    <div v-if="playing && playing.length > 0">
      <Break v-if="breaks.length > 0" class="ma-2" :persons="breaks.map((b) => b.players).flat()" />
      <Game v-for="game in singles" class="ma-2" :game="game" />
      <Game v-for="game in doubles" class="ma-2" :game="game" />
    </div>
    <div v-else-if="storedContext"></div>
    <div class="mx-4 text-center" v-else-if="playable()">
      Press start to generate game plan
    </div>
    <div class="mx-4 text-center" v-else-if="tooFewForSingles">
      With {{ numberOfPlayers }} players a single is the only game that fits, so
      at least 2 of them have to play singles
    </div>
    <div class="mx-4 text-center" v-else>
      Add between 2 and 11 players to generate game plan. There
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
