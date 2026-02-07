import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { PlayerFormPointResponse, PlayerFormTrendResponse } from "@/app/api/stats/types";

type RouteParams = {
  params: Promise<{ nickname: string }>;
};

/**
 * 특정 플레이어의 게임별 폼 추이 데이터 조회
 * GET /api/stats/players/[nickname]/form
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<PlayerFormTrendResponse | { error: string }>> {
  const { nickname } = await params;
  const takeRaw = request.nextUrl.searchParams.get("take");
  const takeParsed = takeRaw ? Number(takeRaw) : 20;
  const take = Number.isFinite(takeParsed) ? Math.min(Math.max(Math.trunc(takeParsed), 1), 100) : 20;

  const player = await prisma.player.findUnique({
    where: { nickname },
    select: {
      id: true,
      name: true,
      nickname: true,
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const rows = await prisma.gameTeamMember.findMany({
    where: { playerId: player.id },
    select: {
      kills: true,
      deaths: true,
      takedowns: true,
      dpm: true,
      hero: true,
      gameTeam: {
        select: {
          result: true,
          game: {
            select: {
              id: true,
              gameNumber: true,
              map: true,
              match: {
                select: {
                  playedAt: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [
      {
        gameTeam: {
          game: {
            match: {
              playedAt: "desc",
            },
          },
        },
      },
      {
        gameTeam: {
          game: {
            gameNumber: "desc",
          },
        },
      },
    ],
    take,
  });

  const orderedRows = rows.toSorted(
    (a, b) =>
      a.gameTeam.game.match.playedAt.getTime() - b.gameTeam.game.match.playedAt.getTime() ||
      a.gameTeam.game.gameNumber - b.gameTeam.game.gameNumber,
  );

  const points: PlayerFormPointResponse[] = orderedRows.map((row) => ({
    gameId: row.gameTeam.game.id,
    playedAt: row.gameTeam.game.match.playedAt.toISOString(),
    gameNumber: row.gameTeam.game.gameNumber,
    map: row.gameTeam.game.map,
    hero: row.hero,
    result: row.gameTeam.result,
    kills: row.kills,
    deaths: row.deaths,
    takedowns: row.takedowns,
    dpm: row.dpm,
  }));

  return NextResponse.json({
    playerId: player.id,
    playerName: player.name,
    playerNickname: player.nickname,
    totalGames: points.length,
    points,
  });
}
