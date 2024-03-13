import type { Break, Double, Result, Single } from "./scenarios";

export type ScenarioPart = Break | Single | Double;

export type Scenario = ScenarioPart[];

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
  games: Games,
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

type Games = { single: number; double: number; pause: number };

function getGames(numberOfPlayers: number): Games {
  switch (numberOfPlayers) {
    case 2:
      return { single: 1, double: 0, pause: 0 };
    case 3:
      return { single: 1, double: 0, pause: 1 };
    case 4:
      return { single: 2, double: 0, pause: 0 };
    case 5:
      return { single: 2, double: 0, pause: 1 };
    case 6:
      return { single: 1, double: 1, pause: 0 };
    case 7:
      return { single: 1, double: 1, pause: 1 };
    case 8:
      return { single: 0, double: 2, pause: 0 };
    case 9:
      return { single: 0, double: 2, pause: 1 };
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

  const games = getGames(numberOfPlayers);

  const scenarios: Scenario[] = [];

  if (games.pause > 0) {
    for (let i = 0; i < numberOfPlayers; i += games.pause) {
      const pausedPlayers = new Set(participants.slice(i, i + games.pause));
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
        const parts: ScenarioPart[] = [];
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
      const parts: ScenarioPart[] = [];
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

export function applyProfile(spec: {
  items: string[];
  profile: number[];
  compressProfile?: boolean;
}): Map<string, number> {
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

  const map = new Map<string, number>();
  for (const [index, value] of outputValues.entries()) {
    const item = items[index];
    if (!map.has(item)) {
      map.set(item, value);
    }
  }

  return map;
}

export type Context = {
  history: Result[];
  previous?: Scenario;
  allScenarios: Scenario[];
};

function pairKey(pair: Double["players"][number]) {
  return pair.sort().join("-");
}

function gameKey(game: Single | Double) {
  return game.type === "single"
    ? game.players.sort().join("-")
    : game.players.flat().sort().join("-");
}

function addOne(map: Map<string, number>, key: string) {
  map.set(key, map.has(key) ? map.get(key)! + 1 : 1);
}

export function computeNextScenario(context: Context): Scenario {
  const gameScoring = new Map<string, number>();
  const pairScoring = new Map<string, number>();

  for (const part of context.previous || []) {
    if (part.type !== "break") {
      // avoid playing same game
      gameScoring.set(gameKey(part), -300);

      if (part.type === "double") {
        // prefer keeping pair
        pairScoring.set(pairKey(part.players[0]), 50);
        pairScoring.set(pairKey(part.players[1]), 50);
      }
    }
  }

  const numberOfSinglesByPlayer = new Map<string, number>();
  const numberOfDoublesByPlayer = new Map<string, number>();
  const breaks: string[] = [];
  for (const result of context.history) {
    if ("type" in result && result.type === "break") {
      breaks.push(...result.players);
    } else {
      for (const data of Object.values(result.players)) {
        const bucket =
          data.players.length === 1
            ? numberOfSinglesByPlayer
            : numberOfDoublesByPlayer;
        for (const player of data.players) {
          addOne(bucket, player);
        }
      }
    }
  }
  const sortedNumberOfSingles = [...numberOfSinglesByPlayer.entries()].sort(
    (a, b) => a[1] - b[1]
  );
  const sortedNumberOfDoubles = [...numberOfDoublesByPlayer.entries()].sort(
    (a, b) => a[1] - b[1]
  );

  const singleScoringByPlayer = applyProfile({
    items: sortedNumberOfSingles.map((i) => i[0]),
    profile: [-80, -40, 0, 0],
  });
  const doubleScoringByPlayer = applyProfile({
    items: sortedNumberOfDoubles.map((i) => i[0]),
    profile: [-80, -40, 0, 0],
  });
  const breakScoring = applyProfile({
    items: breaks.reverse(),
    profile: [-10000, -9000, -8000, -7000, -6000, -5000, -4000, -3000, -2000],
  });

  const scored = new Map<Scenario, number>();
  for (const scenario of context.allScenarios) {
    let score = 0;
    for (const part of scenario) {
      if (part.type === "break") {
        for (const player of part.players) {
          score += breakScoring.get(player) ?? 0;
        }
      } else if (part.type === "single") {
        for (const player of part.players) {
          score += singleScoringByPlayer.get(player) ?? 0;
        }
        score += gameScoring.get(gameKey(part)) ?? 0;
      } else if (part.type === "double") {
        for (const player of part.players.flat()) {
          score += doubleScoringByPlayer.get(player) ?? 0;
        }
        for (const pair of part.players) {
          score += pairScoring.get(pairKey(pair)) ?? 0;
        }
        score += gameScoring.get(gameKey(part)) ?? 0;
      }
    }
    scored.set(scenario, score);
  }

  const [next] = [...scored.entries()].sort((a, b) => a[1] - b[1]).pop()!;

  return next;
}
