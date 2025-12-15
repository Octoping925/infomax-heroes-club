import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import {
  calculateWinRate,
  FantasyDuoWinRateResponse,
} from "@/app/api/stats/types";
import { GameResult } from "@/generated/prisma/client";

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

const DEFAULT_LIMIT: number = 50;
const DEFAULT_MIN_MATCHES: number = 3;
const DEFAULT_MIN_GAMES: number = 5;
const MAX_LIMIT: number = 200;

/**
 * '환상의 듀오' - 같은 팀이 되었을 때 승률이 좋은 두 플레이어 쌍 랭킹 조회 (매치 단위)
 * GET /api/stats/players/fantasy-duo?unit=match|game&minCount=3&limit=50
 *
 * 주의:
 * - unit=match: match.winnerTeamNumber 기준으로 승/패/무를 계산합니다.
 * - unit=game: gameTeam.result 기준으로 승/패/무를 계산합니다.
 */
export async function GET(
  req: Request
): Promise<NextResponse<FantasyDuoWinRateResponse[]>> {
  const { limit, minCount, unit } = parseQueryParams(req.url);

  const duoMap =
    unit === "game"
      ? await calculateDuoStatsByGame()
      : await calculateDuoStatsByMatch();

  const response: FantasyDuoWinRateResponse[] = Array.from(duoMap.values())
    .map((acc) => {
      const totalGames = acc.wins + acc.losses + acc.draws;
      return {
        playerA: acc.playerA,
        playerB: acc.playerB,
        totalGames,
        wins: acc.wins,
        losses: acc.losses,
        draws: acc.draws,
        winRate: calculateWinRate(acc.wins, totalGames),
      };
    })
    .filter((item) => item.totalGames >= minCount)
    .sort((a, b) => b.winRate - a.winRate || b.totalGames - a.totalGames)
    .slice(0, limit);

  return NextResponse.json(response);
}

type MatchTeamResult = "WIN" | "LOSE" | "DRAW";

type UnitType = "match" | "game";

function parseQueryParams(url: string): {
  readonly limit: number;
  readonly minCount: number;
  readonly unit: UnitType;
} {
  const { searchParams } = new URL(url);
  const limitParam = Number(searchParams.get("limit"));
  const unitParam = searchParams.get("unit");
  const minCountParam = Number(
    searchParams.get("minCount") ?? searchParams.get("minGames")
  );

  const unit: UnitType = unitParam === "game" ? "game" : "match";

  const limit = Number.isFinite(limitParam)
    ? clamp(Math.floor(limitParam), 1, MAX_LIMIT)
    : DEFAULT_LIMIT;

  const defaultMinCount =
    unit === "match" ? DEFAULT_MIN_MATCHES : DEFAULT_MIN_GAMES;

  const minCount = Number.isFinite(minCountParam)
    ? clamp(Math.floor(minCountParam), 1, 10_000)
    : defaultMinCount;

  return { limit, minCount, unit };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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

function getMatchTeamResult(input: {
  winnerTeamNumber: number | null;
  teamNumber: number;
}): MatchTeamResult {
  if (input.winnerTeamNumber === null) {
    return "DRAW";
  }
  if (input.winnerTeamNumber === input.teamNumber) {
    return "WIN";
  }
  return "LOSE";
}

function updateResultCounts(acc: DuoAccumulator, result: MatchTeamResult): void {
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

async function calculateDuoStatsByMatch(): Promise<Map<string, DuoAccumulator>> {
  const matchTeams = await prisma.matchTeam.findMany({
    select: {
      teamNumber: true,
      match: {
        select: {
          winnerTeamNumber: true,
        },
      },
      members: {
        select: {
          player: {
            select: {
              id: true,
              name: true,
              nickname: true,
            },
          },
        },
      },
    },
  });

  const duoMap = new Map<string, DuoAccumulator>();

  for (const matchTeam of matchTeams) {
    const players = matchTeam.members
      .map((m) => m.player)
      .sort((a, b) => a.id.localeCompare(b.id));

    if (players.length < 2) {
      continue;
    }

    const result = getMatchTeamResult({
      winnerTeamNumber: matchTeam.match.winnerTeamNumber,
      teamNumber: matchTeam.teamNumber,
    });

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

        updateResultCounts(current, result);
        duoMap.set(duoKey, current);
      }
    }
  }

  return duoMap;
}

async function calculateDuoStatsByGame(): Promise<Map<string, DuoAccumulator>> {
  const gameTeams = await prisma.gameTeam.findMany({
    select: {
      result: true,
      members: {
        select: {
          player: {
            select: {
              id: true,
              name: true,
              nickname: true,
            },
          },
        },
      },
    },
  });

  const duoMap = new Map<string, DuoAccumulator>();

  for (const gameTeam of gameTeams) {
    const players = gameTeam.members
      .map((m) => m.player)
      .sort((a, b) => a.id.localeCompare(b.id));

    if (players.length < 2) {
      continue;
    }

    const result = mapGameResultToMatchTeamResult(gameTeam.result);

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

        updateResultCounts(current, result);
        duoMap.set(duoKey, current);
      }
    }
  }

  return duoMap;
}

function mapGameResultToMatchTeamResult(result: GameResult): MatchTeamResult {
  if (result === GameResult.WIN) return "WIN";
  if (result === GameResult.LOSE) return "LOSE";
  return "DRAW";
}


