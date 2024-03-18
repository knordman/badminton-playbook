import { computeAllScenarios, computeNextScenario } from "@/shared/compute";
import { db, playersContextId } from "@/shared/db";
import {
  getActiveContext,
  type Double,
  type FinishedGame,
  type OngoingGameWithPoints,
  type Single,
} from "./scenarios";

export type WorkerRequest = {};
export type WorkerResponse = { finished: boolean };

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
    `could not find points for game ${
      context.result.id
    } and player ${JSON.stringify(context.player)}`
  );
}

self.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  const [players, activeContext, gameIdsForPreviousScenario, history] =
    await db.transaction(
      "rw",
      [db.players, db.results, db.playing, db.context],
      async () => {
        const players = await db.players.toArray();
        const activeContext = getActiveContext(players.map((p) => p.name));
        const playing = await db.playing.toArray();
        const storedResults = await db.results.toArray();

        const finished: FinishedGame[] = [];
        const writeResults: FinishedGame[] = [];
        const previousGames = new Map(playing.map((p) => [p.id!, p]));

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

  const allScenarios = computeAllScenarios(players);
  const next = computeNextScenario({
    allScenarios,
    gameIdsForPreviousScenario,
    history,
  });

  await db.transaction("rw", [db.playing, db.context], async () => {
    for (const game of next) {
      await db.playing.add(game);
    }
    await db.context.put({
      id: playersContextId,
      value: activeContext,
    });
  });

  self.postMessage({ finished: true } satisfies WorkerResponse);
});
