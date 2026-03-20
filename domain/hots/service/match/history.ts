import { prisma } from "@/config/prisma";
import { fetchPlayerMap } from "@/app/api/stats/utils/player";
import type { MatchHistoryItem } from "@/domain/hots/types/match-contract";
import { resolveTalentPicks } from "@/domain/hots/service/talent-resolver";
import { Prisma } from "@/generated/prisma/client";
import { buildRankedPlayerMap } from "./score";
import { toPlayerStats } from "./common";

export async function getMatchHistory(take: number): Promise<MatchHistoryItem[]> {
  const playerMap = await fetchPlayerMap();

  const matches = await prisma.match.findMany({
    orderBy: {
      playedAt: "desc",
    },
    take,
    select: {
      id: true,
      playedAt: true,
      type: true,
      winnerTeamNumber: true,
      youtubeUrl: true,
      highlights: {
        orderBy: [{ seconds: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          seconds: true,
          note: true,
          createdAt: true,
        },
      },
      teams: {
        orderBy: {
          teamNumber: "asc",
        },
        select: {
          id: true,
          teamNumber: true,
          leaderId: true,
          members: {
            select: {
              playerId: true,
            },
          },
        },
      },
      games: {
        orderBy: {
          gameNumber: "asc",
        },
        select: {
          id: true,
          gameNumber: true,
          gameLength: true,
          map: true,
          winnerTeamNumber: true,
          teams: {
            orderBy: {
              teamNumber: "asc",
            },
            select: {
              id: true,
              teamNumber: true,
              result: true,
              teamLevel: true,
              bans: {
                orderBy: {
                  banOrder: "asc",
                },
                select: {
                  banOrder: true,
                  hero: true,
                },
              },
              members: {
                select: {
                  id: true,
                  hero: true,
                  position: true,
                  kills: true,
                  deaths: true,
                  takedowns: true,
                  heroDamage: true,
                  siegeDamage: true,
                  healingDone: true,
                  experienceContribution: true,
                  damageTaken: true,
                  timeCCdEnemyHeroes: true,
                  timeSpentDead: true,
                  mercCampCaptures: true,
                  watchTowerCaptures: true,
                  playerId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const memberIds = matches.flatMap((match) =>
    match.games.flatMap((game) => game.teams.flatMap((team) => team.members.map((member) => member.id))),
  );
  const talentRows =
    memberIds.length > 0
      ? await prisma.$queryRaw<
          ReadonlyArray<{
            gameTeamMemberId: string;
            tier: number;
            rawCode: string;
            talentKey: string | null;
          }>
        >(Prisma.sql`
          SELECT "gameTeamMemberId", "tier", "rawCode", "talentKey"
          FROM "game_team_member_talents"
          WHERE "gameTeamMemberId" IN (${Prisma.join(memberIds)})
          ORDER BY "tier" ASC
        `)
      : [];

  const talentMap = talentRows.reduce(
    (acc, row) => {
      const list = acc.get(row.gameTeamMemberId) ?? [];
      list.push(row);
      acc.set(row.gameTeamMemberId, list);
      return acc;
    },
    new Map<string, Array<(typeof talentRows)[number]>>(),
  );

  return matches.map((match) => ({
    id: match.id,
    playedAt: match.playedAt.toISOString(),
    type: match.type,
    winnerTeamNumber: match.winnerTeamNumber,
    youtubeUrl: match.youtubeUrl ?? null,
    highlights: (match.highlights ?? []).map((highlight) => ({
      id: highlight.id,
      seconds: highlight.seconds,
      note: highlight.note,
      createdAt: highlight.createdAt.toISOString(),
    })),
    teams: match.teams.map((team) => ({
      id: team.id,
      teamNumber: team.teamNumber,
      leader: playerMap.get(team.leaderId)!,
      members: team.members.map((member) => playerMap.get(member.playerId)!),
    })),
    games: match.games.map((game) => {
      const rankedMap = buildRankedPlayerMap(
        game.teams.flatMap((gameTeam) => gameTeam.members.map((member) => toPlayerStats(member))),
      );

      return {
        id: game.id,
        gameNumber: game.gameNumber,
        gameLength: game.gameLength,
        map: game.map,
        winnerTeamNumber: game.winnerTeamNumber,
        teams: game.teams.map((team) => ({
          id: team.id,
          teamNumber: team.teamNumber,
          result: team.result,
          teamLevel: team.teamLevel,
          bans: team.bans.map((ban) => ({
            banOrder: ban.banOrder,
            hero: ban.hero,
          })),
          members: team.members.map((member) => {
            const ranked = rankedMap.get(member.id);
            const playerStats = toPlayerStats(member);

            return {
              ...playerStats,
              player: playerMap.get(member.playerId)!,
              hero: member.hero,
              talents: resolveTalentPicks(member.hero, talentMap.get(member.id) ?? []),
              rank: ranked?.rank ?? 0,
              rankScore: ranked?.totalScore ?? 0,
            };
          }),
        })),
      };
    }),
  }));
}
