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
import { updateCountsByResult } from "@/app/api/stats/utils/stats";

/**
 * 영웅 티어리스트 통계 조회
 * GET /api/stats/heroes/popular
 */
export async function GET(): Promise<NextResponse<HeroTierResponse[]>> {
  const [pickStats, banStats] = await Promise.all([fetchPickStats(), fetchBanStats()]);
  const heroTiers = buildHeroTiers(pickStats, banStats);
  return NextResponse.json(heroTiers);
}

type PickStat = {
  hero: Hero;
  result: GameResult;
  gameId: string;
};

async function fetchPickStats(): Promise<PickStat[]> {
  const picks = await prisma.gameTeamMember.findMany({
    select: {
      hero: true,
      gameTeam: {
        select: {
          result: true,
          gameId: true,
        },
      },
    },
  });

  return picks.map((pick) => ({
    hero: pick.hero,
    result: pick.gameTeam.result,
    gameId: pick.gameTeam.gameId,
  }));
}

type BanStats = {
  banCounts: Map<Hero, number>;
  gamesWithBanCount: number;
};

async function fetchBanStats(): Promise<BanStats> {
  const bans = await prisma.gameTeamBan.findMany({
    select: {
      hero: true,
      gameTeam: {
        select: {
          gameId: true,
        },
      },
    },
  });

  const gamesWithBan = new Set<string>();
  const heroBanGameMap = new Map<Hero, Set<string>>();

  for (const ban of bans) {
    const gameId = ban.gameTeam.gameId;
    gamesWithBan.add(gameId);

    const heroBanGames = heroBanGameMap.get(ban.hero) ?? new Set<string>();
    heroBanGames.add(gameId);
    heroBanGameMap.set(ban.hero, heroBanGames);
  }

  const banCounts = groupBy(
    Array.from(heroBanGameMap.entries()),
    ([hero]) => hero,
    ([, gameIds]) => gameIds.size,
  );

  return {
    banCounts,
    gamesWithBanCount: gamesWithBan.size,
  };
}

function buildHeroTiers(pickStats: PickStat[], banStats: BanStats): HeroTierResponse[] {
  const heroPickMap = new Map<
    Hero,
    { total: number; wins: number; losses: number; draws: number; gameIds: Set<string> }
  >();
  const gameIds = new Set<string>();

  for (const pick of pickStats) {
    gameIds.add(pick.gameId);
    const current = heroPickMap.get(pick.hero) ?? {
      total: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      gameIds: new Set<string>(),
    };

    current.total++;
    current.gameIds.add(pick.gameId);
    updateCountsByResult(current, pick.result);

    heroPickMap.set(pick.hero, current);
  }

  const allHeroes = new Set<Hero>([...heroPickMap.keys(), ...banStats.banCounts.keys()]);
  const totalGameCount = gameIds.size;
  const totalBanGames = banStats.gamesWithBanCount;

  const rows = Array.from(allHeroes, (hero) => {
    const pickStat = heroPickMap.get(hero) ?? {
      total: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      gameIds: new Set<string>(),
    };

    const pickCount = pickStat.gameIds.size;
    const banCount = banStats.banCounts.get(hero) ?? 0;
    const pickRate = totalGameCount === 0 ? 0 : (pickCount / totalGameCount) * 100;
    const banRate = totalBanGames === 0 ? 0 : (banCount / totalBanGames) * 100;
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
    const tierScore = conservativeWinRateScore * 0.7 + pickRate * 0.15 + banRate * 0.3;
    const position = HeroPositionMap[hero];

    return {
      hero,
      heroName: HeroMap[hero],
      position,
      pickCount,
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
  if (rankRatio <= 0.2) return "1티어";
  if (rankRatio <= 0.4) return "2티어";
  if (rankRatio <= 0.75) return "3티어";

  return "4티어";
}

function getPercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  if (percentile >= 1) return values.at(-1)!;

  const sorted = values.toSorted((a, b) => a - b);
  const index = Math.floor((sorted.length - 1) * percentile);
  return sorted[index];
}

const HONEY_MIN_PICK = 3;
