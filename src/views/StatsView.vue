<script lang="ts">
import { percentFormat, statsByPlayer, statsRows, useFinishedResults, winningRatioFor } from "@/shared/stats";
import { statsMode } from "@/shared/statsMode";

export default {
  setup() {
    return {
      results: useFinishedResults(),
      percentFormat,
      mode: statsMode,
    };
  },

  computed: {
    rows() {
      return statsRows(statsByPlayer(this.results), this.mode);
    },
  },

  methods: {
    winningRatioFor,
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
          <td>{{ percentFormat.format(winningRatioFor(item, mode)) }}</td>
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
