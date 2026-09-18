import type { PlayerStatistics } from "./history";
import { percentFormat, statsRows, winningRatioFor, type StatsRow } from "./stats";
import type { StatsMode } from "./statsMode";

/**
 * A shareable, always light, portrait card with one table per stats mode.
 * Columns for a game type nobody has played are left out, and the Single and
 * Double tables only appear once both types have been played.
 */

export const cardWidth = 1080;

/** every font size on the card, in SVG user units */
const font = {
  family: "Roboto, Helvetica, Arial, sans-serif",
  title: 30,
  heading: 32,
  cell: 32,
};

/** spacing and strokes, in SVG user units */
const layout = {
  padding: 64,
  bandHeight: 72,
  rowHeight: 64,
  headerHeight: 80,
  sectionGap: 75,
  valueColumnWidth: 220,
  headerRuleGap: 14,
  headerRuleWidth: 3,
  rowRuleGap: 18,
  rowRuleWidth: 1.5,
};

const colors = {
  background: "#ffffff",
  text: "#1f1f1f",
  muted: "#6b6b6b",
  // banners and table rules share one light grey
  rule: "#9e9e9e",
  band: "#9e9e9e",
  bandText: "#ffffff",
};

export const dateFormat = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

type Column = {
  title: string;
  value: (row: StatsRow) => string;
};

type Section = {
  mode: StatsMode;
  columns: Column[];
  rows: StatsRow[];
};

const ratio = (won: number, played: number) => `${won} / ${played}`;

export function cardSections(byPlayer: Map<string, PlayerStatistics>): Section[] {
  const all = [...byPlayer.values()];
  const singlesPlayed = all.some((p) => p.singles.played > 0);
  const doublesPlayed = all.some((p) => p.doubles.played > 0);
  if (!singlesPlayed && !doublesPlayed) {
    return [];
  }

  const gamesColumns: Column[] = [];
  const pointsColumns: Column[] = [];
  if (singlesPlayed) {
    gamesColumns.push({ title: "Single", value: (r) => ratio(r.singles.won, r.singles.played) });
    pointsColumns.push({
      title: "Single",
      value: (r) => ratio(r.singles.points.won, r.singles.points.played),
    });
  }
  if (doublesPlayed) {
    gamesColumns.push({ title: "Doubles", value: (r) => ratio(r.doubles.won, r.doubles.played) });
    pointsColumns.push({
      title: "Doubles",
      value: (r) => ratio(r.doubles.points.won, r.doubles.points.played),
    });
  }

  // the type specific tables only list players who played that type
  const played = (row: StatsRow, mode: StatsMode) =>
    mode === "Single" ? row.singles.played > 0 : mode === "Double" ? row.doubles.played > 0 : true;

  const withWinning = (mode: StatsMode, columns: Column[]): Section => ({
    mode,
    columns: [
      ...columns,
      { title: "Winning", value: (r) => percentFormat.format(winningRatioFor(r, mode)) },
    ],
    rows: statsRows(byPlayer, mode).filter((row) => played(row, mode)),
  });

  const sections = [withWinning("Games", gamesColumns), withWinning("Points", pointsColumns)];
  // with a single game type the tables above already tell the whole story
  if (singlesPlayed && doublesPlayed) {
    sections.push(
      withWinning("Single", [
        { title: "Points", value: (r) => ratio(r.singles.points.won, r.singles.points.played) },
        { title: "Games", value: (r) => ratio(r.singles.won, r.singles.played) },
      ]),
      withWinning("Double", [
        { title: "Points", value: (r) => ratio(r.doubles.points.won, r.doubles.points.played) },
        { title: "Games", value: (r) => ratio(r.doubles.won, r.doubles.played) },
      ])
    );
  }
  return sections;
}

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}

function text(
  x: number,
  y: number,
  content: string,
  spec: { size: number; weight?: number; color?: string; anchor?: "start" | "end" }
): string {
  return `<text x="${x}" y="${y}" font-family="${font.family}" font-size="${spec.size}" font-weight="${spec.weight ?? 400}" fill="${spec.color ?? colors.text}" text-anchor="${spec.anchor ?? "start"}">${escapeXml(content)}</text>`;
}

export function buildStatsCard(
  byPlayer: Map<string, PlayerStatistics>,
  date: Date
): { svg: string; width: number; height: number } {
  const { padding } = layout;
  const parts: string[] = [];
  let y = padding + font.title;
  parts.push(text(padding, y, "Statistics", { size: font.title, weight: 700 }));
  parts.push(
    text(cardWidth - padding, y, dateFormat.format(date), {
      size: font.title,
      weight: 700,
      anchor: "end",
    })
  );

  const sections = cardSections(byPlayer);
  if (sections.length === 0) {
    y += layout.sectionGap + font.cell;
    parts.push(text(padding, y, "No games played yet", { size: font.cell, color: colors.muted }));
  }

  const right = cardWidth - padding;

  for (const section of sections) {
    // the heading sits in a grey band across the whole card
    y += layout.sectionGap;
    parts.push(`<rect x="0" y="${y}" width="${cardWidth}" height="${layout.bandHeight}" fill="${colors.band}"/>`);
    // baseline roughly a third of the font size below the band's centre
    parts.push(
      text(padding, y + layout.bandHeight / 2 + font.heading * 0.35, section.mode, {
        size: font.heading,
        weight: 700,
        color: colors.bandText,
      })
    );
    y += layout.bandHeight;

    // the player column takes what is left after the value columns
    const columnRight = (index: number) =>
      right - (section.columns.length - 1 - index) * layout.valueColumnWidth;
    const rule = (width: number) =>
      `<line x1="${padding}" y1="${y}" x2="${right}" y2="${y}" stroke="${colors.rule}" stroke-width="${width}"/>`;

    y += layout.headerHeight;
    parts.push(text(padding, y, "Player", { size: font.cell, weight: 700 }));
    section.columns.forEach((column, index) => {
      parts.push(
        text(columnRight(index), y, column.title, { size: font.cell, weight: 700, anchor: "end" })
      );
    });
    y += layout.headerRuleGap;
    parts.push(rule(layout.headerRuleWidth));

    for (const row of section.rows) {
      y += layout.rowHeight;
      parts.push(text(padding, y, row.player, { size: font.cell }));
      section.columns.forEach((column, index) => {
        parts.push(text(columnRight(index), y, column.value(row), { size: font.cell, anchor: "end" }));
      });
      y += layout.rowRuleGap;
      parts.push(rule(layout.rowRuleWidth));
      y -= layout.rowRuleGap;
    }
    y += layout.rowRuleGap;
  }

  const height = y + padding;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${height}" viewBox="0 0 ${cardWidth} ${height}">` +
    `<rect width="${cardWidth}" height="${height}" fill="${colors.background}"/>` +
    parts.join("") +
    `</svg>`;
  return { svg, width: cardWidth, height };
}

/** browser only: draw the card on a canvas and encode it as PNG */
export async function renderStatsCardPng(card: {
  svg: string;
  width: number;
  height: number;
}): Promise<Blob> {
  const image = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("could not rasterize stats card"));
  });
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(card.svg)}`;
  await loaded;

  const scale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const canvas = document.createElement("canvas");
  canvas.width = card.width * scale;
  canvas.height = card.height * scale;
  const context = canvas.getContext("2d")!;
  context.scale(scale, scale);
  context.drawImage(image, 0, 0, card.width, card.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("could not encode stats card"))), "image/png");
  });
}
