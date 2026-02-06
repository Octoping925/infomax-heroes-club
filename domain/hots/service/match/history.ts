import { prisma } from "@/config/prisma";
import { fetchPlayerMap } from "@/app/api/stats/utils/player";
import type { MatchHistoryItem } from "@/domain/hots/types/match-contract";
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

  return matches.map((match) => ({
    id: match.id,
    playedAt: match.playedAt.toISOString(),
    type: match.type,
    winnerTeamNumber: match.winnerTeamNumber,
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
              rank: ranked?.rank ?? 0,
              rankScore: ranked?.totalScore ?? 0,
            };
          }),
        })),
      };
    }),
  }));
}
