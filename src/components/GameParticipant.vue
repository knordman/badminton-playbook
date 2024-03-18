<script lang="ts">
import { db } from "@/shared/db";
import type { PropType } from "vue";
import { ref } from "vue";

export default {
  setup() {
    return {
      points: ref<number | undefined>(undefined),
      pointsErrors: ref<boolean>(false),
    };
  },
  props: {
    game: {
      type: <PropType<number>>Number,
      required: true,
    },
    player: {
      type: <PropType<string | string[]>>[String, Array],
      required: true,
    },
  },
  computed: {
    name(): string {
      return Array.isArray(this.player) ? this.player.join(" & ") : this.player;
    },
  },
  watch: {
    async game() {
      await this.getStoredPoints();
    },
  },
  async mounted() {
    await this.getStoredPoints();
  },
  methods: {
    async storePoints(event: Event) {
      if (
        event.target &&
        "value" in event.target &&
        typeof event.target.value === "string"
      ) {
        const asNumber = parseInt(event.target.value);
        const value =
          event.target.value === "" || !(isFinite(asNumber) && asNumber >= 0)
            ? false
            : asNumber;

        if (value === false) {
          this.pointsErrors = event.target.value !== "";
          await db.transaction("rw", db.results, async () => {
            let stored = await db.results.get(this.game);
            if (stored) {
              delete stored.players[this.name];
              await db.results.put(stored);
            }
          });
        } else {
          this.pointsErrors = false;
          await db.transaction("rw", db.results, async () => {
            const result = {
              points: asNumber,
              players: Array.isArray(this.player)
                ? [...this.player]
                : [this.player],
            };
            let stored = await db.results.get(this.game);
            if (!stored) {
              stored = {
                playing: this.game,
                players: {
                  [this.name]: result,
                },
              };
            } else {
              stored.players[this.name] = result;
            }
            await db.results.put(stored);
          });
        }
      }
    },
    async getStoredPoints() {
      const storedResult = await db.results.get(this.game);
      if (storedResult && storedResult.players[this.name]) {
        this.points = storedResult.players[this.name].points;
      } else {
        // clear points when game changes
        this.points = undefined;
      }
    },
  },
};
</script>

<template>
  <div class="grid-container mx-2">
    <h3 class="text-h5 text-truncate font-weight-thin pt-3">
      {{ name }}
    </h3>
    <v-text-field
      v-model="points"
      type="number"
      variant="outlined"
      label="Points"
      placeHolder="0"
      :error="pointsErrors"
      @input="storePoints"
    ></v-text-field>
  </div>
</template>

<style>
.grid-container {
  display: grid;
  grid-template-columns: 70% 1fr;
  grid-template-rows: auto;
}
</style>
