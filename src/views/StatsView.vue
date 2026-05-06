<script lang="ts">
import { db } from "@/shared/db";
import { computeStatistics } from "@/shared/history";
import type { Double, Single } from "@/shared/scenarios";
import { from, useObservable } from "@vueuse/rxjs";
import { liveQuery } from "dexie";
import { statsMode } from "@/shared/statsMode";

const percentFormat = new Intl.NumberFormat("fi-FI", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  minimumIntegerDigits: 1,
});

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
      percentFormat,
      mode: statsMode,
    };
  },

  computed: {
    winningRatio() {
      return (row: ReturnType<typeof computeStatistics> extends Map<string, infer V> ? V : never) => {
        const m = this.mode;
        if (m === "Games") return row.winningRatio.games;
        if (m === "Points") return row.winningRatio.points;
        if (m === "Single") return row.winningRatio.singles;
        return row.winningRatio.doubles;
      };
    },
    rows() {
      const byPlayer = computeStatistics(this.results ?? []);
      return [...byPlayer.entries()]
        .map(([player, row]) => ({
          player,
          ...row,
        }))
        .sort((a, b) => this.winningRatio(b) - this.winningRatio(a));
    },
  },
};
</script>

<template>
  <div class="d-flex-row" v-if="rows.length > 0">
    <v-table class="stats">
      <thead>
        <tr>
          <th class="text-left">Player</th>
          <template v-if="mode === 'Games' || mode === 'Points'">
            <th class="text-left">Single</th>
            <th class="text-left">Doubles</th>
          </template>
          <template v-else>
            <th class="text-left">Points</th>
            <th class="text-left">Games</th>
          </template>
          <th class="text-left">Winning</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in rows" :key="item.player">
          <td>{{ item.player }}</td>
          <template v-if="mode === 'Games'">
            <td>{{ item.singles.won }} / {{ item.singles.played }}</td>
            <td>{{ item.doubles.won }} / {{ item.doubles.played }}</td>
          </template>
          <template v-else-if="mode === 'Points'">
            <td>{{ item.singles.points.won }} / {{ item.singles.points.played }}</td>
            <td>{{ item.doubles.points.won }} / {{ item.doubles.points.played }}</td>
          </template>
          <template v-else-if="mode === 'Single'">
            <td>{{ item.singles.points.won }} / {{ item.singles.points.played }}</td>
            <td>{{ item.singles.won }} / {{ item.singles.played }}</td>
          </template>
          <template v-else>
            <td>{{ item.doubles.points.won }} / {{ item.doubles.points.played }}</td>
            <td>{{ item.doubles.won }} / {{ item.doubles.played }}</td>
          </template>
          <td>{{ percentFormat.format(winningRatio(item)) }}</td>
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

.stats table {
  table-layout: fixed;
}

.stats th {
  font-weight: bold !important;
}
</style>
