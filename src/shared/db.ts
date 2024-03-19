import { Dexie } from "dexie";
import type { Game, Result } from "./scenarios";

export type PlayersContext = {
  id: "players";
  value: string;
};

export const playersContextId: PlayersContext["id"] = "players";

export class Database extends Dexie {
  players!: Dexie.Table<{ name: string }, string>;
  playing!: Dexie.Table<{ id?: number } & Game, number>;
  results!: Dexie.Table<Result, number>;
  context!: Dexie.Table<PlayersContext, string>;

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
      players: "name",
      playing: "id++",
      results: "id,[type+finished]",
      context: "id",
    });
  }
}

export const db = new Database();
