<script lang="ts">
import { db } from "@/shared/db";
import type { Double, Single } from "@/shared/scenarios";
import { from, useObservable } from "@vueuse/rxjs";
import { liveQuery } from "dexie";
import { ref } from "vue";

export type Row = {
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
    };
  },

  computed: {
    rows() {
      const byPlayer = new Map<string, Row>();
      for (const result of this.results ?? []) {
        if (result.finished && result.type !== "break") {
          const winner =
            result.points[0] > result.points[1]
              ? result.players[0]
              : result.points[1] > result.points[0]
              ? result.players[1]
              : undefined;

          const isWinner = (player: string): boolean => {
            if (winner) {
              return (
                (typeof winner === "string" && winner === player) ||
                winner.includes(player)
              );
            }
            return false;
          };

          for (const player of result.players.flat()) {
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
            if (result.type === "single") {
              bucket.singles++;
              if (isWinner(player)) {
                bucket.singlesWon++;
              }
            } else {
              bucket.doubles++;
              if (isWinner(player)) {
                bucket.doublesWon++;
              }
            }
          }
        }
      }

      for (const row of byPlayer.values()) {
        row.played = row.singles + row.doubles;
        row.winningPercent = (row.singlesWon + row.doublesWon) / row.played;
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
        <th class="text-left">Winning</th>
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
        <td>{{ percentFormat.format(item.winningPercent) }}</td>
      </tr>
    </tbody>
  </v-table>
  <div v-else>No games played yet</div>
</template>

<style></style>
