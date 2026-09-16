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

/**
 * The round shape. Singles only ever appear where there are too few players to
 * fill the available fields with doubles, so every shape that contains one has
 * to bend to the number of singles-eligible players (`numberOfSinglesEligible`,
 * everyone who has not opted out). Shapes without singles are unaffected.
 *
 * At 4 and 5 players on 2 fields a single opt-out drops the whole shape to one
 * double: two singles put the same four players on field as one double does,
 * but leave no field slot an opted-out player could occupy, so at 5 players
 * they would be the one on break every single round.
 */
function getConcurrentGames(
  numberOfPlayers: number,
  numberOfFields: 1 | 2,
  numberOfSinglesEligible: number,
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
        return numberOfSinglesEligible < 4
          ? { single: 0, double: 1, break: 0 }
          : { single: 2, double: 0, break: 0 };
      case 5:
        return numberOfSinglesEligible < 5
          ? { single: 0, double: 1, break: 1 }
          : { single: 2, double: 0, break: 1 };
      case 6:
        return numberOfSinglesEligible < 2
          ? { single: 0, double: 1, break: 2 }
          : { single: 1, double: 1, break: 0 };
      case 7:
        return numberOfSinglesEligible < 2
          ? { single: 0, double: 1, break: 3 }
          : { single: 1, double: 1, break: 1 };
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

/**
 * `singlesEligible` are the players who may be picked for a single; it defaults
 * to everyone. Ineligible players are filtered out of the single pairs before
 * any scenario is built, so no scenario respecting the opt-out has to be thrown
 * away afterwards - and `getConcurrentGames` bends the round shape to the
 * eligible count, so the pre-filter can never leave the set empty.
 */
export function computeAllScenarios(
  participants: string[],
  numberOfFields: 1 | 2,
  singlesEligible: ReadonlySet<string> = new Set(participants),
): Scenario[] {
  const numberOfPlayers = participants.length;
  const pairs = <[string, string][]>generateCombinationsOfSize(participants, 2);

  const allSingles = pairs.filter(
    ([one, two]) => singlesEligible.has(one) && singlesEligible.has(two),
  );
  const allDoubles = <[[string, string], [string, string]][]>(
    generateCombinationsOfSize(pairs, 2).filter(
      (concurrent) =>
        concurrent.length === 1 ||
        new Set(concurrent.flat()).size === concurrent.length * 2,
    )
  );

  const games = getConcurrentGames(
    numberOfPlayers,
    numberOfFields,
    participants.filter((player) => singlesEligible.has(player)).length,
  );

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
  /** players who may be picked for a single; defaults to every participant */
  singlesEligible?: ReadonlySet<string>;
  /** per round already played: who had opted out of singles then. A round
   *  without an entry is read as nobody having opted out. */
  optedOutSinglesByRound?: ReadonlyMap<number, ReadonlySet<string>>;
};

export function pairKey(pair: readonly [string, string]): string {
  return pair[0] <= pair[1]
    ? `${pair[0]}-${pair[1]}`
    : `${pair[1]}-${pair[0]}`;
}

export function gameKey(game: Single | Double) {
  return game.type === "single"
    ? pairKey(game.players)
    : pairKey([pairKey(game.players[0]), pairKey(game.players[1])]);
}

export function addOne(map: Map<string, number>, key: string) {
  map.set(key, map.has(key) ? map.get(key)! + 1 : 1);
}

/**
 * Scenario score = sum of `count * weight` over its games. A negative weight
 * is a penalty, a positive one a bonus. `per...` weights are multiplied by a
 * count, the others apply once. "Extra" means above the lowest count in the
 * group (fewest breaks, least used pair, ...), so the magnitudes stay bounded
 * no matter how long the session runs and the weights can be compared
 * directly against each other. Listed by magnitude, strongest first.
 *
 * `recentGame` fades by `recentGame / recency.gameRounds` per round. That
 * step must stay above `keptPair`: keeping both pairs of last round's game is
 * the same game again, and that has to lose against a game from a few rounds
 * ago even when it keeps no pair.
 */
type Parameters = {
  weights: {
    /** per break a player has above the fewest */
    perExtraBreak: number;
    /** game played in the previous round, fading linearly to 0 after
     *  `recency.gameRounds` rounds */
    recentGame: number;
    /** same players on field as in one of the last
     *  `recency.fieldPlayersRounds` rounds */
    recentFieldPlayers: number;
    /** per round the player was already on break directly before */
    perConsecutiveBreak: number;
    /** per single a player has above the fewest */
    perExtraSingle: number;
    /** pair kept from the previous round, while at most 1 game above the
     *  least used pair */
    keptPair: number;
    /** per time the same game was played before, however long ago */
    perGameRepeat: number;
    /** per game a pair has played together above the least used pair */
    perExtraPairGame: number;
    /** per game two players met as opponents above the least met pair */
    perExtraOpponentGame: number;
  };
  /** how many rounds back still count as "recent" */
  recency: {
    gameRounds: number;
    fieldPlayersRounds: number;
  };
};

const defaultParameters: Parameters = {
  weights: {
    perExtraBreak: -3000,
    recentGame: -3200,
    recentFieldPlayers: -2000,
    perConsecutiveBreak: -1500,
    perExtraSingle: -800,
    keptPair: 250,
    perGameRepeat: -150,
    perExtraPairGame: -100,
    perExtraOpponentGame: -30,
  },
  recency: {
    gameRounds: 8,
    fieldPlayersRounds: 3,
  },
};

function minOf(map: Map<string, number>, universeSize: number): number {
  return map.size < universeSize ? 0 : findMinMax(map, { min: 0 }).min;
}

function minOverPlayers(
  map: Map<string, number>,
  players: readonly string[],
): number {
  let min = Infinity;
  for (const player of players) {
    min = Math.min(min, map.get(player) ?? 0);
  }
  return min === Infinity ? 0 : min;
}

function fieldPlayersKey(players: Iterable<string>): string {
  return [...players].sort().join("-");
}

/**
 * Everything the scoring needs to know about the history, counted once.
 * Independent of the weights, so it can be inspected on its own.
 *
 * Breaks and singles are counted from the round a player entered, not from the
 * start of the session: on entry a player's counters are raised to the lowest
 * among the players already there. Without that a player joining an ongoing
 * session arrives at 0 against everyone else's session total, and the scoring
 * closes that gap by benching them or feeding them singles for round after
 * round. Singles have their own entry: a player counts as entering them the
 * round they first play singles at all, so opting in mid-session is treated
 * like arriving mid-session rather than like a long singles drought. The pair
 * counters are left alone - a pair that has never played is genuinely new, and
 * covering it is what the variety weights are for.
 */
type HistoryFacts = {
  previousRound: number;
  /** pairs that played together in the previous round */
  pairsOfPreviousRound: Set<string>;
  numberOf: {
    /** per player: rounds on break since entering */
    breaksByPlayer: Map<string, number>;
    /** per player who was on break in the previous round: rounds on break
     *  directly before, that one included */
    consecutiveBreaksByPlayer: Map<string, number>;
    /** per player: singles played since entering */
    singlesByPlayer: Map<string, number>;
    /** per pair: games played together */
    gamesByPair: Map<string, number>;
    /** per pair: games where the two met as opponents */
    gamesByOpponents: Map<string, number>;
    /** per game: times it was played */
    occurrencesByGame: Map<string, number>;
  };
  /** lowest of the corresponding `numberOf` over all players or pairs -
   *  `singles` over the singles-eligible players only */
  min: {
    breaks: number;
    singles: number;
    gamesByPair: number;
    gamesByOpponents: number;
  };
  lastRound: {
    /** per game: when it was played last */
    byGame: Map<string, number>;
    /** per set of players on field: when they were on field together last */
    byFieldPlayers: Map<string, number>;
  };
};

function collectHistoryFacts(context: Context): HistoryFacts {
  const numberOfBreaksByPlayer = new Map<string, number>();
  const numberOfConsecutiveBreaksByPlayer = new Map<string, number>();
  const numberOfSinglesByPlayer = new Map<string, number>();
  const numberOfGamesByPair = new Map<string, number>();
  const pairsOfPreviousRound = new Set<string>();
  const numberOfGamesByOpponents = new Map<string, number>();
  const numberOfOccurrencesByGame = new Map<string, number>();
  const lastRoundByGame = new Map<string, number>();
  const lastRoundByFieldPlayers = new Map<string, number>();
  const breakPlayersByRound = new Map<number, Set<string>>();
  const fieldPlayersByRound = new Map<number, Set<string>>();

  const participants = new Set<string>();
  for (const game of context.allScenarios[0] ?? []) {
    for (const player of game.players.flat()) {
      participants.add(player);
    }
  }
  const numberOfPairs = (participants.size * (participants.size - 1)) / 2;

  // players who have opted out of singles never appear in one, so their singles
  // counter stays at whatever it entered with. Left in the singles accounting
  // they would hold its minimum down forever while everyone else climbs, and
  // the gaps the weights are calibrated against would grow without bound.
  const singlesEligible = context.singlesEligible ?? participants;
  const eligiblePlayers = [...participants].filter((player) =>
    singlesEligible.has(player),
  );

  const resultsByRound = new Map<number, FinishedGame[]>();
  for (const result of context.history) {
    let bucket = resultsByRound.get(result.round);
    if (!bucket) {
      bucket = [];
      resultsByRound.set(result.round, bucket);
    }
    bucket.push(result);
  }
  const roundsInOrder = [...resultsByRound.keys()].sort((a, b) => a - b);

  const previousRound = roundsInOrder[roundsInOrder.length - 1] ?? 0;

  /**
   * Put players entering a counter's group on the same footing as the ones
   * already in it, so what came before they arrived neither credits nor
   * charges them. Counters are only ever raised, never lowered, so someone
   * returning to a group keeps what they already earned there.
   */
  const raiseToFloor = (
    counters: Map<string, number>,
    entering: readonly string[],
    incumbents: readonly string[],
  ) => {
    if (entering.length === 0) {
      return;
    }
    const floor = minOverPlayers(counters, incumbents);
    for (const player of entering) {
      counters.set(player, Math.max(counters.get(player) ?? 0, floor));
    }
  };

  const entrants = (group: readonly string[], previous: readonly string[]) =>
    group.filter((player) => !previous.includes(player));

  // breaks are counted over everyone present, singles only over the players
  // eligible for them that round - a player who opts in mid-session enters the
  // singles group exactly the way a late arrival enters the session, and
  // without that would carry a frozen count that the scoring would then spend
  // round after round trying to close
  let playersOfPreviousRound: string[] = [];
  let singlesPlayersOfPreviousRound: string[] = [];

  for (const round of roundsInOrder) {
    const results = resultsByRound.get(round)!;

    const present = new Set<string>();
    for (const result of results) {
      for (const player of result.type === "break"
        ? result.players
        : result.players.flat()) {
        present.add(player);
      }
    }

    const optedOut = context.optedOutSinglesByRound?.get(round);
    const singlesPlayers = [...present].filter(
      (player) => !optedOut?.has(player),
    );

    raiseToFloor(
      numberOfBreaksByPlayer,
      entrants([...present], playersOfPreviousRound),
      playersOfPreviousRound,
    );
    raiseToFloor(
      numberOfSinglesByPlayer,
      entrants(singlesPlayers, singlesPlayersOfPreviousRound),
      singlesPlayersOfPreviousRound,
    );

    for (const result of results) {
      if (result.type === "break") {
        let breakers = breakPlayersByRound.get(result.round);
        if (!breakers) {
          breakers = new Set();
          breakPlayersByRound.set(result.round, breakers);
        }
        for (const player of result.players) {
          addOne(numberOfBreaksByPlayer, player);
          breakers.add(player);
        }
      } else {
        let onField = fieldPlayersByRound.get(result.round);
        if (!onField) {
          onField = new Set();
          fieldPlayersByRound.set(result.round, onField);
        }
        for (const player of result.players.flat()) {
          onField.add(player);
        }

        const key = gameKey(result);
        addOne(numberOfOccurrencesByGame, key);
        lastRoundByGame.set(
          key,
          Math.max(lastRoundByGame.get(key) ?? 0, result.round),
        );

        if (result.type === "single") {
          for (const player of result.players) {
            addOne(numberOfSinglesByPlayer, player);
          }
          addOne(numberOfGamesByOpponents, pairKey(result.players));
        } else {
          const pairOneKey = pairKey(result.players[0]);
          const pairTwoKey = pairKey(result.players[1]);

          if (context.gameIdsForPreviousScenario.has(result.id)) {
            pairsOfPreviousRound.add(pairOneKey);
            pairsOfPreviousRound.add(pairTwoKey);
          }

          addOne(numberOfGamesByPair, pairOneKey);
          addOne(numberOfGamesByPair, pairTwoKey);

          for (const one of result.players[0]) {
            for (const two of result.players[1]) {
              addOne(numberOfGamesByOpponents, pairKey([one, two]));
            }
          }
        }
      }
    }

    playersOfPreviousRound = [...present];
    singlesPlayersOfPreviousRound = singlesPlayers;
  }

  // the round being computed now: anyone on the roster who was not in the last
  // recorded round is arriving, and anyone eligible for singles who was not
  // eligible then is entering the singles group
  raiseToFloor(
    numberOfBreaksByPlayer,
    entrants([...participants], playersOfPreviousRound),
    playersOfPreviousRound,
  );
  raiseToFloor(
    numberOfSinglesByPlayer,
    entrants(eligiblePlayers, singlesPlayersOfPreviousRound),
    singlesPlayersOfPreviousRound,
  );

  for (const player of breakPlayersByRound.get(previousRound) ?? []) {
    let consecutive = 1;
    for (let r = previousRound - 1; r >= 0; r--) {
      if (breakPlayersByRound.get(r)?.has(player)) {
        consecutive++;
      } else {
        break;
      }
    }
    numberOfConsecutiveBreaksByPlayer.set(player, consecutive);
  }

  for (const [round, onField] of fieldPlayersByRound) {
    const key = fieldPlayersKey(onField);
    lastRoundByFieldPlayers.set(
      key,
      Math.max(lastRoundByFieldPlayers.get(key) ?? 0, round),
    );
  }

  return {
    previousRound,
    pairsOfPreviousRound,
    numberOf: {
      breaksByPlayer: numberOfBreaksByPlayer,
      consecutiveBreaksByPlayer: numberOfConsecutiveBreaksByPlayer,
      singlesByPlayer: numberOfSinglesByPlayer,
      gamesByPair: numberOfGamesByPair,
      gamesByOpponents: numberOfGamesByOpponents,
      occurrencesByGame: numberOfOccurrencesByGame,
    },
    min: {
      breaks: minOf(numberOfBreaksByPlayer, participants.size),
      singles: minOverPlayers(numberOfSinglesByPlayer, eligiblePlayers),
      gamesByPair: minOf(numberOfGamesByPair, numberOfPairs),
      gamesByOpponents: minOf(numberOfGamesByOpponents, numberOfPairs),
    },
    lastRound: {
      byGame: lastRoundByGame,
      byFieldPlayers: lastRoundByFieldPlayers,
    },
  };
}

function scoreScenario(
  scenario: Scenario,
  facts: HistoryFacts,
  { weights, recency }: Parameters,
): number {
  const breakScoring = (player: string): number => {
    const gap =
      (facts.numberOf.breaksByPlayer.get(player) ?? 0) - facts.min.breaks;
    const consecutive =
      facts.numberOf.consecutiveBreaksByPlayer.get(player) ?? 0;
    return (
      gap * weights.perExtraBreak +
      consecutive * weights.perConsecutiveBreak
    );
  };

  const repeatScoring = (game: Single | Double): number => {
    const key = gameKey(game);
    const lastRound = facts.lastRound.byGame.get(key);
    if (lastRound === undefined) {
      return 0;
    }
    const roundsAgo = facts.previousRound - lastRound + 1;
    const recentShare =
      Math.max(0, recency.gameRounds + 1 - roundsAgo) / recency.gameRounds;
    return (
      recentShare * weights.recentGame +
      facts.numberOf.occurrencesByGame.get(key)! * weights.perGameRepeat
    );
  };

  const opponentScoring = (one: string, two: string): number => {
    const gap =
      (facts.numberOf.gamesByOpponents.get(pairKey([one, two])) ?? 0) -
      facts.min.gamesByOpponents;
    return gap * weights.perExtraOpponentGame;
  };

  const singleScoring = (single: Single): number => {
    let output = opponentScoring(single.players[0], single.players[1]);
    for (const player of single.players) {
      const gap =
        (facts.numberOf.singlesByPlayer.get(player) ?? 0) - facts.min.singles;
      output += gap * weights.perExtraSingle;
    }
    return output;
  };

  const doubleScoring = (double: Double): number => {
    let output = 0;
    for (const pair of double.players) {
      const key = pairKey(pair);
      const gap =
        (facts.numberOf.gamesByPair.get(key) ?? 0) - facts.min.gamesByPair;
      output += gap * weights.perExtraPairGame;
      if (gap < 2 && facts.pairsOfPreviousRound.has(key)) {
        output += weights.keptPair;
      }
    }
    for (const one of double.players[0]) {
      for (const two of double.players[1]) {
        output += opponentScoring(one, two);
      }
    }
    return output;
  };

  const fieldPlayersScoring = (onField: string[]): number => {
    const lastRound = facts.lastRound.byFieldPlayers.get(
      fieldPlayersKey(onField),
    );
    return lastRound !== undefined &&
      facts.previousRound - lastRound < recency.fieldPlayersRounds
      ? weights.recentFieldPlayers
      : 0;
  };

  let score = 0;
  const onField: string[] = [];
  for (const game of scenario) {
    if (game.type === "break") {
      for (const player of game.players) {
        score += breakScoring(player);
      }
    } else {
      onField.push(...game.players.flat());
      score += repeatScoring(game);
      score +=
        game.type === "single" ? singleScoring(game) : doubleScoring(game);
    }
  }
  score += fieldPlayersScoring(onField);

  return score;
}

export function computeNextScenario(
  context: Context,
  parameters: Parameters = defaultParameters,
): {
  chosen: Scenario;
  alternatives: Scenario[];
} {
  const facts = collectHistoryFacts(context);

  const scored = new Map<number, Set<Scenario>>();
  for (const scenario of context.allScenarios) {
    const score = scoreScenario(scenario, facts, parameters);
    scored.set(score, (scored.get(score) ?? new Set()).add(scenario));
  }

  const sortedScores = [...scored.keys()].sort((a, b) => b - a);

  const bestScenarios = scored.get(sortedScores[0])!;

  console.debug(`scored scenario groups: ${scored.size}`);
  console.debug(
    `max score: ${sortedScores[0]} with ${bestScenarios.size} scenarios`,
  );

  const alternatives = [...bestScenarios];
  const chosen = alternatives[Math.floor(Math.random() * alternatives.length)];

  return { chosen, alternatives };
}
