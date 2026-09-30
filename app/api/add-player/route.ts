import { prisma } from "@/config/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse<{ success: boolean }>> {
  const nickname = request.nextUrl.searchParams.get("nickname");
  const name = request.nextUrl.searchParams.get("name");

  if (!nickname || !name) {
    return NextResponse.json({ success: false, error: "Nickname and name are required" }, { status: 400 });
  }

  const player = await prisma.player.create({
    data: {
      nickname,
      name,
    },
  });

  return NextResponse.json({ success: true, player });
}
