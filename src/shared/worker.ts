import { computeAllScenarios, computeNextScenario } from "@/shared/compute";
import { db, playersContextId, type PlayersContext } from "@/shared/db";
import type { BreakResult } from "./scenarios";

export type ScenariosRequest = {
  playersContext: PlayersContext["value"];
};
export type ScenariosResponse = { finished: boolean };

self.addEventListener(
  "message",
  async (event: MessageEvent<ScenariosRequest>) => {
    const [players, previous] = await db.transaction(
      "rw",
      [db.players, db.results, db.playing],
      async () => {
        const players = (await db.players.toArray()).map((p) => p.name);
        const playing = await db.playing.toArray();

        // write break result
        let breaks: BreakResult | undefined;
        for (const game of playing) {
          if (game.type === "break") {
            breaks = {
              type: "break",
              players: game.players,
              playing: game.id!,
            };
          }
        }
        if (breaks) {
          await db.results.put(breaks);
        }

        await db.playing.clear();

        return [players, playing];
      }
    );

    const results = await db.results.toArray();

    const allScenarios = computeAllScenarios(players);
    const next = computeNextScenario({
      allScenarios,
      previous,
      history: results,
    });

    await db.transaction("rw", [db.playing, db.context], async () => {
      for (const part of next) {
        await db.playing.add(part);
      }
      await db.context.put({
        id: playersContextId,
        value: event.data.playersContext,
      });
    });

    self.postMessage({ finished: true } satisfies ScenariosResponse);
  }
);
