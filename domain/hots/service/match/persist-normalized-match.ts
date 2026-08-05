import type { Prisma } from "@/generated/prisma/client";
import type { MatchType } from "@/generated/prisma/enums";
import type { NormalizedPlayer } from "@/domain/hots/types/replay-import-contract";
import { calculateGameResult } from "./common";
import { MatchServiceError } from "./errors";
import { insertGameTeamMemberTalents } from "./talent-sql";

export type PersistPlayer = Omit<NormalizedPlayer, "nickname"> & {
  readonly playerId: string;
};

export type PersistTeam = {
  readonly teamNumber: 1 | 2;
  readonly sourceTeamNumber: 1 | 2;
  readonly teamLevel: number;
  readonly players: ReadonlyArray<PersistPlayer>;
  readonly bans: NormalizedPlayer["hero"][];
};

export type PersistGame = {
  readonly gameNumber: number;
  readonly gameLength: number;
  readonly map: import("@/generated/prisma/enums").GameMap;
  readonly winnerTeamNumber: number | null;
  readonly sourceReplayHash: string | null;
  readonly teams: readonly [PersistTeam, PersistTeam];
};

export type PersistMatchInput = {
  readonly type: MatchType;
  readonly playedAt: Date;
  readonly replayImportFingerprint: string | null;
  readonly team1LeaderId: string;
  readonly team2LeaderId: string;
  readonly originalTeam1PlayerIds: ReadonlyArray<string>;
  readonly originalTeam2PlayerIds: ReadonlyArray<string>;
  readonly games: ReadonlyArray<PersistGame>;
};

export async function persistNormalizedMatch(
  tx: Prisma.TransactionClient,
  input: PersistMatchInput,
): Promise<{ readonly id: string }> {
  validatePersistenceInput(input);
  const winnerTeamNumber = calculateMatchWinner(input.games);
  const match = await tx.match.create({
    data: {
      type: input.type,
      playedAt: input.playedAt,
      winnerTeamNumber,
      replayImportFingerprint: input.replayImportFingerprint,
    },
  });

  const createdTeams = await tx.matchTeam.createManyAndReturn({
    data: [
      { matchId: match.id, teamNumber: 1, leaderId: input.team1LeaderId },
      { matchId: match.id, teamNumber: 2, leaderId: input.team2LeaderId },
    ],
  });
  const matchTeamByNumber = new Map(createdTeams.map((team) => [team.teamNumber, team.id]));
  const matchTeam1Id = matchTeamByNumber.get(1);
  const matchTeam2Id = matchTeamByNumber.get(2);
  if (!matchTeam1Id || !matchTeam2Id) {
    throw new MatchServiceError("매치 팀 생성 결과가 올바르지 않습니다.", 500);
  }

  await tx.matchTeamMember.createMany({
    data: [
      ...input.originalTeam1PlayerIds.map((playerId) => ({ matchTeamId: matchTeam1Id, playerId })),
      ...input.originalTeam2PlayerIds.map((playerId) => ({ matchTeamId: matchTeam2Id, playerId })),
    ],
  });

  for (const game of input.games) {
    const createdGame = await tx.game.create({
      data: {
        matchId: match.id,
        gameNumber: game.gameNumber,
        gameLength: game.gameLength,
        map: game.map,
        winnerTeamNumber: game.winnerTeamNumber,
        sourceReplayHash: game.sourceReplayHash,
      },
    });

    for (const team of game.teams) {
      const sourceMatchTeamId = team.sourceTeamNumber === 1 ? matchTeam1Id : matchTeam2Id;
      const gameTeam = await tx.gameTeam.create({
        data: {
          gameId: createdGame.id,
          teamNumber: team.teamNumber,
          sourceMatchTeamId,
          result: calculateGameResult(team.teamNumber, game.winnerTeamNumber),
          teamLevel: team.teamLevel,
        },
      });
      const createdMembers = await tx.gameTeamMember.createManyAndReturn({
        data: team.players.map((player) => ({
          gameTeamId: gameTeam.id,
          playerId: player.playerId,
          hero: player.hero,
          position: player.position,
          kills: player.kills,
          deaths: player.deaths,
          takedowns: player.takedowns,
          heroDamage: player.heroDamage,
          siegeDamage: player.siegeDamage,
          damageTaken: player.damageTaken,
          healingDone: player.healingDone,
          experienceContribution: player.experienceContribution,
          timeSpentDead: player.timeSpentDead,
          timeCCdEnemyHeroes: player.timeCCdEnemyHeroes,
          dpm: player.dpm,
          mercCampCaptures: player.mercCampCaptures,
          watchTowerCaptures: player.watchTowerCaptures,
          regenGlobes: player.regenGlobes,
        })),
      });
      const playerById = new Map(team.players.map((player) => [player.playerId, player]));
      await insertGameTeamMemberTalents(
        tx,
        createdMembers.flatMap((member) =>
          (playerById.get(member.playerId)?.talents ?? []).map((talent) => ({
            gameTeamMemberId: member.id,
            ...talent,
          })),
        ),
      );
      if (team.bans.length > 0) {
        await tx.gameTeamBan.createMany({
          data: team.bans.map((hero, index) => ({ gameTeamId: gameTeam.id, hero, banOrder: index + 1 })),
        });
      }
    }
  }

  return match;
}

function validatePersistenceInput(input: PersistMatchInput): void {
  if (input.games.length === 0) {
    throw new MatchServiceError("최소 1개 이상의 게임이 필요합니다.");
  }
  if (input.team1LeaderId === input.team2LeaderId) {
    throw new MatchServiceError("두 팀 리더는 달라야 합니다.");
  }
  const team1 = new Set(input.originalTeam1PlayerIds);
  const team2 = new Set(input.originalTeam2PlayerIds);
  if (team1.size !== input.originalTeam1PlayerIds.length || team2.size !== input.originalTeam2PlayerIds.length) {
    throw new MatchServiceError("원래 팀에 중복 플레이어가 있습니다.");
  }
  if (input.originalTeam1PlayerIds.some((id) => team2.has(id))) {
    throw new MatchServiceError("두 원래 팀에 같은 플레이어가 포함될 수 없습니다.");
  }
  if (!team1.has(input.team1LeaderId) || !team2.has(input.team2LeaderId)) {
    throw new MatchServiceError("리더는 각 원래 팀의 멤버여야 합니다.");
  }
}

function calculateMatchWinner(games: ReadonlyArray<PersistGame>): number | null {
  let team1Wins = 0;
  let team2Wins = 0;
  for (const game of games) {
    if (game.winnerTeamNumber === null) {
      continue;
    }
    const winner = game.teams.find((team) => team.teamNumber === game.winnerTeamNumber)?.sourceTeamNumber;
    if (winner === 1) team1Wins += 1;
    if (winner === 2) team2Wins += 1;
  }
  return team1Wins > team2Wins ? 1 : team2Wins > team1Wins ? 2 : null;
}
