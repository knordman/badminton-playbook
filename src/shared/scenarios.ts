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

export async function computeNextScenarioWithWorker(): Promise<WorkerResponse> {
  const worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });

  const response = await new Promise<WorkerResponse>((resolve, reject) => {
    worker.addEventListener(
      "message",
      (event: MessageEvent<WorkerResponse>) => {
        resolve(event.data);
      }
    );

    worker.postMessage({} satisfies WorkerRequest);
  });

  worker.terminate();

  return response;
}

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
  return numberOfPlayers >= 2 && numberOfPlayers <= 9;
}

export function getActiveContext(
  players: string[]
): PlayersContext["value"] | undefined {
  return isPlayable(players.length) ? players.sort().join("-") : undefined;
}
