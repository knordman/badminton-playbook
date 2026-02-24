import { computeAllScenarios, computeNextScenario } from "@/shared/compute";
import { db, numberOfFieldsSettingId, playersContextId } from "@/shared/db";
import {
  getActiveContext,
  type Double,
  type FinishedGame,
  type Game,
  type OngoingGameWithPoints,
  type Scenario,
  type Single,
} from "./scenarios";

export type WorkerRequest = { type: "compute" } | { type: "next" };
export type WorkerResponse =
  | { type: "computed"; total: number }
  | { type: "swapped" };

function findPointsForPlayer(context: {
  player: string | [string, string];
  result: OngoingGameWithPoints;
  game: Single | Double;
}): number {
  for (const data of Object.values(context.result.participants)) {
    if (Array.isArray(context.player)) {
      if (
        data.players.includes(context.player[0]) &&
        data.players.includes(context.player[1])
      ) {
        return data.points;
      }
    } else {
      if (data.players.includes(context.player)) {
        return data.points;
      }
    }
  }

  throw new Error(
    `could not find points for game ${context.result.id
    } and player ${JSON.stringify(context.player)}`
  );
}

let alternatives: Scenario[] = [];
let currentIndex = 0;

async function writeScenarioToPlaying(scenario: Scenario) {
  await db.transaction("rw", [db.playing], async () => {
    await db.playing.clear();
    for (const game of scenario) {
      await db.playing.add(game);
    }
  });
}

self.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type === "next") {
    if (alternatives.length > 0) {
      currentIndex = (currentIndex + 1) % alternatives.length;
      await writeScenarioToPlaying(alternatives[currentIndex]);
    }
    self.postMessage({ type: "swapped" } satisfies WorkerResponse);
    return;
  }

  const [players, activeContext, gameIdsForPreviousScenario, history] =
    await db.transaction(
      "rw",
      [db.players, db.results, db.playing, db.context, db.settings],
      async () => {
        const players = await db.players.toArray();
        const numberOfFields = await db.settings.get(numberOfFieldsSettingId);
        const activeContext = getActiveContext(
          players.map((p) => p.name),
          numberOfFields?.value ?? 2
        );
        const playing = await db.playing.toArray();
        const storedResults = await db.results.toArray();

        const finished: FinishedGame[] = [];
        const writeResults: FinishedGame[] = [];
        const previousGames = new Map(playing.map((p) => [p.id!, p]));

        const currentRound =
          storedResults.length > 0
            ? Math.max(...storedResults.map((r) => (r as { round?: number }).round ?? 0)) + 1
            : 1;

        for (const result of storedResults) {
          if (result.finished) {
            finished.push(result);
          } else {
            if (result.type !== "break") {
              const game = previousGames.get(result.id)!;
              if (game && game.type !== "break") {
                const typedGamePlayers =
                  game.type === "single"
                    ? { type: game.type, players: game.players }
                    : { type: game.type, players: game.players };

                writeResults.push({
                  id: result.id,
                  finished: 1,
                  round: currentRound,
                  ...typedGamePlayers,
                  points: [
                    findPointsForPlayer({
                      player: game.players[0],
                      game,
                      result,
                    }),
                    findPointsForPlayer({
                      player: game.players[1],
                      game,
                      result,
                    }),
                  ],
                });
              }
            }
          }
        }

        for (const game of playing) {
          if (game.type === "break") {
            writeResults.push({
              id: game.id!,
              type: "break",
              finished: 1,
              round: currentRound,
              players: game.players,
            });
          }
        }

        await db.results.bulkPut(writeResults);
        await db.playing.clear();

        return [
          players.map((p) => p.name),
          activeContext!,
          new Set(previousGames.keys()),
          [...finished, ...writeResults],
        ];
      }
    );

  const numberOfFields = await db.settings.get(numberOfFieldsSettingId);
  const allScenarios = computeAllScenarios(
    players,
    numberOfFields?.value ?? 2
  );
  const result = computeNextScenario({
    allScenarios,
    gameIdsForPreviousScenario,
    history,
  });

  alternatives = result.alternatives;
  currentIndex = alternatives.indexOf(result.chosen);
  if (currentIndex === -1) currentIndex = 0;

  await db.transaction("rw", [db.playing, db.context], async () => {
    for (const game of result.chosen) {
      await db.playing.add(game);
    }
    await db.context.put({
      id: playersContextId,
      value: activeContext,
    });
  });

  self.postMessage({
    type: "computed",
    total: alternatives.length,
  } satisfies WorkerResponse);
});
