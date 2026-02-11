import type { Double, FinishedGame, Game, Scenario, Single } from "./scenarios";

function generateCombinationsOfSize<T>(items: T[], size: number) {
  if (size > items.length) {
    return [];
  }

  function generateCombinations(current: T[], remainingItems: T[]): T[][] {
    if (current.length === size) {
      return [current];
    }
    const combos = [];
    for (let i = 0; i < remainingItems.length; i++) {
      const nextItem = remainingItems[i];
      const nextRemainingItems = remainingItems.slice(i + 1);
      combos.push(
        ...generateCombinations([...current, nextItem], nextRemainingItems),
      );
    }

    return combos;
  }

  return generateCombinations([], items);
}

function* generateScenarios(
  games: ConcurrentGames,
  singles: Single["players"][],
  doubles: Double["players"][],
) {
  if (games.single === 0) {
    const concurrentDoubles = generateCombinationsOfSize(
      doubles,
      games.double,
    ).filter(
      (concurrent) =>
        concurrent.length === 1 ||
        new Set(concurrent.flat(2)).size === concurrent.length * 4,
    );
    for (const doubles of concurrentDoubles) {
      yield { singles: [], doubles };
    }
  } else {
    const concurrentSingles = generateCombinationsOfSize(
      singles,
      games.single,
    ).filter(
      (concurrent) =>
        concurrent.length === 1 ||
        new Set(concurrent.flat()).size === concurrent.length * 2,
    );

    for (const singles of concurrentSingles) {
      if (games.double === 0) {
        yield { singles, doubles: [] };
      } else {
        const playerInSingles = new Set(singles.flat());

        const possibleDoubles = doubles.filter((double) => {
          for (const doublePlayer of [...double[0], ...double[1]]) {
            if (playerInSingles.has(doublePlayer)) {
              return false;
            }
          }
          return true;
        });

        const concurrentDoubles = generateCombinationsOfSize(
          possibleDoubles,
          games.double,
        ).filter(
          (concurrent) =>
            concurrent.length === 1 ||
            new Set(concurrent.flat(2)).size === concurrent.length * 4,
        );

        for (const doubles of concurrentDoubles) {
          yield { singles, doubles };
        }
      }
    }
  }
}

type ConcurrentGames = { single: number; double: number; break: number };

function getConcurrentGames(
  numberOfPlayers: number,
  numberOfFields: 1 | 2,
): ConcurrentGames {
  if (numberOfFields === 1) {
    switch (numberOfPlayers) {
      case 2:
        return { single: 1, double: 0, break: 0 };
      case 3:
        return { single: 1, double: 0, break: 1 };
      case 4:
        return { single: 0, double: 1, break: 0 };
      case 5:
        return { single: 0, double: 1, break: 1 };
      case 6:
        return { single: 0, double: 1, break: 2 };
      case 7:
        return { single: 0, double: 1, break: 3 };
      case 8:
        return { single: 0, double: 1, break: 4 };
      case 9:
        return { single: 0, double: 1, break: 5 };
      case 10:
        return { single: 0, double: 1, break: 6 };
      case 11:
        return { single: 0, double: 1, break: 7 };
    }
  } else {
    switch (numberOfPlayers) {
      case 2:
        return { single: 1, double: 0, break: 0 };
      case 3:
        return { single: 1, double: 0, break: 1 };
      case 4:
        return { single: 2, double: 0, break: 0 };
      case 5:
        return { single: 2, double: 0, break: 1 };
      case 6:
        return { single: 1, double: 1, break: 0 };
      case 7:
        return { single: 1, double: 1, break: 1 };
      case 8:
        return { single: 0, double: 2, break: 0 };
      case 9:
        return { single: 0, double: 2, break: 1 };
      case 10:
        return { single: 0, double: 2, break: 2 };
      case 11:
        return { single: 0, double: 2, break: 3 };
    }
  }
  throw new Error(`unhandled number of players: ${numberOfPlayers}`);
}

export function computeAllScenarios(
  participants: string[],
  numberOfFields: 1 | 2,
): Scenario[] {
  const numberOfPlayers = participants.length;
  const pairs = <[string, string][]>generateCombinationsOfSize(participants, 2);

  const allSingles = [...pairs];
  const allDoubles = <[[string, string], [string, string]][]>(
    generateCombinationsOfSize(pairs, 2).filter(
      (concurrent) =>
        concurrent.length === 1 ||
        new Set(concurrent.flat()).size === concurrent.length * 2,
    )
  );

  const games = getConcurrentGames(numberOfPlayers, numberOfFields);

  const scenarios: Scenario[] = [];

  if (games.break > 0) {
    const breakCombinations = generateCombinationsOfSize(
      participants,
      games.break,
    );
    for (const pausedPlayersList of breakCombinations) {
      const pausedPlayers = new Set(pausedPlayersList);
      const availableSingles = allSingles.filter((single) => {
        for (const singlePlayer of single) {
          if (pausedPlayers.has(singlePlayer)) {
            return false;
          }
        }
        return true;
      });

      const availableDoubles = allDoubles.filter((doublePairs) => {
        for (const doublePlayer of doublePairs.flat(2)) {
          if (pausedPlayers.has(doublePlayer)) {
            return false;
          }
        }
        return true;
      });

      for (const scenario of generateScenarios(
        games,
        availableSingles,
        availableDoubles,
      )) {
        const parts: Game[] = [];
        if (pausedPlayers.size > 0) {
          parts.push({ type: "break", players: [...pausedPlayers] });
        }
        for (const single of scenario.singles) {
          parts.push({ type: "single", players: single });
        }
        for (const double of scenario.doubles) {
          parts.push({ type: "double", players: double });
        }
        scenarios.push(parts);
      }
    }
  } else {
    for (const scenario of generateScenarios(games, allSingles, allDoubles)) {
      const parts: Game[] = [];
      for (const single of scenario.singles) {
        parts.push({ type: "single", players: single });
      }
      for (const double of scenario.doubles) {
        parts.push({ type: "double", players: double });
      }
      scenarios.push(parts);
    }
  }

  return scenarios;
}

export function projectProfile<Item extends string | number>(spec: {
  items: Item[];
  profile: number[];
  compressProfile?: boolean;
}): Map<Item, number> {
  const { items, profile, compressProfile } = spec;

  if (profile.length < 2) {
    throw new Error("too short profile");
  } else if (items.length < 1) {
    return new Map();
  } else if (items.length === 1) {
    return new Map([
      [
        items[0],
        compressProfile
          ? profile.reduce((sum, value) => (sum += value), 0) / profile.length
          : profile[0],
      ],
    ]);
  }

  const outputValues: number[] = [];
  const interval =
    profile.length > items.length && !compressProfile
      ? 1
      : (profile.length - 1) / (items.length - 1);

  for (let point = 0; point < profile.length - 1; point += interval) {
    const lower = Math.floor(point);
    const upper = Math.min(Math.ceil(point), profile.length - 1);

    const value =
      profile[lower] + (profile[upper] - profile[lower]) * (point - lower);

    outputValues.push(value);
  }

  if (profile.length <= items.length || compressProfile) {
    outputValues.push(profile[profile.length - 1]);
  }

  const map = new Map<Item, number>();
  for (const [index, value] of outputValues.entries()) {
    const item = items[index];
    if (!map.has(item)) {
      map.set(item, value);
    } else {
      map.set(item, map.get(item)! + value);
    }
  }

  return map;
}

export function findMinMax(
  map: Map<string, number>,
  defaults?: { max?: number; min?: number },
): {
  min: number;
  max: number;
} {
  let max = -Infinity;
  let min = Infinity;
  for (const value of map.values()) {
    if (value > max) {
      max = value;
    }
    if (value < min) {
      min = value;
    }
  }
  return {
    min:
      min === Infinity
        ? defaults?.min !== undefined
          ? defaults.min
          : min
        : min,
    max:
      max === -Infinity
        ? defaults?.max !== undefined
          ? defaults.max
          : max
        : max,
  };
}

export type Context = {
  history: FinishedGame[];
  gameIdsForPreviousScenario: Set<number>;
  allScenarios: Scenario[];
};

export function pairKey(pair: [string, string]): string {
  return pair.sort().join("-");
}

export function gameKey(game: Single | Double) {
  return game.type === "single"
    ? pairKey(game.players)
    : pairKey([pairKey(game.players[0]), pairKey(game.players[1])]);
}

export function addOne(map: Map<string, number>, key: string) {
  map.set(key, map.has(key) ? map.get(key)! + 1 : 1);
}

export function computeNextScenario(context: Context): Scenario {
  const gameScores = new Map<string, number>();
  const pairScoresForPrevious = new Map<string, number>();
  const numberOfBreaksByPlayer = new Map<string, number>();
  const numberOfSinglesByPlayer = new Map<string, number>();
  const numberOfDoublesByPlayer = new Map<string, number>();
  const numberOfGamesByPair = new Map<string, number>();
  const playedRounds = context.history.length;
  const consecutiveBreakStreakByPlayer = new Map<string, number>();
  const breakPlayersByRound = new Map<number, Set<string>>();

  const latestRound =
    playedRounds > 0 ? context.history[context.history.length - 1].round : 0;

  for (const [index, result] of context.history.entries()) {
    if (result.type === "break") {
      let breakers: Set<string>;
      if (breakPlayersByRound.has(result.round)) {
        breakers = breakPlayersByRound.get(result.round)!;
      } else {
        breakers = new Set();
        breakPlayersByRound.set(result.round, breakers);
      }
      for (const player of result.players) {
        addOne(numberOfBreaksByPlayer, player);
        breakers.add(player);
      }
    } else {
      const bucket =
        result.type === "single"
          ? numberOfSinglesByPlayer
          : numberOfDoublesByPlayer;
      for (const player of result.players.flat()) {
        addOne(bucket, player);
      }

      // avoid playing same game, the most for the most current ones
      gameScores.set(
        gameKey(result),
        ((index + 1) / context.history.length) * -(context.history.length * 55),
      );

      if (result.type === "double") {
        const pairOneKey = pairKey(result.players[0]);
        const pairTwoKey = pairKey(result.players[1]);

        if (context.gameIdsForPreviousScenario.has(result.id)) {
          // prefer keeping pair of previous game
          pairScoresForPrevious.set(pairOneKey, 50);
          pairScoresForPrevious.set(pairTwoKey, 50);
        }

        addOne(numberOfGamesByPair, pairOneKey);
        addOne(numberOfGamesByPair, pairTwoKey);
      }
    }
  }

  const latestBreakPlayers = breakPlayersByRound.get(latestRound) ?? new Set();

  for (const player of latestBreakPlayers) {
    let streak = 1;
    for (let r = latestRound - 1; r >= 0; r--) {
      if (breakPlayersByRound.get(r)?.has(player)) {
        streak++;
      } else {
        break;
      }
    }
    consecutiveBreakStreakByPlayer.set(player, streak);
  }

  const gameScoring = (game: Single | Double): number => {
    return gameScores.get(gameKey(game)) ?? 0;
  };

  const { min: minPair } = findMinMax(numberOfGamesByPair, { max: 0 });
  const pairsScoring = (double: Double): number => {
    let output = 0;
    for (const pair of double.players) {
      const key = pairKey(pair);
      const gamesPlayed = numberOfGamesByPair.get(key) ?? 0;

      const shift = minPair + 2;

      if (gamesPlayed < shift) {
        output += pairScoresForPrevious.get(key) ?? 0;
      } else if (gamesPlayed >= shift) {
        output -= 100;
      }
    }
    return output;
  };

  const { max: maxBreaks } = findMinMax(numberOfBreaksByPlayer, { max: 0 });
  const breakScoring = (player: string): number => {
    const forPlayer = numberOfBreaksByPlayer.get(player) ?? 0;
    const fromCount = (maxBreaks - forPlayer) * 3000;
    const fromStreak = (consecutiveBreakStreakByPlayer.get(player) ?? 0) * 1500;

    return fromCount - fromStreak;
  };

  const { max: maxSinglesPlayed } = findMinMax(numberOfSinglesByPlayer, {
    max: 0,
  });
  const singleScoring = (player: string): number => {
    const forPlayer = numberOfSinglesByPlayer.get(player) ?? 0;
    return (maxSinglesPlayed - forPlayer) * 800;
  };

  const scored = new Map<number, Set<Scenario>>();
  for (const scenario of context.allScenarios) {
    let score = 0;
    for (const game of scenario) {
      if (game.type === "break") {
        for (const player of game.players) {
          score += breakScoring(player);
        }
      } else {
        score += gameScoring(game);

        if (game.type === "single") {
          for (const player of game.players) {
            score += singleScoring(player);
          }
        } else if (game.type === "double") {
          score += pairsScoring(game);
        }
      }
    }
    scored.set(score, (scored.get(score) ?? new Set()).add(scenario));
  }

  const sortedScores = [...scored.keys()].sort((a, b) => b - a);

  const bestScenarios = scored.get(sortedScores[0])!;

  console.debug(`scored scenario groups: ${scored.size}`);
  console.debug(
    `max score: ${sortedScores[0]} with ${bestScenarios.size} scenarios`,
  );

  const chosen = [...bestScenarios][
    Math.floor(Math.random() * bestScenarios.size)
  ];

  return chosen;
}
