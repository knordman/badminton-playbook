import { consoleLogHistory, generateHistory } from "./debug";

const players = ["A", "B", "C", "D", "E", "F", "G"];

consoleLogHistory(
  generateHistory({ players, numberOfFields: 2, rounds: 14 })
  // {
  //   gamesPlayed: true,
  //   numberOfGamesByPair: true,
  // }
);
