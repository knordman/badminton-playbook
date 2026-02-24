import type { PlayersContext } from "./db";
import type { WorkerRequest, WorkerResponse } from "./worker";

export type Break = { type: "break"; players: string[] };
export type Single = { type: "single"; players: [string, string] };
export type Double = {
  type: "double";
  players: [[string, string], [string, string]];
};

export type Game = Break | Single | Double;

type Points = { points: [number, number] };

type GameResult<T extends { Finished: 0 | 1 }> = {
  id: number;
  finished: T["Finished"];
  round: number;
};

export type FinishedGameWithPoints = GameResult<{ Finished: 1 }> &
  Points &
  (Single | Double);

export type FinishedGame =
  | FinishedGameWithPoints
  | (GameResult<{ Finished: 1 }> & Break);

export type OngoingGameWithPoints = GameResult<{ Finished: 0 }> & {
  type: (Single | Double)["type"];
  participants: Record<string, { players: string[]; points: number }>;
};

export type OngoingGame =
  | OngoingGameWithPoints
  | (GameResult<{ Finished: 0 }> & Break);

export type Result = FinishedGame | OngoingGame;

export type Scenario = Game[];

export class ScenarioWorker {
  private worker: Worker | null = null;

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
    }
    return this.worker;
  }

  private sendMessage<T extends WorkerResponse["type"]>(
    request: WorkerRequest,
    expectedType: T,
  ): Promise<Extract<WorkerResponse, { type: T }>> {
    const worker = this.ensureWorker();
    return new Promise((resolve) => {
      const handler = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === expectedType) {
          worker.removeEventListener("message", handler);
          resolve(event.data as Extract<WorkerResponse, { type: T }>);
        }
      };
      worker.addEventListener("message", handler);
      worker.postMessage(request);
    });
  }

  async compute(): Promise<{ total: number }> {
    const response = await this.sendMessage({ type: "compute" }, "computed");
    return { total: response.total };
  }

  async next(): Promise<void> {
    await this.sendMessage({ type: "next" }, "swapped");
  }

  async status(): Promise<{ total: number; index: number }> {
    const response = await this.sendMessage({ type: "status" }, "status");
    return { total: response.total, index: response.index };
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}

export const scenarioWorker = new ScenarioWorker();

export function gameIsFinished(result: Result): boolean {
  if (result.finished) {
    return true;
  } else {
    if (result.type === "break") {
      return true;
    } else {
      return Object.keys(result.participants).length >= 2;
    }
  }
}

export function isPlayable(numberOfPlayers: number): boolean {
  return numberOfPlayers >= 2 && numberOfPlayers <= 11;
}

export function getActiveContext(
  players: string[],
  numberOfFields: number,
): PlayersContext["value"] | undefined {
  return isPlayable(players.length)
    ? `${players.sort().join("-")}:${numberOfFields}`
    : undefined;
}
