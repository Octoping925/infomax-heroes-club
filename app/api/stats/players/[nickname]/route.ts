import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { PlayerWinRateResponse } from "@/app/api/stats/types";
import { buildWinRateStatsFromResults } from "@/app/api/stats/utils/stats";

type RouteParams = {
  params: Promise<{ nickname: string }>;
};

/**
 * 특정 플레이어의 통산 승률 조회
 * GET /api/stats/players/[playerId]
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<PlayerWinRateResponse | { error: string }>> {
  const { nickname } = await params;

  const player = await prisma.player.findUnique({
    where: { nickname: nickname },
    select: {
      id: true,
      name: true,
      nickname: true,
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const gameResults = await prisma.gameTeamMember.findMany({
    where: { playerId: player.id },
    select: {
      gameTeam: {
        select: {
          result: true,
        },
      },
    },
  });

  const stats = buildWinRateStatsFromResults(
    gameResults.map((r) => r.gameTeam.result)
  );

  const response: PlayerWinRateResponse = {
    playerId: player.id,
    playerName: player.name,
    playerNickname: player.nickname,
    ...stats,
  };

  return NextResponse.json(response);
}
