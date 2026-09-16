import { describe, expect, it } from "vitest";
import {
  addOne,
  computeAllScenarios,
  computeNextScenario,
  findMinMax,
  pairKey,
  projectProfile,
  type Context,
} from "./compute";
import { consoleLogHistory } from "./debug";
import { computeStatistics } from "./history";
import { isPlayable, type FinishedGame, type Scenario } from "./scenarios";

/**
 * Breaks or singles per player counted over `from` and later rounds only,
 * with an explicit 0 for players who got none.
 */
function countFromRound(spec: {
  history: FinishedGame[];
  players: string[];
  from: number;
  of: "break" | "single";
}): Map<string, number> {
  const counts = new Map(spec.players.map((player) => [player, 0]));
  for (const game of spec.history) {
    if (game.round < spec.from || game.type !== spec.of) {
      continue;
    }
    for (const player of game.players.flat()) {
      addOne(counts, player);
    }
  }
  return counts;
}

function playRounds(spec: {
  players: string[];
  numberOfFields: 1 | 2;
  rounds: number;
  /** who is there for a given round; by default every player, every round */
  attending?: (round: number) => string[];
  /** players who have opted out of singles; by default nobody */
  noSingles?: string[];
  /** who has opted out for a given round; overrides `noSingles` when given */
  optingOutAt?: (round: number) => string[];
}): FinishedGame[] {
  const history: FinishedGame[] = [];
  let id = 0;
  let gameIdsForPreviousScenario = new Set<number>();
  const optedOutSinglesByRound = new Map<number, ReadonlySet<string>>();

  const optedOutAt = (round: number) =>
    new Set(spec.optingOutAt?.(round) ?? spec.noSingles ?? []);

  // scenarios only depend on the roster and who plays singles in it
  const scenariosByRoster = new Map<string, Scenario[]>();
  const scenariosFor = (roster: string[], eligible: ReadonlySet<string>) => {
    const key = `${roster.join("-")}|${[...eligible].sort().join("-")}`;
    if (!scenariosByRoster.has(key)) {
      scenariosByRoster.set(
        key,
        computeAllScenarios(roster, spec.numberOfFields, eligible),
      );
    }
    return scenariosByRoster.get(key)!;
  };

  for (let round = 1; round <= spec.rounds; round++) {
    const roster = spec.attending?.(round) ?? spec.players;
    const optedOut = optedOutAt(round);
    const singlesEligible = new Set(
      roster.filter((player) => !optedOut.has(player)),
    );
    const { chosen } = computeNextScenario({
      allScenarios: scenariosFor(roster, singlesEligible),
      history,
      gameIdsForPreviousScenario,
      singlesEligible,
      optedOutSinglesByRound,
    });
    optedOutSinglesByRound.set(
      round,
      new Set(roster.filter((player) => optedOut.has(player))),
    );
    gameIdsForPreviousScenario = new Set<number>();
    for (const game of chosen) {
      const idGame = id++;
      gameIdsForPreviousScenario.add(idGame);
      if (game.type === "break") {
        history.push({
          type: "break",
          finished: 1,
          id: idGame,
          round,
          players: game.players,
        });
      } else {
        history.push({
          type: game.type,
          finished: 1,
          id: idGame,
          round,
          players: game.players,
          points: [11, 5],
        } as FinishedGame);
      }
    }
  }

  return history;
}

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

      const { chosen } = computeNextScenario({
        allScenarios,
        history: [
          {
            id: 0,
            type: "break",
            finished: 1,
            round: 1,
            players: ["C"],
          },
          {
            id: 1,
            type: "single",
            finished: 1,
            round: 1,
            players: ["A", "B"],
            points: [0, 0],
          },
          {
            id: 2,
            type: "break",
            finished: 1,
            round: 2,
            players: ["A"],
          },
          {
            id: 3,
            type: "single",
            finished: 1,
            round: 2,
            players: ["C", "B"],
            points: [0, 0],
          },
          {
            id: 4,
            type: "break",
            finished: 1,
            round: 3,
            players: ["B"],
          },
          {
            id: 5,
            type: "single",
            finished: 1,
            round: 3,
            players: ["C", "A"],
            points: [0, 0],
          },
        ],
        gameIdsForPreviousScenario: new Set([4, 5]),
      });

      expect(chosen).toBeDefined();
      expect(chosen.find((s) => s.type === "break")?.players).to.deep.equal([
        "C",
      ]);
    });

    it("returns another next scenario", () => {
      const players = ["A", "B", "C", "D", "E", "F", "G", "H"];
      const allScenarios = computeAllScenarios(players, 2);

      const { chosen } = computeNextScenario({
        allScenarios,
        history: [
          // 1
          {
            id: 255,
            finished: 1,
            round: 1,
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
            round: 1,
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
            round: 2,
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
            round: 2,
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
            round: 3,
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
            round: 3,
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

      // console.log(JSON.stringify(chosen, undefined, 4));
      expect(chosen).toBeDefined();
    });

    it("balances games", () => {
      const players = ["A", "B", "C", "D", "E", "F", "G"];
      const allScenarios = computeAllScenarios(players, 2);

      const history: FinishedGame[] = [];

      let id = 0;
      const total = 14;
      let gameIdsForPreviousScenario: Set<number> | undefined;

      for (let i = 0; i < total; i++) {
        const round = i + 1;
        const { chosen } = computeNextScenario({
          allScenarios,
          history,
          gameIdsForPreviousScenario:
            gameIdsForPreviousScenario ?? new Set<number>(),
        });

        gameIdsForPreviousScenario = new Set<number>();
        for (const game of chosen) {
          if (game.type === "break") {
            const idGame = id++;
            gameIdsForPreviousScenario.add(idGame);
            history.push({
              type: "break",
              finished: 1,
              id: idGame,
              round,
              players: game.players,
            });
          } else if (game.type === "single") {
            const idGame = id++;
            gameIdsForPreviousScenario.add(idGame);
            history.push({
              type: "single",
              finished: 1,
              id: idGame,
              round,
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
              round,
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

      const { chosen } = computeNextScenario({
        allScenarios,
        history: [
          {
            id: 44,
            finished: 1,
            round: 1,
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
            round: 2,
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
            round: 3,
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

      // console.log(JSON.stringify(chosen, undefined, 4));
      expect(chosen).toBeDefined();
      expect(chosen[0].players).not.to.deep.equal([
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
          round: 1,
          players: ["C"],
        },
        {
          id: 15,
          finished: 1,
          round: 1,
          type: "single",
          players: ["B", "D"],
          points: [11, 4],
        },
        {
          id: 16,
          finished: 1,
          round: 1,
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
          round: 2,
          players: ["E"],
        },
        {
          id: 18,
          finished: 1,
          round: 2,
          type: "single",
          players: ["A", "C"],
          points: [11, 5],
        },
        {
          id: 19,
          finished: 1,
          round: 2,
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
          round: 3,
          players: ["F"],
        },
        {
          id: 21,
          finished: 1,
          round: 3,
          type: "single",
          players: ["E", "G"],
          points: [11, 8],
        },
        {
          id: 22,
          finished: 1,
          round: 3,
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
          round: 4,
          players: ["G"],
        },
        {
          id: 24,
          finished: 1,
          round: 4,
          type: "single",
          players: ["F", "C"],
          points: [11, 6],
        },
        {
          id: 25,
          finished: 1,
          round: 4,
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
          round: 5,
          players: ["D"],
        },
        {
          id: 27,
          finished: 1,
          round: 5,
          type: "single",
          players: ["E", "B"],
          points: [11, 8],
        },
        {
          id: 28,
          finished: 1,
          round: 5,
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
          round: 6,
          players: ["B"],
        },
        {
          id: 30,
          finished: 1,
          round: 6,
          type: "single",
          players: ["F", "D"],
          points: [11, 6],
        },
        {
          id: 31,
          finished: 1,
          round: 6,
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
          round: 7,
          players: ["A"],
        },
        {
          id: 33,
          finished: 1,
          round: 7,
          type: "single",
          players: ["G", "F"],
          points: [5, 11],
        },
        {
          id: 34,
          finished: 1,
          round: 7,
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
          round: 8,
          players: ["F"],
        },
        {
          id: 36,
          finished: 1,
          round: 8,
          type: "single",
          players: ["A", "D"],
          points: [11, 3],
        },
        {
          id: 37,
          finished: 1,
          round: 8,
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
          round: 9,
          players: ["B"],
        },
        {
          id: 39,
          finished: 1,
          round: 9,
          type: "single",
          players: ["A", "C"],
          points: [11, 6],
        },
        {
          id: 40,
          finished: 1,
          round: 9,
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
          round: 10,
          players: ["A"],
        },
        {
          id: 42,
          finished: 1,
          round: 10,
          type: "single",
          players: ["E", "G"],
          points: [11, 5],
        },
        {
          id: 43,
          finished: 1,
          round: 10,
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
          round: 11,
          players: ["C"],
        },
        {
          id: 45,
          finished: 1,
          round: 11,
          type: "single",
          players: ["B", "D"],
          points: [11, 7],
        },
        {
          id: 46,
          finished: 1,
          round: 11,
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
          round: 12,
          players: ["G"],
        },
        {
          id: 48,
          finished: 1,
          round: 12,
          type: "single",
          players: ["F", "C"],
          points: [11, 8],
        },
        {
          id: 49,
          finished: 1,
          round: 12,
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
          round: 13,
          players: ["D"],
        },
        {
          id: 51,
          finished: 1,
          round: 13,
          type: "single",
          players: ["E", "B"],
          points: [11, 5],
        },
        {
          id: 52,
          finished: 1,
          round: 13,
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
          round: 14,
          players: ["E"],
        },
        {
          id: 54,
          finished: 1,
          round: 14,
          type: "single",
          players: ["A", "G"],
          points: [5, 11],
        },
        {
          id: 55,
          finished: 1,
          round: 14,
          type: "double",
          players: [
            ["B", "F"],
            ["C", "D"],
          ],
          points: [11, 8],
        },
      ] satisfies Context["history"];

      const { chosen } = computeNextScenario({
        allScenarios,
        history,
        gameIdsForPreviousScenario: new Set([53, 54, 55]),
      });

      expect(chosen).toBeDefined();
      expect(chosen[0].players).not.to.deep.equal(["E"]);
    });

    it("avoids consecutive breaks for 7 players on 1 field", () => {
      const players = ["A", "B", "C", "D", "E", "F", "G"];
      const allScenarios = computeAllScenarios(players, 1);

      const history: FinishedGame[] = [];

      let id = 0;
      const total = 14;
      let gameIdsForPreviousScenario: Set<number> | undefined;

      for (let i = 0; i < total; i++) {
        const round = i + 1;
        const { chosen } = computeNextScenario({
          allScenarios,
          history,
          gameIdsForPreviousScenario:
            gameIdsForPreviousScenario ?? new Set<number>(),
        });

        gameIdsForPreviousScenario = new Set<number>();
        for (const game of chosen) {
          if (game.type === "break") {
            const idGame = id++;
            gameIdsForPreviousScenario.add(idGame);
            history.push({
              type: "break",
              finished: 1,
              id: idGame,
              round,
              players: game.players,
            });
          } else {
            const idGame = id++;
            gameIdsForPreviousScenario.add(idGame);
            history.push({
              type: game.type,
              finished: 1,
              id: idGame,
              round,
              players: game.players,
              points: [11, 5],
            } as FinishedGame);
          }
        }
      }

      // Check that no player appears on break in two consecutive rounds
      const breakPlayersByRound = new Map<number, Set<string>>();
      for (const game of history) {
        if (game.type === "break") {
          const existing = breakPlayersByRound.get(game.round) ?? new Set();
          for (const player of game.players) {
            existing.add(player);
          }
          breakPlayersByRound.set(game.round, existing);
        }
      }

      for (let r = 2; r <= total; r++) {
        const prev = breakPlayersByRound.get(r - 1) ?? new Set();
        const curr = breakPlayersByRound.get(r) ?? new Set();
        for (const player of curr) {
          expect(
            prev.has(player),
            `Player ${player} was on break in both rounds ${r - 1} and ${r}`,
          ).toBe(false);
        }
      }
    });
    it("shuffles field groups for 8 players on 1 field", () => {
      const players = ["A", "B", "C", "D", "E", "F", "G", "H"];
      const total = 12;
      const history = playRounds({ players, numberOfFields: 1, rounds: total });

      const fieldGroupByRound = new Map<number, string>();
      const breaksByPlayer = new Map<string, number>();
      for (const game of history) {
        if (game.type === "break") {
          for (const player of game.players) {
            addOne(breaksByPlayer, player);
          }
        } else {
          fieldGroupByRound.set(game.round, [...game.players.flat()].sort().join("-"));
        }
      }

      // without shuffling the same four players would be on field every
      // other round, which costs one player a double break now and then
      for (let r = 3; r <= total; r++) {
        expect(
          fieldGroupByRound.get(r),
          `same field group in rounds ${r - 2} and ${r}`,
        ).not.toBe(fieldGroupByRound.get(r - 2));
      }
      const breaksStats = findMinMax(breaksByPlayer);
      expect(breaksStats.max - breaksStats.min).to.be.lessThanOrEqual(1);
    });

    it("spreads opponents for 9 players on 2 fields", () => {
      const players = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
      const history = playRounds({ players, numberOfFields: 2, rounds: 30 });

      const opponents = new Map<string, number>();
      for (const game of history) {
        if (game.type === "double") {
          for (const one of game.players[0]) {
            for (const two of game.players[1]) {
              addOne(opponents, pairKey([one, two]));
            }
          }
        }
      }

      const numberOfPairs = (players.length * (players.length - 1)) / 2;
      expect(opponents.size).toBe(numberOfPairs);
      const stats = findMinMax(opponents);
      expect(stats.max - stats.min).to.be.lessThanOrEqual(4);
    });

    it("balances singles from the round a late player joins", () => {
      const players = ["A", "B", "C", "D", "E", "F", "G"];
      const joinsAt = 13;
      const history = playRounds({
        players,
        numberOfFields: 2,
        rounds: 26,
        attending: (round) =>
          round < joinsAt ? players.slice(0, -1) : players,
      });

      // counting the whole session, G is 12 rounds of singles behind and the
      // scoring used to close that gap by putting G in singles every round
      const singles = countFromRound({
        history,
        players,
        from: joinsAt,
        of: "single",
      });

      const stats = findMinMax(singles);
      expect(stats.max - stats.min).to.be.lessThanOrEqual(2);
    });

    it("balances breaks from the round a late player joins", () => {
      const players = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
      const joinsAt = 13;
      const history = playRounds({
        players,
        numberOfFields: 1,
        rounds: 26,
        attending: (round) =>
          round < joinsAt ? players.slice(0, -1) : players,
      });

      // on a single field this used to bench I for 12 of the 14 rounds
      const breaks = countFromRound({
        history,
        players,
        from: joinsAt,
        of: "break",
      });

      const stats = findMinMax(breaks);
      expect(stats.max - stats.min).to.be.lessThanOrEqual(2);
    });

    it("balances breaks for a player returning after some rounds away", () => {
      const players = ["A", "B", "C", "D", "E", "F", "G"];
      const away = { player: "G", from: 6, to: 12 };
      const rounds = 24;
      const history = playRounds({
        players,
        numberOfFields: 1,
        rounds,
        attending: (round) =>
          round >= away.from && round <= away.to
            ? players.filter((player) => player !== away.player)
            : players,
      });

      const breaks = countFromRound({
        history,
        players,
        from: away.to + 1,
        of: "break",
      });

      // 12 rounds, 3 of 7 players on break each: a fair share is just over 5
      const fairShare = Math.ceil(
        ((rounds - away.to) * 3) / players.length,
      );
      expect(breaks.get(away.player)).to.be.lessThan(fairShare);
    });
  });

  describe("Opting out of singles", () => {
    const eligible = (players: string[], optedOut: string[]) =>
      new Set(players.filter((player) => !optedOut.includes(player)));

    it("never puts an opted out player in a single", () => {
      const players = ["A", "B", "C", "D", "E", "F", "G"];
      const scenarios = computeAllScenarios(
        players,
        2,
        eligible(players, ["D"]),
      );

      expect(scenarios.length).to.be.greaterThan(0);
      for (const scenario of scenarios) {
        for (const game of scenario) {
          if (game.type === "single") {
            expect(game.players).to.not.include("D");
          }
        }
      }
    });

    it("plays a double instead of two singles for 4 players on 2 fields", () => {
      const players = ["A", "B", "C", "D"];
      const scenarios = computeAllScenarios(
        players,
        2,
        eligible(players, ["D"]),
      );

      expect(scenarios.length).to.be.greaterThan(0);
      for (const scenario of scenarios) {
        expect(scenario.map((game) => game.type)).to.deep.equal(["double"]);
      }
    });

    it("keeps an opted out player playing among 5 players on 2 fields", () => {
      const players = ["A", "B", "C", "D", "E"];
      const optedOut = "E";
      const rounds = 12;
      const history = playRounds({
        players,
        numberOfFields: 2,
        rounds,
        noSingles: [optedOut],
      });

      // the shape is one double plus one break, so nobody is stuck on the bench
      for (const game of history) {
        expect(game.type).to.not.equal("single");
      }

      const breaks = countFromRound({
        history,
        players,
        from: 1,
        of: "break",
      });
      const counts = [...breaks.values()];
      expect(Math.max(...counts) - Math.min(...counts)).to.be.lessThan(2);
      expect(breaks.get(optedOut)).to.be.lessThan(rounds);
    });

    it("keeps the single for 6 players on 2 fields with only 2 eligible", () => {
      const players = ["A", "B", "C", "D", "E", "F"];
      const scenarios = computeAllScenarios(
        players,
        2,
        eligible(players, ["C", "D", "E", "F"]),
      );

      expect(scenarios.length).to.be.greaterThan(0);
      for (const scenario of scenarios) {
        expect([...scenario.map((game) => game.type)].sort()).to.deep.equal([
          "double",
          "single",
        ]);
      }
    });

    it("drops the single for 6 players on 2 fields with 1 eligible", () => {
      const players = ["A", "B", "C", "D", "E", "F"];
      const scenarios = computeAllScenarios(
        players,
        2,
        eligible(players, ["B", "C", "D", "E", "F"]),
      );

      expect(scenarios.length).to.be.greaterThan(0);
      for (const scenario of scenarios) {
        expect([...scenario.map((game) => game.type)].sort()).to.deep.equal([
          "break",
          "double",
        ]);
      }
    });

    it("balances singles among the players who still play them", () => {
      const players = ["A", "B", "C", "D", "E", "F", "G"];
      const optedOut = "D";
      const rounds = 14;
      const history = playRounds({
        players,
        numberOfFields: 2,
        rounds,
        noSingles: [optedOut],
      });

      const singles = countFromRound({
        history,
        players,
        from: 1,
        of: "single",
      });

      expect(singles.get(optedOut)).to.equal(0);

      const others = players
        .filter((player) => player !== optedOut)
        .map((player) => singles.get(player)!);
      expect(Math.max(...others) - Math.min(...others)).to.be.lessThan(2);
    });

    it("balances singles from the round a late player joins", () => {
      const players = ["A", "B", "C", "D", "E", "F", "G"];
      const optedOut = "D";
      const joinsAt = 13;
      const history = playRounds({
        players,
        numberOfFields: 2,
        rounds: 26,
        noSingles: [optedOut],
        attending: (round) =>
          round < joinsAt ? players.slice(0, -1) : players,
      });

      // the entry floor has to be read off the players who play singles: taken
      // over everyone it would be D's frozen 0, letting G in at no gap at all
      // and the scoring would then feed G singles round after round
      const singles = countFromRound({
        history,
        players: players.filter((player) => player !== optedOut),
        from: joinsAt,
        of: "single",
      });

      const stats = findMinMax(singles);
      expect(stats.max - stats.min).to.be.lessThanOrEqual(2);
    });

    it("does not flood a player who opts back in with singles", () => {
      const players = ["A", "B", "C", "D", "E", "F", "G"];
      const optsInAt = 15;
      const flipper = "D";
      const window = 7;
      const history = playRounds({
        players,
        numberOfFields: 2,
        rounds: optsInAt + window - 1,
        optingOutAt: (round) => (round < optsInAt ? [flipper] : []),
      });

      // D sat out 14 rounds of singles without ever being a candidate for one.
      // Counted over the whole session that reads as a 7 game deficit, and
      // closing it used to hand D 6 of the next 7 singles. Entering the
      // singles group at its lowest count instead, D is due a fair share of
      // the 7 singles in this window - 2 - plus at most the one extra that
      // entering at the lowest rather than the highest count is worth.
      const singles = history.filter(
        (game) => game.type === "single" && game.round >= optsInAt,
      );
      expect(singles.length).to.equal(window);

      const playedByFlipper = singles.filter((game) =>
        (game.players as string[]).includes(flipper),
      ).length;
      expect(playedByFlipper).to.be.lessThanOrEqual(3);
    });

    it("leaves the other counters alone when a player opts back in", () => {
      const players = ["A", "B", "C", "D", "E", "F", "G"];
      const optsInAt = 15;
      const history = playRounds({
        players,
        numberOfFields: 2,
        rounds: 26,
        optingOutAt: (round) => (round < optsInAt ? ["D"] : []),
      });

      // breaks accrue whether or not a player is up for singles, so the flip
      // must not disturb them
      const breaks = countFromRound({
        history,
        players,
        from: 1,
        of: "break",
      });
      const stats = findMinMax(breaks);
      expect(stats.max - stats.min).to.be.lessThanOrEqual(1);
    });

    it("reports 2 and 3 player rosters without singles as unplayable", () => {
      expect(isPlayable(3, 1)).to.equal(false);
      expect(isPlayable(2, 1)).to.equal(false);
      expect(isPlayable(3, 2)).to.equal(true);
      expect(isPlayable(5, 0)).to.equal(true);
      expect(isPlayable(7)).to.equal(true);
    });
  });
});
