import { db } from "./db";
import { computeStatistics, type PlayerStatistics } from "./history";
import type { Double, Result, Single } from "./scenarios";
import type { StatsMode } from "./statsMode";
import { from, useObservable } from "@vueuse/rxjs";
import { liveQuery } from "dexie";

export type StatsRow = { player: string } & PlayerStatistics;

export const percentFormat = new Intl.NumberFormat("fi-FI", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  minimumIntegerDigits: 1,
});

/** finished singles and doubles, live from the database */
export function useFinishedResults() {
  return useObservable(
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
  );
}

export function winningRatioFor(row: PlayerStatistics, mode: StatsMode): number {
  if (mode === "Games") return row.winningRatio.games;
  if (mode === "Points") return row.winningRatio.points;
  if (mode === "Single") return row.winningRatio.singles;
  return row.winningRatio.doubles;
}

/** one row per player, best winning ratio for the mode first */
export function statsRows(
  byPlayer: Map<string, PlayerStatistics>,
  mode: StatsMode
): StatsRow[] {
  return [...byPlayer.entries()]
    .map(([player, row]) => ({ player, ...row }))
    .sort((a, b) => winningRatioFor(b, mode) - winningRatioFor(a, mode));
}

export function statsByPlayer(results: Result[] | undefined) {
  return computeStatistics(results ?? []);
}
