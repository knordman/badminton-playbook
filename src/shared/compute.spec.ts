import { describe, expect, it } from "vitest";
import {
  computeAllScenarios,
  computeNextScenario,
  findMinMax,
  projectProfile,
} from "./compute";
import { computeStatistics } from "./history";
import type { FinishedGame } from "./scenarios";

describe("Scenarios", () => {
  describe("Ranking", () => {
    it("projects profile to less items", () => {
      const profile = [-200, -100, 0, 0, 0];
      const items = ["a", "b", "c", "d"];

      const output = projectProfile({ items, profile, compressProfile: true });

      const expected = new Map([
        ["a", -200],
        ["b", (-2 / 3) * 100],
        ["c", 0],
        ["d", 0],
      ]);

      expect(output.size).to.equal(expected.size);
      for (const [key, value] of output.entries()) {
        expect(expected.get(key)).toBeCloseTo(value);
      }
    });

    it("projects profile to more items", () => {
      const profile = [0, 100];
      const items = ["a", "b", "c", "d"];

      const output = projectProfile({ items, profile });

      const expected = new Map([
        ["a", 0],
        ["b", (1 / 3) * 100],
        ["c", (2 / 3) * 100],
        ["d", 100],
      ]);

      expect(output.size).to.equal(expected.size);
      for (const [key, value] of output.entries()) {
        expect(expected.get(key)).toBeCloseTo(value);
      }
    });

    it("returns empty projection map for empty items", () => {
      const profile = [0, 100];
      const items = <string[]>[];

      const output = projectProfile({ items, profile });

      const expected = new Map();

      expect(output).to.deep.equal(expected);
    });
  });

  describe("Next scenario", () => {
    it("returns next scenario", () => {
      const players = ["A", "B", "C"];
      const allScenarios = computeAllScenarios(players);

      const next = computeNextScenario({
        allScenarios,
        history: [
          {
            id: 0,
            type: "break",
            finished: 1,
            players: ["C"],
          },
          {
            id: 1,
            type: "single",
            finished: 1,
            players: ["A", "B"],
            points: [0, 0],
          },
          {
            id: 2,
            type: "break",
            finished: 1,
            players: ["A"],
          },
          {
            id: 3,
            type: "single",
            finished: 1,
            players: ["C", "B"],
            points: [0, 0],
          },
          {
            id: 4,
            type: "break",
            finished: 1,
            players: ["B"],
          },
          {
            id: 5,
            type: "single",
            finished: 1,
            players: ["C", "A"],
            points: [0, 0],
          },
        ],
        gameIdsForPreviousScenario: new Set([4, 5]),
      });

      expect(next).toBeDefined();
      expect(next.find((s) => s.type === "break")?.players).to.deep.equal([
        "C",
      ]);
    });

    it("returns another next scenario", () => {
      const players = ["A", "B", "C", "D", "E", "F", "G", "H"];
      const allScenarios = computeAllScenarios(players);

      const next = computeNextScenario({
        allScenarios,
        history: [
          // 1
          {
            id: 255,
            finished: 1,
            type: "double",
            players: [
              ["A", "B"],
              ["C", "D"],
            ],
            points: [1, 1],
          },
          {
            id: 256,
            finished: 1,
            type: "double",
            players: [
              ["E", "F"],
              ["G", "H"],
            ],
            points: [1, 1],
          },
          // 2
          {
            id: 257,
            finished: 1,
            type: "double",
            players: [
              ["A", "B"],
              ["E", "F"],
            ],
            points: [2, 2],
          },
          {
            id: 258,
            finished: 1,
            type: "double",
            players: [
              ["C", "D"],
              ["G", "H"],
            ],
            points: [2, 2],
          },
          // 3
          {
            id: 259,
            finished: 1,
            type: "double",
            players: [
              ["A", "B"],
              ["G", "H"],
            ],
            points: [3, 3],
          },
          {
            id: 260,
            finished: 1,
            type: "double",
            players: [
              ["C", "D"],
              ["E", "F"],
            ],
            points: [3, 3],
          },
          // 4
        ],
        gameIdsForPreviousScenario: new Set([260, 259]),
      });

      // console.log(JSON.stringify(next, undefined, 4));
      expect(next).toBeDefined();
    });

    it("balances games", () => {
      const players = ["A", "B", "C", "D", "E", "F", "G"];
      const allScenarios = computeAllScenarios(players);

      const history: FinishedGame[] = [];

      let id = 0;
      const total = 14;
      let gameIdsForPreviousScenario: Set<number> | undefined;

      for (let i = 0; i < total; i++) {
        const next = computeNextScenario({
          allScenarios,
          history,
          gameIdsForPreviousScenario:
            gameIdsForPreviousScenario ?? new Set<number>(),
        });

        gameIdsForPreviousScenario = new Set<number>();
        for (const game of next) {
          if (game.type === "break") {
            const idGame = id++;
            gameIdsForPreviousScenario.add(idGame);
            history.push({
              type: "break",
              finished: 1,
              id: idGame,
              players: game.players,
            });
          } else if (game.type === "single") {
            const idGame = id++;
            gameIdsForPreviousScenario.add(idGame);
            history.push({
              type: "single",
              finished: 1,
              id: idGame,
              players: game.players,
              points: [11, 0],
            });
          } else {
            const idGame = id++;
            gameIdsForPreviousScenario.add(idGame);
            history.push({
              type: "double",
              finished: 1,
              id: idGame,
              players: game.players,
              points: [5, 11],
            });
          }
        }
      }

      const breaks = new Map(
        [...computeStatistics(history).entries()].map(([n, p]) => [
          n,
          total - p.played,
        ])
      );
      // console.log("break", breaks);

      const doubles = new Map(
        [...computeStatistics(history).entries()].map(([n, p]) => [
          n,
          p.doubles.played,
        ])
      );
      // console.log("doubles", doubles);a

      const singles = new Map(
        [...computeStatistics(history).entries()].map(([n, p]) => [
          n,
          p.singles.played,
        ])
      );
      // console.log("singles", singles);

      const breaksStats = findMinMax(breaks);
      const singlesStats = findMinMax(singles);
      const doublesStats = findMinMax(doubles);
      expect(breaksStats.max - breaksStats.min).to.be.lessThan(1);
      expect(singlesStats.max - singlesStats.min).to.be.lessThan(3);
      expect(doublesStats.max - doublesStats.min).to.be.lessThan(3);
    });
  });
});
