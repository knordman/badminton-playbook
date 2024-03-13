<script lang="ts">
import { gameIsFinished } from "@/components/GetScenario.vue";
import { db } from "@/shared/db";
import { from, useObservable } from "@vueuse/rxjs";
import { liveQuery } from "dexie";

type Row = {
  singles: number;
  singlesWon: number;
  doubles: number;
  doublesWon: number;
  winningPercent: number;
  played: number;
};

export default {
  setup() {
    return {
      results: useObservable(
        from(
          liveQuery(() => db.results.toArray())
        )
      ),
    };
  },

  computed: {
    rows() {
      const byPlayer = new Map<string, Row>();
      for (const result of this.results ?? []) {
        if (gameIsFinished(result)) {
          const participants = Object.keys(result.players);
          const winner =
            result.players[participants[0]].points >
            result.players[participants[1]].points
              ? participants[0]
              : result.players[participants[1]].points >
                result.players[participants[0]].points
              ? participants[1]
              : undefined;

          for (const [participant, data] of Object.entries(result.players)) {
            for (const player of data.players) {
              let bucket = byPlayer.get(player);
              if (!bucket) {
                bucket = {
                  doubles: 0,
                  doublesWon: 0,
                  singles: 0,
                  singlesWon: 0,
                  winningPercent: 0,
                  played: 0,
                };
                byPlayer.set(player, bucket);
              }
              if (data.players.length == 1) {
                bucket.singles++;
                if (winner === participant) {
                  bucket.singlesWon++;
                }
              } else {
                bucket.doubles++;
                if (winner === participant) {
                  bucket.doublesWon++;
                }
              }
            }
          }
        }
      }

      for (const row of byPlayer.values()) {
        row.winningPercent = Math.round(
          ((row.singlesWon + row.doublesWon) / (row.singles + row.doubles)) *
            100.0
        );
        row.played = row.singles + row.doubles;
      }

      return [...byPlayer.entries()]
        .map(([player, row]) => ({
          player,
          ...row,
        }))
        .sort((a, b) => b.winningPercent - a.winningPercent);
    },
  },
};
</script>

<template>
  <v-table v-if="rows.length > 0">
    <thead>
      <tr>
        <th class="text-left">Player</th>
        <th class="text-left">Singles played</th>
        <!-- <th class="text-left">Singles wins</th> -->
        <th class="text-left">Doubles played</th>
        <!-- <th class="text-left">Doubles wins</th> -->
        <!-- <th class="text-left">Played</th> -->
        <th class="text-left">Winning %</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in rows" :key="item.player">
        <td>{{ item.player }}</td>
        <td>{{ item.singles }}</td>
        <!-- <td>{{ item.singlesWon }}</td> -->
        <td>{{ item.doubles }}</td>
        <!-- <td>{{ item.doublesWon }}</td> -->
        <!-- <td>{{ item.played }}</td> -->
        <td>{{ item.winningPercent }}</td>
      </tr>
    </tbody>
  </v-table>
  <div v-else>No games played yet</div>
</template>

<style></style>
