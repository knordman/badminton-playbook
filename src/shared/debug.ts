import { db } from "@/shared/db";

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
