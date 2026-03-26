import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { FantasyDuoWinRateResponse } from "@/app/api/stats/types";
import { fetchPlayerMap, PlayerMap } from "../../utils/player";
import { buildPlayedAtYearFilter, parseClampedIntegerParam, parseEnumParam, parseYearParam } from "@/app/api/stats/utils/query";
import {
  buildWinRateStatsFromCounts,
  calculateTotalGames,
  toResultByWinnerTeamNumber,
  updateCountsByResult,
} from "@/app/api/stats/utils/stats";

type DuoAccumulator = {
  readonly playerA: {
    readonly playerId: string;
    readonly playerName: string;
    readonly playerNickname: string;
  };
  readonly playerB: {
    readonly playerId: string;
    readonly playerName: string;
    readonly playerNickname: string;
  };
  wins: number;
  losses: number;
  draws: number;
};

const DEFAULT_LIMIT = 50;
const DEFAULT_MIN_MATCHES = 3;
const DEFAULT_MIN_GAMES = 5;
const MAX_LIMIT = 200;

/**
 * '환상의 듀오' - 같은 팀이 되었을 때 승률이 좋은 두 플레이어 쌍 랭킹 조회 (매치 단위)
 * GET /api/stats/players/fantasy-duo?unit=match|game&minCount=3&limit=50
 *
 * 주의:
 * - unit=match: match.winnerTeamNumber 기준으로 승/패/무를 계산합니다.
 * - unit=game: gameTeam.result 기준으로 승/패/무를 계산합니다.
 */
export async function GET(req: Request): Promise<NextResponse<FantasyDuoWinRateResponse[]>> {
  const { limit, minCount, unit, year } = parseQueryParams(req.url);

  const playerMap = await fetchPlayerMap();
  const duoMap =
    unit === "game" ? await calculateDuoStatsByGame(playerMap, year) : await calculateDuoStatsByMatch(playerMap, year);

  const response: FantasyDuoWinRateResponse[] = Array.from(duoMap.values())
    .map((acc) => {
      const stats = buildWinRateStatsFromCounts(acc);
      return {
        playerA: acc.playerA,
        playerB: acc.playerB,
        totalGames: calculateTotalGames(acc),
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        winRate: stats.winRate,
      };
    })
    .filter((item) => item.totalGames >= minCount)
    .sort((a, b) => b.winRate - a.winRate || b.totalGames - a.totalGames)
    .slice(0, limit);

  return NextResponse.json(response);
}

type UnitType = "match" | "game";

function parseQueryParams(url: string): {
  readonly limit: number;
  readonly minCount: number;
  readonly unit: UnitType;
  readonly year?: number;
} {
  const { searchParams } = new URL(url);
  const unit = parseEnumParam(searchParams, "unit", ["match", "game"], "match");
  const year = parseYearParam(searchParams.get("year"));
  const limit = parseClampedIntegerParam(searchParams, {
    keys: ["limit"],
    min: 1,
    max: MAX_LIMIT,
    fallback: DEFAULT_LIMIT,
  });
  const defaultMinCount = unit === "match" ? DEFAULT_MIN_MATCHES : DEFAULT_MIN_GAMES;
  const minCount = parseClampedIntegerParam(searchParams, {
    keys: ["minCount", "minGames"],
    min: 1,
    max: 10_000,
    fallback: defaultMinCount,
  });

  return { limit, minCount, unit, year };
}

function buildDuoKey(playerIdA: string, playerIdB: string): string {
  return `${playerIdA}:${playerIdB}`;
}

function createAccumulator(input: {
  playerA: DuoAccumulator["playerA"];
  playerB: DuoAccumulator["playerB"];
}): DuoAccumulator {
  return {
    playerA: input.playerA,
    playerB: input.playerB,
    wins: 0,
    losses: 0,
    draws: 0,
  };
}

async function calculateDuoStatsByMatch(playerMap: PlayerMap, year?: number): Promise<Map<string, DuoAccumulator>> {
  const playedAt = buildPlayedAtYearFilter(year);
  const matchTeams = await prisma.matchTeam.findMany({
    where: playedAt
      ? {
          match: {
            playedAt,
          },
        }
      : undefined,
    select: {
      teamNumber: true,
      match: {
        select: {
          winnerTeamNumber: true,
        },
      },
      members: {
        select: {
          playerId: true,
        },
      },
    },
  });

  const duoMap = new Map<string, DuoAccumulator>();

  for (const matchTeam of matchTeams) {
    const players = matchTeam.members
      .map((m) => playerMap.get(m.playerId))
      .filter((player): player is NonNullable<typeof player> => Boolean(player))
      .sort((a, b) => a.id.localeCompare(b.id));

    if (players.length < 2) {
      continue;
    }

    const result = toResultByWinnerTeamNumber(matchTeam.match.winnerTeamNumber, matchTeam.teamNumber);

    for (let i = 0; i < players.length - 1; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const playerA = players[i];
        const playerB = players[j];
        if (!playerA || !playerB) {
          continue;
        }
        const duoKey = buildDuoKey(playerA.id, playerB.id);
        const current =
          duoMap.get(duoKey) ??
          createAccumulator({
            playerA: {
              playerId: playerA.id,
              playerName: playerA.name,
              playerNickname: playerA.nickname,
            },
            playerB: {
              playerId: playerB.id,
              playerName: playerB.name,
              playerNickname: playerB.nickname,
            },
          });

        updateCountsByResult(current, result);
        duoMap.set(duoKey, current);
      }
    }
  }

  return duoMap;
}

async function calculateDuoStatsByGame(playerMap: PlayerMap, year?: number): Promise<Map<string, DuoAccumulator>> {
  const playedAt = buildPlayedAtYearFilter(year);
  const gameTeams = await prisma.gameTeam.findMany({
    where: playedAt
      ? {
          game: {
            match: {
              playedAt,
            },
          },
        }
      : undefined,
    select: {
      result: true,
      members: {
        select: {
          playerId: true,
        },
      },
    },
  });

  const duoMap = new Map<string, DuoAccumulator>();

  for (const gameTeam of gameTeams) {
    const players = gameTeam.members
      .map((m) => playerMap.get(m.playerId))
      .filter((player): player is NonNullable<typeof player> => Boolean(player))
      .sort((a, b) => a.id.localeCompare(b.id));

    if (players.length < 2) {
      continue;
    }

    const result = gameTeam.result;

    for (let i = 0; i < players.length - 1; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const playerA = players[i];
        const playerB = players[j];
        if (!playerA || !playerB) {
          continue;
        }

        const duoKey = buildDuoKey(playerA.id, playerB.id);
        const current =
          duoMap.get(duoKey) ??
          createAccumulator({
            playerA: {
              playerId: playerA.id,
              playerName: playerA.name,
              playerNickname: playerA.nickname,
            },
            playerB: {
              playerId: playerB.id,
              playerName: playerB.name,
              playerNickname: playerB.nickname,
            },
          });

        updateCountsByResult(current, result);
        duoMap.set(duoKey, current);
      }
    }
  }

  return duoMap;
}
