<script lang="ts">
import { db } from "@/shared/db";
import { computeStatistics } from "@/shared/history";
import type { Double, Single } from "@/shared/scenarios";
import { from, useObservable } from "@vueuse/rxjs";
import { liveQuery } from "dexie";
import { ref } from "vue";

export default {
  setup() {
    return {
      results: useObservable(
        from(
          liveQuery(() =>
            db.results
              .where("[type+finished]")
              .anyOf([
                [<Single["type"]>"single", 1],
                [<Double["type"]>"double", 1],
              ])
              .toArray()
          )
        )
      ),
      percentFormat: ref(
        new Intl.NumberFormat("fi-FI", {
          style: "percent",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
          minimumIntegerDigits: 1,
        })
      ),
      mode: ref<"games" | "points">("games"),
    };
  },

  computed: {
    rows() {
      const byPlayer = computeStatistics(this.results ?? []);
      return [...byPlayer.entries()]
        .map(([player, row]) => ({
          player,
          ...row,
        }))
        .sort((a, b) => b.winningRatio[this.mode] - a.winningRatio[this.mode]);
    },
  },
};
</script>

<template>
  <div class="d-flex-row" v-if="rows.length > 0">
    <v-switch
      v-model="mode"
      false-value="games"
      true-value="points"
      color="primary"
      label="Show points"
    ></v-switch>
    <v-table class="stats">
      <thead>
        <tr>
          <th class="text-left">Player</th>
          <th class="text-left">Single {{ mode }}</th>
          <!-- <th class="text-left">Singles wins</th> -->
          <th class="text-left">Doubles {{ mode }}</th>
          <!-- <th class="text-left">Doubles wins</th> -->
          <!-- <th class="text-left">Played</th> -->
          <th class="text-left">Winning</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in rows" :key="item.player">
          <td>{{ item.player }}</td>
          <td>
            {{
              mode === "games"
                ? item.singles.played
                : item.singles.points.played
            }}
          </td>
          <!-- <td>{{ item.singlesWon }}</td> -->
          <td>
            {{
              mode === "games"
                ? item.doubles.played
                : item.doubles.points.played
            }}
          </td>
          <!-- <td>{{ item.doublesWon }}</td> -->
          <!-- <td>{{ item.played }}</td> -->
          <td>{{ percentFormat.format(item.winningRatio[mode]) }}</td>
        </tr>
      </tbody>
    </v-table>
  </div>
  <div v-else>No games played yet</div>
</template>

<style>
.stats {
  min-width: 380px;
}
</style>
