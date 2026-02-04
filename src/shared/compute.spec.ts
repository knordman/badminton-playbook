import { describe, expect, it } from "vitest";
import {
  computeAllScenarios,
  computeNextScenario,
  findMinMax,
  projectProfile,
  type Context,
} from "./compute";
import { consoleLogHistory } from "./debug";
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
      const allScenarios = computeAllScenarios(players, 2);

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
      const allScenarios = computeAllScenarios(players, 2);

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
      const allScenarios = computeAllScenarios(players, 2);

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
      // console.log("doubles", doubles);

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

    it("generates single game for 1 field", () => {
      const players = ["A", "B", "C", "D"];
      const allScenarios = computeAllScenarios(players, 1);

      expect(allScenarios.length).toBeGreaterThan(0);
      for (const scenario of allScenarios) {
        expect(scenario.length).toBe(1);
        expect(scenario[0].type).toBe("double");
      }
    });

    it("pauses 3 players for 7 players on 1 field", () => {
      const players = ["A", "B", "C", "D", "E", "F", "G"];
      const allScenarios = computeAllScenarios(players, 1);

      expect(allScenarios.length).toBeGreaterThan(0);
      for (const scenario of allScenarios) {
        const breakGame = scenario.find((g) => g.type === "break");
        expect(breakGame).toBeDefined();
        expect(breakGame!.players.length).toBe(3);

        // Should have exactly 1 double game (4 players) + 1 break (3 players) = 7 players
        const doubleGame = scenario.find((g) => g.type === "double");
        expect(doubleGame).toBeDefined();
        expect(scenario.length).toBe(2); // 1 break + 1 double
      }
    });

    it("avoids repeating same game on single field", () => {
      const players = ["A", "B", "C", "D"];
      const allScenarios = computeAllScenarios(players, 1);

      const next = computeNextScenario({
        allScenarios,
        history: [
          {
            id: 44,
            finished: 1,
            type: "double",
            players: [
              ["A", "D"],
              ["B", "C"],
            ],
            points: [11, 1],
          },
          {
            id: 45,
            finished: 1,
            type: "double",
            players: [
              ["A", "B"],
              ["C", "D"],
            ],
            points: [11, 1],
          },
          {
            id: 46,
            finished: 1,
            type: "double",
            players: [
              ["A", "C"],
              ["B", "D"],
            ],
            points: [11, 1],
          },
        ],
        gameIdsForPreviousScenario: new Set([46]),
      });

      // console.log(JSON.stringify(next, undefined, 4));
      expect(next).toBeDefined();
      expect(next[0].players).not.to.deep.equal([
        ["A", "C"],
        ["B", "D"],
      ]);
    });

    it("does not break same player in a row", () => {
      const players = ["A", "B", "C", "D", "E", "F", "G"];
      const allScenarios = computeAllScenarios(players, 2);
      const history = [
        {
          id: 14,
          type: "break",
          finished: 1,
          players: ["C"],
        },
        {
          id: 15,
          finished: 1,
          type: "single",
          players: ["B", "D"],
          points: [11, 4],
        },
        {
          id: 16,
          finished: 1,
          type: "double",
          players: [
            ["A", "E"],
            ["G", "F"],
          ],
          points: [10, 12],
        },
        {
          id: 17,
          type: "break",
          finished: 1,
          players: ["E"],
        },
        {
          id: 18,
          finished: 1,
          type: "single",
          players: ["A", "C"],
          points: [11, 5],
        },
        {
          id: 19,
          finished: 1,
          type: "double",
          players: [
            ["B", "D"],
            ["G", "F"],
          ],
          points: [4, 11],
        },
        {
          id: 20,
          type: "break",
          finished: 1,
          players: ["F"],
        },
        {
          id: 21,
          finished: 1,
          type: "single",
          players: ["E", "G"],
          points: [11, 8],
        },
        {
          id: 22,
          finished: 1,
          type: "double",
          players: [
            ["A", "C"],
            ["B", "D"],
          ],
          points: [11, 9],
        },
        {
          id: 23,
          type: "break",
          finished: 1,
          players: ["G"],
        },
        {
          id: 24,
          finished: 1,
          type: "single",
          players: ["F", "C"],
          points: [11, 6],
        },
        {
          id: 25,
          finished: 1,
          type: "double",
          players: [
            ["A", "E"],
            ["B", "D"],
          ],
          points: [11, 6],
        },
        {
          id: 26,
          type: "break",
          finished: 1,
          players: ["D"],
        },
        {
          id: 27,
          finished: 1,
          type: "single",
          players: ["E", "B"],
          points: [11, 8],
        },
        {
          id: 28,
          finished: 1,
          type: "double",
          players: [
            ["A", "C"],
            ["G", "F"],
          ],
          points: [11, 8],
        },
        {
          id: 29,
          type: "break",
          finished: 1,
          players: ["B"],
        },
        {
          id: 30,
          finished: 1,
          type: "single",
          players: ["F", "D"],
          points: [11, 6],
        },
        {
          id: 31,
          finished: 1,
          type: "double",
          players: [
            ["A", "C"],
            ["E", "G"],
          ],
          points: [9, 11],
        },
        {
          id: 32,
          type: "break",
          finished: 1,
          players: ["A"],
        },
        {
          id: 33,
          finished: 1,
          type: "single",
          players: ["G", "F"],
          points: [5, 11],
        },
        {
          id: 34,
          finished: 1,
          type: "double",
          players: [
            ["E", "D"],
            ["B", "C"],
          ],
          points: [11, 8],
        },
        {
          id: 35,
          type: "break",
          finished: 1,
          players: ["F"],
        },
        {
          id: 36,
          finished: 1,
          type: "single",
          players: ["A", "D"],
          points: [11, 3],
        },
        {
          id: 37,
          finished: 1,
          type: "double",
          players: [
            ["E", "G"],
            ["B", "C"],
          ],
          points: [9, 11],
        },
        {
          id: 38,
          type: "break",
          finished: 1,
          players: ["B"],
        },
        {
          id: 39,
          finished: 1,
          type: "single",
          players: ["A", "C"],
          points: [11, 6],
        },
        {
          id: 40,
          finished: 1,
          type: "double",
          players: [
            ["E", "G"],
            ["F", "D"],
          ],
          points: [12, 10],
        },
        {
          id: 41,
          type: "break",
          finished: 1,
          players: ["A"],
        },
        {
          id: 42,
          finished: 1,
          type: "single",
          players: ["E", "G"],
          points: [11, 5],
        },
        {
          id: 43,
          finished: 1,
          type: "double",
          players: [
            ["B", "C"],
            ["F", "D"],
          ],
          points: [11, 7],
        },
        {
          id: 44,
          type: "break",
          finished: 1,
          players: ["C"],
        },
        {
          id: 45,
          finished: 1,
          type: "single",
          players: ["B", "D"],
          points: [11, 7],
        },
        {
          id: 46,
          finished: 1,
          type: "double",
          players: [
            ["A", "E"],
            ["G", "F"],
          ],
          points: [11, 9],
        },
        {
          id: 47,
          type: "break",
          finished: 1,
          players: ["G"],
        },
        {
          id: 48,
          finished: 1,
          type: "single",
          players: ["F", "C"],
          points: [11, 8],
        },
        {
          id: 49,
          finished: 1,
          type: "double",
          players: [
            ["A", "B"],
            ["E", "D"],
          ],
          points: [6, 11],
        },
        {
          id: 50,
          type: "break",
          finished: 1,
          players: ["D"],
        },
        {
          id: 51,
          finished: 1,
          type: "single",
          players: ["E", "B"],
          points: [11, 5],
        },
        {
          id: 52,
          finished: 1,
          type: "double",
          players: [
            ["A", "G"],
            ["F", "C"],
          ],
          points: [14, 16],
        },
        {
          id: 53,
          type: "break",
          finished: 1,
          players: ["E"],
        },
        {
          id: 54,
          finished: 1,
          type: "single",
          players: ["A", "G"],
          points: [5, 11],
        },
        {
          id: 55,
          finished: 1,
          type: "double",
          players: [
            ["B", "F"],
            ["C", "D"],
          ],
          points: [11, 8],
        },
      ] satisfies Context["history"];

      const next = computeNextScenario({
        allScenarios,
        history,
        gameIdsForPreviousScenario: new Set([53, 54, 55]),
      });

      expect(next).toBeDefined();
      expect(next[0].players).not.to.deep.equal(["E"]);
    });
  });
});
