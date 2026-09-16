import { Dexie } from "dexie";
import type { Game, Player, Result } from "./scenarios";

export type PlayersContext = {
  id: "players";
  value: string;
};

export type NumberOfFieldsSetting = {
  id: "numberOfFields";
  value: 1 | 2;
};

export type Settings = NumberOfFieldsSetting;

export const playersContextId: PlayersContext["id"] = "players";

export const numberOfFieldsSettingId: NumberOfFieldsSetting["id"] =
  "numberOfFields";

/**
 * What was true of a round beyond the games it consisted of. The results
 * record who played, never the terms they played under, so anything the
 * scoring has to reconstruct about a past round belongs here.
 */
export type Round = {
  round: number;
  /** players who had opted out of singles when this round was generated */
  optedOutSingles: string[];
};

export class Database extends Dexie {
  players!: Dexie.Table<Player, string>;
  playing!: Dexie.Table<{ id?: number } & Game, number>;
  results!: Dexie.Table<Result, number>;
  settings!: Dexie.Table<Settings, string>;
  context!: Dexie.Table<PlayersContext, string>;
  rounds!: Dexie.Table<Round, number>;

  constructor() {
    super("Database");
    this.version(1).stores({
      players: null,
      playing: null,
      results: null,
      context: null,
    });
    this.version(2).stores({
      players: null,
      playing: null,
      results: null,
      context: null,
    });
    this.version(3).stores({
      players: null,
      playing: null,
      results: null,
      context: null,
    });
    this.version(4).stores({
      players: null,
      playing: null,
      results: null,
      context: null,
    });
    this.version(5).stores({
      players: null,
      playing: null,
      results: null,
      context: null,
    });
    this.version(6).stores({
      players: null,
      playing: null,
      results: null,
      context: null,
    });
    this.version(7).stores({
      players: null,
      playing: null,
      results: null,
      context: null,
    });
    this.version(8).stores({
      players: "name",
      playing: "id++",
      results: "id,[type+finished]",
      context: "id",
      settings: "id",
    });
    this.version(9)
      .stores({
        players: "name",
        playing: "id++",
        results: "id,[type+finished]",
        context: "id",
        settings: "id",
      })
      .upgrade(async (tx) => {
        await tx
          .table("results")
          .toCollection()
          .modify((result) => {
            result.round = 0;
          });
      });
    // rounds played before this version had no way to opt out of singles, so
    // a missing row correctly reads as "nobody had opted out"
    this.version(10).stores({
      players: "name",
      playing: "id++",
      results: "id,[type+finished]",
      context: "id",
      settings: "id",
      rounds: "round",
    });
  }
}

export const db = new Database();
