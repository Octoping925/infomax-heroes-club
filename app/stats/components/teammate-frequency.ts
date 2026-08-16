import type { TeamingPairStatResponse, TeamingPlayerProfileResponse } from "@/app/api/stats/types";

type TeammatePlayer = Pick<TeamingPlayerProfileResponse, "playerId" | "playerName" | "playerNickname">;

export type TeammateRow = {
  readonly player: TeammatePlayer;
  readonly encounterMatches: number;
  readonly sameTeamMatches: number;
  readonly sameTeamRate: number;
};

export function buildTeammateRows(
  selectedPlayerId: string,
  players: ReadonlyArray<TeammatePlayer>,
  pairs: ReadonlyArray<TeamingPairStatResponse>,
): TeammateRow[] {
  const playerById = new Map(players.map((player) => [player.playerId, player]));

  return pairs
    .flatMap((pair) => {
      const otherPlayerId =
        pair.playerAId === selectedPlayerId
          ? pair.playerBId
          : pair.playerBId === selectedPlayerId
            ? pair.playerAId
            : null;
      const player = otherPlayerId ? playerById.get(otherPlayerId) : undefined;

      return player ? [{ player, ...pair.allTime }] : [];
    })
    .toSorted(
      (left, right) =>
        right.sameTeamRate - left.sameTeamRate ||
        right.sameTeamMatches - left.sameTeamMatches ||
        left.player.playerNickname.localeCompare(right.player.playerNickname),
    );
}
