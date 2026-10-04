export const GameResult = {
  WIN: "WIN",
  LOSE: "LOSE",
  DRAW: "DRAW",
} as const satisfies Record<GameResult, GameResult>;

export type GameResult = "WIN" | "LOSE" | "DRAW";

export const MatchType = {
  LUNCH: "LUNCH",
  DINNER: "DINNER",
} as const satisfies Record<MatchType, MatchType>;

export type MatchType = "LUNCH" | "DINNER";
