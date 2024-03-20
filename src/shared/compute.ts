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
        ...generateCombinations([...current, nextItem], nextRemainingItems)
      );
    }

    return combos;
  }

  return generateCombinations([], items);
}

function* generateScenarios(
  games: ConcurrentGames,
  singles: Single["players"][],
  doubles: Double["players"][]
) {
  if (games.single === 0) {
    const concurrentDoubles = generateCombinationsOfSize(
      doubles,
      games.double
    ).filter(
      (concurrent) =>
        concurrent.length === 1 ||
        new Set(concurrent.flat(2)).size === concurrent.length * 4
    );
    for (const doubles of concurrentDoubles) {
      yield { singles: [], doubles };
    }
  } else {
    const concurrentSingles = generateCombinationsOfSize(
      singles,
      games.single
    ).filter(
      (concurrent) =>
        concurrent.length === 1 ||
        new Set(concurrent.flat()).size === concurrent.length * 2
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
          games.double
        ).filter(
          (concurrent) =>
            concurrent.length === 1 ||
            new Set(concurrent.flat(2)).size === concurrent.length * 4
        );

        for (const doubles of concurrentDoubles) {
          yield { singles, doubles };
        }
      }
    }
  }
}

type ConcurrentGames = { single: number; double: number; break: number };

function getConcurrentGames(numberOfPlayers: number): ConcurrentGames {
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
    default:
      throw new Error(`unhandled number of players: ${numberOfPlayers}`);
  }
}

export function computeAllScenarios(participants: string[]): Scenario[] {
  const numberOfPlayers = participants.length;
  const pairs = <[string, string][]>generateCombinationsOfSize(participants, 2);

  const allSingles = [...pairs];
  const allDoubles = <[[string, string], [string, string]][]>(
    generateCombinationsOfSize(pairs, 2).filter(
      (concurrent) =>
        concurrent.length === 1 ||
        new Set(concurrent.flat()).size === concurrent.length * 2
    )
  );

  const games = getConcurrentGames(numberOfPlayers);

  const scenarios: Scenario[] = [];

  if (games.break > 0) {
    for (let i = 0; i < numberOfPlayers; i += games.break) {
      const pausedPlayers = new Set(participants.slice(i, i + games.break));
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
        availableDoubles
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

export type Context = {
  history: FinishedGame[];
  gameIdsForPreviousScenario: Set<number>;
  allScenarios: Scenario[];
};

function pairKey(pair: [string, string]): string {
  return pair.sort().join("-");
}

function gameKey(game: Single | Double) {
  return game.type === "single"
    ? pairKey(game.players)
    : pairKey([pairKey(game.players[0]), pairKey(game.players[1])]);
}

function addOne(map: Map<string, number>, key: string) {
  map.set(key, map.has(key) ? map.get(key)! + 1 : 1);
}

export function computeNextScenario(context: Context): Scenario {
  const gameScores = new Map<string, number>();
  const pairScoresForPrevious = new Map<string, number>();
  const numberOfSinglesByPlayer = new Map<string, number>();
  const numberOfDoublesByPlayer = new Map<string, number>();
  const numberOfGamesByPair = new Map<string, number>();
  const breaks: string[] = [];

  for (const [index, result] of context.history.entries()) {
    if (result.type === "break") {
      breaks.push(...result.players);
    } else {
      const bucket =
        result.type === "single"
          ? numberOfSinglesByPlayer
          : numberOfDoublesByPlayer;
      for (const player of result.players.flat()) {
        addOne(bucket, player);
      }
      // avoid playing same game, the most for the most current ones
      gameScores.set(gameKey(result), -900 + (context.history.length - index));

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

  const gameScoring = (game: Single | Double): number => {
    return gameScores.get(gameKey(game)) ?? 0;
  };

  const pairsScoring = (double: Double): number => {
    let output = 0;
    for (const pair of double.players) {
      const key = pairKey(pair);
      output += pairScoresForPrevious.get(key) ?? 0;

      const count = numberOfGamesByPair.get(key) ?? 0;
      // prefer playing 3 games in a row
      output += (count % 3) * 100 - Math.floor(count / 3) * 200;
    }
    return output;
  };

  const playersByNumberOfSingles = new Map<number, Set<string>>();
  for (const [player, numberOfSingles] of numberOfSinglesByPlayer.entries()) {
    let bucket: Set<string>;
    if (!playersByNumberOfSingles.has(numberOfSingles)) {
      bucket = new Set();
      playersByNumberOfSingles.set(numberOfSingles, bucket);
    } else {
      bucket = playersByNumberOfSingles.get(numberOfSingles)!;
    }
    bucket.add(player);
  }
  const singleScoringByNumberOfSingles = projectProfile({
    items: [...playersByNumberOfSingles.keys()].sort((a, b) => b - a),
    profile: [150, 120, 100, 80, 60, 40, 20, 10],
  });
  const singleScoring = (player: string): number => {
    return (
      singleScoringByNumberOfSingles.get(
        numberOfSinglesByPlayer.get(player)!
      ) ?? 0
    );
  };

  const playersByNumberOfDoubles = new Map<number, Set<string>>();
  for (const [player, numberOfDoubles] of numberOfDoublesByPlayer.entries()) {
    let bucket: Set<string>;
    if (!playersByNumberOfDoubles.has(numberOfDoubles)) {
      bucket = new Set();
      playersByNumberOfDoubles.set(numberOfDoubles, bucket);
    } else {
      bucket = playersByNumberOfDoubles.get(numberOfDoubles)!;
    }
    bucket.add(player);
  }
  const doubleScoringByNumberOfDoubles = projectProfile({
    items: [...playersByNumberOfDoubles.keys()].sort((a, b) => a - b),
    profile: [-80, -40, 0, 0],
  });
  const doubleScoring = (player: string): number => {
    return (
      doubleScoringByNumberOfDoubles.get(
        numberOfDoublesByPlayer.get(player)!
      ) ?? 0
    );
  };

  const breakScores = projectProfile({
    items: breaks.reverse(),
    profile: [-10000, -9000, -8000, -7000, -6000, -5000, -4000, -3000, -2000],
  });
  const breakScoring = (player: string): number => {
    return breakScores.get(player) ?? 0;
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
          for (const player of game.players.flat()) {
            score += doubleScoring(player);
          }
          score += pairsScoring(game);
        }
      }
    }
    scored.set(score, (scored.get(score) ?? new Set()).add(scenario));
  }

  const sortedScores = [...scored.keys()].sort((a, b) => b - a);

  const bestScenarios = scored.get(sortedScores[0])!;

  console.debug(`scenarios: ${scored.size}`);
  console.debug(
    `max score: ${sortedScores[0]} with ${bestScenarios.size} scenarios`
  );

  const chosen = [...bestScenarios][
    Math.floor(Math.random() * bestScenarios.size)
  ];

  return chosen;
}
