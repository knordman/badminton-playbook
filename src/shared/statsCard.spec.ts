import { describe, expect, it } from "vitest";
import { computeStatistics } from "./history";
import type { FinishedGame } from "./scenarios";
import { percentFormat } from "./stats";
import { buildStatsCard, cardSections } from "./statsCard";

const single = (id: number, players: [string, string], points: [number, number]): FinishedGame => ({
  id,
  type: "single",
  finished: 1,
  round: 1,
  players,
  points,
});

const double = (
  id: number,
  players: [[string, string], [string, string]],
  points: [number, number]
): FinishedGame => ({
  id,
  type: "double",
  finished: 1,
  round: 1,
  players,
  points,
});

describe("stats card", () => {
  it("shows a placeholder when nothing has been played", () => {
    const card = buildStatsCard(computeStatistics([]), new Date(2026, 8, 18));
    expect(cardSections(computeStatistics([]))).toEqual([]);
    expect(card.svg).toContain("No games played yet");
    expect(card.svg).toContain("Statistics");
    expect(card.svg).toContain("18.9.2026");
  });

  it("leaves out doubles and the type tables when only singles were played", () => {
    const stats = computeStatistics([single(1, ["Alice", "Bob"], [21, 15])]);
    const sections = cardSections(stats);
    expect(sections.map((s) => s.mode)).toEqual(["Games", "Points"]);
    expect(sections[0].columns.map((c) => c.title)).toEqual(["Single", "Winning"]);
    expect(sections[1].columns.map((c) => c.title)).toEqual(["Single", "Winning"]);
  });

  it("leaves out singles and the type tables when only doubles were played", () => {
    const stats = computeStatistics([
      double(1, [["A", "B"], ["C", "D"]], [21, 10]),
    ]);
    const sections = cardSections(stats);
    expect(sections.map((s) => s.mode)).toEqual(["Games", "Points"]);
    expect(sections[0].columns.map((c) => c.title)).toEqual(["Doubles", "Winning"]);
  });

  it("orders each table by its own winning ratio and formats values", () => {
    const stats = computeStatistics([
      single(1, ["Alice", "Bob"], [21, 15]),
      single(2, ["Alice", "Bob"], [10, 21]),
      double(3, [["Alice", "Carol"], ["Bob", "Dan"]], [21, 19]),
    ]);
    const sections = cardSections(stats);
    expect(sections.map((s) => s.mode)).toEqual(["Games", "Points", "Single", "Double"]);

    const games = sections[0];
    expect(games.columns.map((c) => c.title)).toEqual(["Single", "Doubles", "Winning"]);
    const aliceGames = games.rows.find((r) => r.player === "Alice")!;
    expect(games.columns.map((c) => c.value(aliceGames))).toEqual(["1 / 2", "1 / 1", percentFormat.format(2 / 3)]);
    expect(games.rows.map((r) => r.player)).toEqual(["Carol", "Alice", "Bob", "Dan"]);

    const points = sections[1];
    const bobPoints = points.rows.find((r) => r.player === "Bob")!;
    expect(points.columns.map((c) => c.value(bobPoints))).toEqual(["36 / 67", "19 / 40", percentFormat.format(55 / 107)]);

    expect(sections[2].rows.map((r) => r.player)).toEqual(["Bob", "Alice"]);
    expect(sections[3].rows.map((r) => r.player)).toEqual(["Alice", "Carol", "Bob", "Dan"]);

    // ratios of the mode decide the order, so Bob outranks Alice on points
    expect(points.rows.map((r) => r.player).indexOf("Bob")).toBeLessThan(
      points.rows.map((r) => r.player).indexOf("Alice")
    );
  });

  it("grows the card with the number of rows and escapes names", () => {
    const few = buildStatsCard(computeStatistics([single(1, ["A", "B"], [21, 1])]), new Date());
    const more = buildStatsCard(
      computeStatistics([
        single(1, ["A", "B"], [21, 1]),
        single(2, ["C & D", "E<F>"], [21, 1]),
      ]),
      new Date()
    );
    expect(more.height).toBeGreaterThan(few.height);
    expect(more.svg).toContain("C &amp; D");
    expect(more.svg).toContain("E&lt;F&gt;");
    expect(more.svg).not.toContain("E<F>");
  });
});
