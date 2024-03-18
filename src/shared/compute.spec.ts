import { describe, expect, it } from "vitest";
import {
  computeAllScenarios,
  computeNextScenario,
  projectProfile,
} from "./compute";

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
            finished: true,
            players: ["C"],
          },
          {
            id: 1,
            type: "single",
            finished: true,
            players: ["A", "B"],
            points: [0, 0],
          },
          {
            id: 2,
            type: "break",
            finished: true,
            players: ["A"],
          },
          {
            id: 3,
            type: "single",
            finished: true,
            players: ["C", "B"],
            points: [0, 0],
          },
          {
            id: 4,
            type: "break",
            finished: true,
            players: ["B"],
          },
          {
            id: 5,
            type: "single",
            finished: true,
            players: ["C", "A"],
            points: [0, 0],
          },
        ],
        gameIdsForPreviousScenario: new Set([4, 5]),
      });

      expect(next).toBeDefined();
    });
  });
});
