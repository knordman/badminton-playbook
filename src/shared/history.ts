import type { Result } from "./scenarios";

type GameStatistics = {
  played: number;
  won: number;
  points: {
    played: number;
    won: number;
  };
};

export type PlayerStatistics = {
  singles: GameStatistics;
  doubles: GameStatistics;
  played: number;
  winningRatio: {
    games: number;
    points: number;
  };
};

export function computeStatistics(
  history: Result[]
): Map<string, PlayerStatistics> {
  const output = new Map<string, PlayerStatistics>();

  const emptyBucket = (): PlayerStatistics => ({
    singles: {
      played: 0,
      won: 0,
      points: {
        played: 0,
        won: 0,
      },
    },
    doubles: {
      played: 0,
      won: 0,
      points: {
        played: 0,
        won: 0,
      },
    },
    played: 0,
    winningRatio: {
      games: 0,
      points: 0,
    },
  });

  for (const result of history) {
    if (!result.finished) {
      continue;
    }

    if (result.type === "break") {
      for (const player of result.players) {
        let bucket = output.get(player);
        if (!bucket) {
          bucket = emptyBucket();
          output.set(player, bucket);
        }
      }
    } else {
      const pointsByPlayer = new Map<string, number>();
      for (const [index, player] of result.players.entries()) {
        for (const p of Array.isArray(player) ? player : [player]) {
          pointsByPlayer.set(p, result.points[index]);
        }
      }
      const winner =
        result.points[0] > result.points[1]
          ? result.players[0]
          : result.points[1] > result.points[0]
          ? result.players[1]
          : undefined;

      const fromGameForPlayer = (
        player: string
      ): { won: boolean; points: number } => {
        if (winner) {
          const won =
            (typeof winner === "string" && winner === player) ||
            winner.includes(player);
          return {
            won,
            points: pointsByPlayer.get(player)!,
          };
        }
        return {
          won: false,
          points: pointsByPlayer.get(player)!,
        };
      };

      for (const player of result.players.flat()) {
        let bucket = output.get(player);
        if (!bucket) {
          bucket = emptyBucket();
          output.set(player, bucket);
        }

        const forPlayer = fromGameForPlayer(player);

        if (result.type === "single") {
          bucket.singles.played++;
          bucket.singles.points.played += result.points[0] + result.points[1];
          if (forPlayer.won) {
            bucket.singles.won++;
            bucket.singles.points.won += forPlayer.points;
          }
        } else {
          bucket.doubles.played++;
          bucket.doubles.points.played += result.points[0] + result.points[1];
          if (forPlayer.won) {
            bucket.doubles.won++;
            bucket.doubles.points.won += forPlayer.points;
          }
        }
      }
    }
  }

  for (const player of output.values()) {
    player.played = player.singles.played + player.doubles.played;
    player.winningRatio.games =
      (player.singles.won + player.doubles.won) / player.played;
    player.winningRatio.points =
      (player.singles.points.won + player.doubles.points.won) /
      (player.singles.points.played + player.doubles.points.played);
  }

  return output;
}
