import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";

export type PlayerListItem = {
  readonly id: string;
  readonly name: string;
  readonly nickname: string;
};

/**
 * 플레이어 목록 조회 API
 * GET /api/players
 */
export async function GET(): Promise<NextResponse<PlayerListItem[]>> {
  const players = await prisma.player.findMany({
    select: {
      id: true,
      name: true,
      nickname: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json(players);
}
