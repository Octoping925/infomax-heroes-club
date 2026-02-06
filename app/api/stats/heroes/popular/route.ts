import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { GameResult } from "@/generated/prisma/client";
import { HeroTierLabel, HeroTierResponse } from "@/app/api/stats/types";
import { calculateWinRate } from "@/utils/win-rate";
import { Hero } from "@/domain/hots/models";
import { groupBy } from "@/utils/groupBy";
import { HeroPositionMap } from "@/domain/hots/constants/hero";
import { HeroMap } from "@/domain/hots/constants";
import { calculateConservativeWinRateScore } from "@/app/stats/utils/conservative-win-rate";
import { round } from "es-toolkit";

/**
 * 영웅 티어리스트 통계 조회
 * GET /api/stats/heroes/popular
 */
export async function GET(): Promise<NextResponse<HeroTierResponse[]>> {
  const [pickStats, banCounts] = await Promise.all([fetchPickStats(), fetchBanCounts()]);
  const heroTiers = buildHeroTiers(pickStats, banCounts);
  return NextResponse.json(heroTiers);
}

type PickStat = {
  hero: Hero;
  result: GameResult;
};

async function fetchPickStats(): Promise<PickStat[]> {
  const picks = await prisma.gameTeamMember.findMany({
    select: {
      hero: true,
      gameTeam: {
        select: {
          result: true,
        },
      },
    },
  });

  return picks.map((pick) => ({
    hero: pick.hero,
    result: pick.gameTeam.result,
  }));
}

async function fetchBanCounts(): Promise<Map<Hero, number>> {
  const bans = await prisma.gameTeamBan.groupBy({
    by: ["hero"],
    _count: {
      hero: true,
    },
  });

  return groupBy(
    bans,
    (ban) => ban.hero,
    (ban) => ban._count.hero,
  );
}

function buildHeroTiers(pickStats: PickStat[], banCounts: Map<Hero, number>): HeroTierResponse[] {
  const heroPickMap = new Map<Hero, { total: number; wins: number; losses: number; draws: number }>();

  for (const pick of pickStats) {
    const current = heroPickMap.get(pick.hero) ?? {
      total: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    };

    current.total++;

    if (pick.result === GameResult.WIN) {
      current.wins++;
    } else if (pick.result === GameResult.LOSE) {
      current.losses++;
    } else {
      current.draws++;
    }

    heroPickMap.set(pick.hero, current);
  }

  const allHeroes = new Set<Hero>([...heroPickMap.keys(), ...banCounts.keys()]);
  const totalPickCount = pickStats.length;
  const totalBanCount = Array.from(banCounts.values()).reduce((sum, count) => sum + count, 0);

  const rows = Array.from(allHeroes, (hero) => {
    const pickStat = heroPickMap.get(hero) ?? {
      total: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    };

    const banCount = banCounts.get(hero) ?? 0;
    const pickRate = totalPickCount === 0 ? 0 : (pickStat.total / totalPickCount) * 100;
    const banRate = totalBanCount === 0 ? 0 : (banCount / totalBanCount) * 100;
    const pickWinRate = calculateWinRate(pickStat.wins, pickStat.losses, pickStat.draws);
    const conservativeWinRateScore = calculateConservativeWinRateScore(
      {
        totalGames: pickStat.total,
        wins: pickStat.wins,
        losses: pickStat.losses,
        draws: pickStat.draws,
        winRate: pickWinRate,
      },
      {
        priorGamesK: 5,
        zScore: 1.645,
      },
    );
    const tierScore = conservativeWinRateScore * 0.5 + pickRate * 0.3 + banRate * 0.2;
    const position = HeroPositionMap[hero];

    return {
      hero,
      heroName: HeroMap[hero],
      position,
      pickCount: pickStat.total,
      banCount,
      wins: pickStat.wins,
      losses: pickStat.losses,
      draws: pickStat.draws,
      pickRate: round(pickRate, 1),
      banRate: round(banRate, 1),
      pickWinRate,
      conservativeWinRateScore,
      tierScore,
    };
  }).toSorted((a, b) => b.tierScore - a.tierScore);

  const maxIndex = Math.max(rows.length - 1, 1);
  const honeyCandidates = rows.filter((row) => row.pickCount >= HONEY_MIN_PICK);
  const winRateCutoff = getPercentile(
    honeyCandidates.map((row) => row.conservativeWinRateScore),
    0.65,
  );
  const banRateCutoff = getPercentile(
    honeyCandidates.map((row) => row.banRate),
    0.75,
  );

  return rows.map((row, index) => {
    const rankRatio = index / maxIndex;
    const tier = resolveTier(rankRatio);
    const honeyScore = row.conservativeWinRateScore + (100 - row.banRate) * 0.3;
    const isHoneyPick =
      row.pickCount >= HONEY_MIN_PICK &&
      row.conservativeWinRateScore >= winRateCutoff &&
      row.banRate <= banRateCutoff &&
      row.pickWinRate >= 60;

    return {
      hero: row.hero,
      heroName: row.heroName,
      tier,
      position: row.position,
      isHoneyPick,
      honeyScore: round(honeyScore, 1),
      tierScore: round(row.tierScore, 1),
      pickCount: row.pickCount,
      banCount: row.banCount,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      pickRate: row.pickRate,
      banRate: row.banRate,
      pickWinRate: row.pickWinRate,
      winRateText: `${row.pickWinRate.toFixed(1)}% (${row.wins}승 ${row.losses}패)`,
    };
  });
}

function resolveTier(rankRatio: number): HeroTierLabel {
  if (rankRatio <= 0.08) return "OP";
  if (rankRatio <= 0.28) return "1티어";
  if (rankRatio <= 0.5) return "2티어";
  if (rankRatio <= 0.75) return "3티어";

  return "4티어";
}

function getPercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;

  const sorted = values.toSorted((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * percentile)));
  return sorted[index];
}

const HONEY_MIN_PICK = 3;
