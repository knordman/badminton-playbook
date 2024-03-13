import { describe, expect, it } from "vitest";
import {
  applyProfile,
  computeAllScenarios,
  computeNextScenario,
} from "./compute";

describe("Scenarios", () => {
  describe("Ranking", () => {
    it("applies profile to less items", () => {
      const profile = [-200, -100, 0, 0, 0];
      const items = ["a", "b", "c", "d"];

      const output = applyProfile({ items, profile, compressProfile: true });

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

    it("applies profile to more items", () => {
      const profile = [0, 100];
      const items = ["a", "b", "c", "d"];

      const output = applyProfile({ items, profile });

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

    it("returns empty map for empty items", () => {
      const profile = [0, 100];
      const items = <string[]>[];

      const output = applyProfile({ items, profile });

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
            type: "break",
            players: ["C"],
            playing: 0,
          },
          {
            players: {
              A: { players: ["A"], points: 0 },
              B: { players: ["B"], points: 0 },
            },
            playing: 1,
          },
          {
            type: "break",
            players: ["A"],
            playing: 0,
          },
          {
            players: {
              C: { players: ["C"], points: 0 },
              B: { players: ["B"], points: 0 },
            },
            playing: 1,
          },
          {
            type: "break",
            players: ["C"],
            playing: 0,
          },
          {
            players: {
              A: { players: ["A"], points: 0 },
              B: { players: ["B"], points: 0 },
            },
            playing: 1,
          },
        ],
        previous: [
          {
            type: "break",
            players: ["C"],
          },
          {
            type: "single",
            players: ["B", "A"],
          },
        ],
      });

      expect(next).toBeDefined();
      // console.log(JSON.stringify(next, undefined, 4));
    });
  });
});
