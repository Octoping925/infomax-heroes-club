import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { GameResult } from "@/generated/prisma/client";
import { HeroDuoWinRateResponse } from "@/app/api/stats/types";
import { calculateWinRate } from "@/utils/win-rate";
import { parseNumber } from "@/app/api/stats/utils/query";
import { clamp } from "es-toolkit";
import { Hero } from "@/domain/hots/models";

type DuoAccumulator = {
  readonly heroA: Hero;
  readonly heroB: Hero;
  wins: number;
  losses: number;
  draws: number;
};

const DEFAULT_LIMIT = 50;
const DEFAULT_MIN_GAMES = 5;
const MAX_LIMIT = 200;

/**
 * 같이 플레이했을 때 승률이 좋은 영웅 쌍(같은 팀) 랭킹 조회 (게임 단위)
 * GET /api/stats/heroes/fantasy-duo?minCount=5&limit=50
 *
 * - 같은 GameTeam(같은 팀) 안에서 함께 나온 영웅 2개 조합을 집계합니다.
 * - gameTeam.result 기준으로 승/패/무를 계산합니다.
 */
export async function GET(
  req: Request
): Promise<NextResponse<HeroDuoWinRateResponse[]>> {
  const { limit, minCount } = parseQueryParams(req.url);

  const gameTeams = await prisma.gameTeam.findMany({
    select: {
      result: true,
      members: {
        select: {
          hero: true,
        },
      },
    },
  });

  const duoMap = new Map<string, DuoAccumulator>();

  for (const gameTeam of gameTeams) {
    const uniqueHeroes = Array.from(
      new Set<Hero>(gameTeam.members.map((m) => m.hero))
    ).sort((a, b) => String(a).localeCompare(String(b)));

    if (uniqueHeroes.length < 2) {
      continue;
    }

    const result = mapGameResultToDuoResult(gameTeam.result);

    for (let i = 0; i < uniqueHeroes.length - 1; i++) {
      for (let j = i + 1; j < uniqueHeroes.length; j++) {
        const heroA = uniqueHeroes[i];
        const heroB = uniqueHeroes[j];
        if (!heroA || !heroB) {
          continue;
        }

        const duoKey = buildDuoKey(heroA, heroB);
        const current =
          duoMap.get(duoKey) ??
          createAccumulator({
            heroA,
            heroB,
          });

        updateResultCounts(current, result);
        duoMap.set(duoKey, current);
      }
    }
  }

  const response: HeroDuoWinRateResponse[] = Array.from(duoMap.values())
    .map((acc) => {
      return {
        heroA: acc.heroA,
        heroB: acc.heroB,
        totalGames: acc.wins + acc.losses + acc.draws,
        wins: acc.wins,
        losses: acc.losses,
        draws: acc.draws,
        winRate: calculateWinRate(acc.wins, acc.losses, acc.draws),
      };
    })
    .filter((item) => item.totalGames >= minCount)
    .sort((a, b) => b.winRate - a.winRate || b.totalGames - a.totalGames)
    .slice(0, limit);

  return NextResponse.json(response);
}

type DuoResult = "WIN" | "LOSE" | "DRAW";

function parseQueryParams(url: string): {
  readonly limit: number;
  readonly minCount: number;
} {
  const { searchParams } = new URL(url);
  const limitParam = parseNumber(searchParams.get("limit"));
  const minCountParam = parseNumber(searchParams.get("minCount"));

  const limit =
    typeof limitParam === "number"
      ? clamp(Math.floor(limitParam), 1, MAX_LIMIT)
      : DEFAULT_LIMIT;
  const minCount =
    typeof minCountParam === "number"
      ? clamp(Math.floor(minCountParam), 1, 10_000)
      : DEFAULT_MIN_GAMES;

  return { limit, minCount };
}

function buildDuoKey(heroA: Hero, heroB: Hero): string {
  return `${heroA}:${heroB}`;
}

function createAccumulator(input: {
  heroA: Hero;
  heroB: Hero;
}): DuoAccumulator {
  return {
    heroA: input.heroA,
    heroB: input.heroB,
    wins: 0,
    losses: 0,
    draws: 0,
  };
}

function mapGameResultToDuoResult(result: GameResult): DuoResult {
  if (result === GameResult.WIN) return "WIN";
  if (result === GameResult.LOSE) return "LOSE";
  return "DRAW";
}

function updateResultCounts(acc: DuoAccumulator, result: DuoResult): void {
  if (result === "WIN") {
    acc.wins++;
    return;
  }
  if (result === "LOSE") {
    acc.losses++;
    return;
  }
  acc.draws++;
}
