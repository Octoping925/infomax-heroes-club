import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { GameResult } from "@/generated/prisma/client";
import { Hero } from "@/domain/hots/models";
import { HERO_CATALOG } from "@/domain/hots/constants";
import { HeroCounterPickResponse } from "@/app/api/stats/types";
import { calculateWinRate } from "@/utils/win-rate";
import { updateCountsByResult } from "@/app/api/stats/utils/stats";

type ResultCounts = {
  total: number;
  wins: number;
  losses: number;
  draws: number;
};

const MIN_MATCHUP_GAMES = 5;
const MAX_COUNTERS_PER_HERO = 5;

/**
 * 카운터픽 통계 조회
 * GET /api/stats/heroes/counter-picks
 */
export async function GET(): Promise<NextResponse<HeroCounterPickResponse[]>> {
  const games = await prisma.game.findMany({
    select: {
      teams: {
        select: {
          teamNumber: true,
          result: true,
          members: {
            select: {
              hero: true,
            },
          },
        },
      },
    },
  });

  const overallByHero = new Map<Hero, ResultCounts>();
  const matchupByHero = new Map<Hero, Map<Hero, ResultCounts>>();

  for (const game of games) {
    const team1 = game.teams.find((team) => team.teamNumber === 1);
    const team2 = game.teams.find((team) => team.teamNumber === 2);

    if (!team1 || !team2) {
      continue;
    }

    for (const member of team1.members) {
      updateResultCounts(overallByHero, member.hero, team1.result);

      for (const opponent of team2.members) {
        updateMatchupCounts(matchupByHero, member.hero, opponent.hero, team1.result);
      }
    }

    for (const member of team2.members) {
      updateResultCounts(overallByHero, member.hero, team2.result);

      for (const opponent of team1.members) {
        updateMatchupCounts(matchupByHero, member.hero, opponent.hero, team2.result);
      }
    }
  }

  const rows: HeroCounterPickResponse[] = Array.from(overallByHero.entries(), ([hero, overall]) => {
    const baseWinRate = calculateWinRate(overall.wins, overall.losses, overall.draws);
    const opponentMap = matchupByHero.get(hero);

    const counters =
      opponentMap === undefined
        ? []
        : opponentMap
            .entries()
            .map(([opponentHero, counts]) => {
              const winRate = calculateWinRate(counts.wins, counts.losses, counts.draws);
              const dropPercentPoint = baseWinRate - winRate;

              return {
                opponentHero,
                opponentHeroName: HERO_CATALOG[opponentHero].nameKo,
                games: counts.total,
                wins: counts.wins,
                losses: counts.losses,
                draws: counts.draws,
                winRate,
                dropPercentPoint,
              };
            })
            .filter((item) => item.games >= MIN_MATCHUP_GAMES && item.dropPercentPoint > 0)
            .toArray()
            .toSorted((a, b) => b.dropPercentPoint - a.dropPercentPoint || b.games - a.games)
            .slice(0, MAX_COUNTERS_PER_HERO)
            .map((item) => ({
              ...item,
              winRate: roundToOneDecimal(item.winRate),
              dropPercentPoint: roundToOneDecimal(item.dropPercentPoint),
            }));

    return {
      hero,
      heroName: HERO_CATALOG[hero].nameKo,
      position: HERO_CATALOG[hero].role,
      totalGames: overall.total,
      baseWinRate: roundToOneDecimal(baseWinRate),
      counters,
    };
  }).toSorted((a, b) => b.totalGames - a.totalGames || b.baseWinRate - a.baseWinRate);

  return NextResponse.json(rows);
}

function updateResultCounts(map: Map<Hero, ResultCounts>, hero: Hero, result: GameResult): void {
  const current = map.get(hero) ?? createEmptyCounts();
  current.total++;
  updateCountsByResult(current, result);
  map.set(hero, current);
}

function updateMatchupCounts(
  map: Map<Hero, Map<Hero, ResultCounts>>,
  hero: Hero,
  opponentHero: Hero,
  result: GameResult,
): void {
  const heroMap = map.get(hero) ?? new Map<Hero, ResultCounts>();
  const current = heroMap.get(opponentHero) ?? createEmptyCounts();
  current.total++;
  updateCountsByResult(current, result);
  heroMap.set(opponentHero, current);
  map.set(hero, heroMap);
}

function createEmptyCounts(): ResultCounts {
  return { total: 0, wins: 0, losses: 0, draws: 0 };
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
