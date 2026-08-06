export const REPLAY_PLAYER_ALIASES: Readonly<Record<string, string>> = {
  자양동스나이퍼: "greatjyp",
  BrownOgre: "maunkong",
};

export function getSuggestedPlayerNickname(rawName: string): string | null {
  return REPLAY_PLAYER_ALIASES[rawName] ?? null;
}
