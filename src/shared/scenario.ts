import type { db as dexie } from "@/shared/db";

export type Single = { type: "single"; players: [string, string] };

export type Double = {
  type: "double";
  players: [[string, string], [string, string]];
};

export type Break = { type: "break"; players: string[] };

type ScenarioPart = Break | Single | Double;

export function isPlayable(numberOfPlayers: number): boolean {
  return numberOfPlayers >= 2 && numberOfPlayers <= 9;
}

export async function getNext(db: typeof dexie): Promise<ScenarioPart[]> {
  return [
    { type: "break", players: ["Megaman"] },
    { type: "single", players: ["Batman", "Robin"] },
    {
      type: "double",
      players: [
        ["A", "B"],
        ["C", "D"],
      ],
    },
  ];
}

export type Result = {
  playing: number;
  players: { [player: string]: { points: number; players: string[] } };
};
