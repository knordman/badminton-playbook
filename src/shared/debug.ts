import { db } from "@/shared/db";
import {
  addOne,
  computeAllScenarios,
  computeNextScenario,
  gameKey,
  pairKey,
  type Context,
} from "./compute";

export interface BadmintonDebug {
  printStructuresForTest: () => Promise<void>;
}

export function createBadmintonDebug(): BadmintonDebug {
  return {
    printStructuresForTest: async () => {
      const [players, history] = await db.transaction(
        "r",
        [db.players, db.results],
        async () => {
          const players = await db.players.toArray();
          const results = await db.results.toArray();

          return [
            players.map((p) => p.name),
            results.filter((r) => r.finished === 1),
          ];
        }
      );

      console.log(JSON.stringify(players, undefined, 4));
      console.log(JSON.stringify(history, undefined, 4));
    },
  };
}

export function consoleLogHistory(
  history: Context["history"],
  show: {
    gamesPlayed?: boolean;
    numberOfGamesByPair?: boolean;
    numberOfBreaksByPlayer?: boolean;
    numberOfSinglesByPlayer?: boolean;
    numberOfDoublesByPlayer?: boolean;
  } = {
    gamesPlayed: true,
    numberOfBreaksByPlayer: true,
    numberOfDoublesByPlayer: true,
    numberOfGamesByPair: true,
    numberOfSinglesByPlayer: true,
  }
): void {
  const numberOfBreaksByPlayer = new Map<string, number>();
  const numberOfSinglesByPlayer = new Map<string, number>();
  const numberOfDoublesByPlayer = new Map<string, number>();
  const numberOfGamesByPair = new Map<string, number>();
  const gamesPlayed = new Map<string, number>();

  for (const [index, result] of history.entries()) {
    if (result.type === "break") {
      for (const player of result.players) {
        addOne(numberOfBreaksByPlayer, player);
      }
    } else {
      const bucket =
        result.type === "single"
          ? numberOfSinglesByPlayer
          : numberOfDoublesByPlayer;
      for (const player of result.players.flat()) {
        addOne(bucket, player);
      }

      addOne(gamesPlayed, gameKey(result));

      if (result.type === "double") {
        const pairOneKey = pairKey(result.players[0]);
        const pairTwoKey = pairKey(result.players[1]);
        addOne(numberOfGamesByPair, pairOneKey);
        addOne(numberOfGamesByPair, pairTwoKey);
      }
    }
  }

  if (show.gamesPlayed) {
    console.table(
      [...gamesPlayed.entries()].map(([Game, TimesPlayed]) => ({
        Game,
        TimesPlayed,
      }))
    );
  }

  if (show.numberOfGamesByPair) {
    console.table(
      [...numberOfGamesByPair.entries()].map(([Pair, TimesPlayed]) => ({
        Pair,
        TimesPlayed,
      }))
    );
  }

  if (show.numberOfBreaksByPlayer) {
    console.table(
      [...numberOfBreaksByPlayer.entries()].map(([Player, Breaks]) => ({
        Player,
        Breaks,
      }))
    );
  }

  if (show.numberOfSinglesByPlayer) {
    console.table(
      [...numberOfSinglesByPlayer.entries()].map(([Player, Singles]) => ({
        Player,
        Singles,
      }))
    );
  }

  if (show.numberOfDoublesByPlayer) {
    console.table(
      [...numberOfDoublesByPlayer.entries()].map(([Player, Doubles]) => ({
        Player,
        Doubles,
      }))
    );
  }
}

export function generateHistory(spec: {
  players: string[];
  numberOfFields: 1 | 2;
  rounds: number;
}): Context["history"] {
  const output: Context["history"] = [];
  const allScenarios = computeAllScenarios(spec.players, spec.numberOfFields);

  let gameIndex = 0;
  let previousGames = new Set<number>();

  for (let round = 1; round <= spec.rounds; round++) {
    const next = computeNextScenario({
      allScenarios,
      gameIdsForPreviousScenario: previousGames,
      history: output,
    });

    previousGames = new Set();

    for (const game of next) {
      if (game.type === "break") {
        const id = gameIndex++;
        previousGames.add(id);
        output.push({
          finished: 1,
          id,
          players: game.players,
          type: game.type,
        });
      } else if (game.type === "single") {
        const id = gameIndex++;
        previousGames.add(id);
        output.push({
          finished: 1,
          id,
          players: game.players,
          points: [1, 1],
          type: game.type,
        });
      } else if (game.type === "double") {
        const id = gameIndex++;
        previousGames.add(id);
        output.push({
          finished: 1,
          id,
          players: game.players,
          points: [1, 1],
          type: game.type,
        });
      }
    }
  }

  return output;
}
