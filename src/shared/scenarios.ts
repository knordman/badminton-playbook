import type { PlayersContext } from "./db";
import type { ScenariosRequest, ScenariosResponse } from "./worker";

export type Break = { type: "break"; players: string[] };
export type Single = { type: "single"; players: [string, string] };
export type Double = {
  type: "double";
  players: [[string, string], [string, string]];
};

export function isPlayable(numberOfPlayers: number): boolean {
  return numberOfPlayers >= 2 && numberOfPlayers <= 9;
}

export async function computeNextScenarioWithWorker(spec: {
  playersContext: PlayersContext["value"];
  currentlyOnBreak?: Break;
}): Promise<ScenariosResponse> {
  const worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });

  const response = await new Promise<ScenariosResponse>((resolve, reject) => {
    worker.addEventListener(
      "message",
      (event: MessageEvent<ScenariosResponse>) => {
        resolve(event.data);
      }
    );

    worker.postMessage({
      playersContext: spec.playersContext,
    } satisfies ScenariosRequest);
  });

  worker.terminate();

  return response;
}

export type GameResult = {
  playing: number;
  players: { [player: string]: { points: number; players: string[] } };
};

export type BreakResult = {
  playing: number;
  type: "break";
  players: string[];
};

export type Result = GameResult | BreakResult;
