<script lang="ts">
import GameParticipant from "@/components/GameParticipant.vue";
import type { PropType } from "vue";

export type Game = { id: number; players: string[] | [string, string][] };

export default {
  components: {
    GameParticipant,
  },
  props: {
    game: {
      type: <PropType<Game>>Object,
      required: true,
    },
  },
};
</script>

<template>
  <v-card>
    <v-card-title
      ><h6 class="text-uppercase font-weight-thin">
        {{
          game && Array.isArray(game.players[0]) ? "Double game" : "Single game"
        }}
      </h6>
    </v-card-title>
    <v-card-text>
      <GameParticipant :game="game.id" :player="game.players[0]" />
      <v-divider class="mb-4"></v-divider>
      <GameParticipant :game="game.id" :player="game.players[1]" />
    </v-card-text>
  </v-card>
</template>

<style></style>
