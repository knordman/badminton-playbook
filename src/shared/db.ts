import { Dexie } from "dexie";
import type { Break, Double, Result, Single } from "./scenarios";

export type PlayersContext = {
  id: "players";
  value: string;
};

export const playersContextId: PlayersContext["id"] = "players";

export class Database extends Dexie {
  players!: Dexie.Table<{ name: string }, string>;
  playing!: Dexie.Table<{ id?: number } & (Single | Double | Break), number>;
  results!: Dexie.Table<Result, number>;
  context!: Dexie.Table<{ id: string } & PlayersContext, string>;

  constructor() {
    super("Database");
    this.version(4).stores({
      players: "name",
      playing: "++id",
      results: "playing",
      context: "id",
    });
  }
}

export const db = new Database();
