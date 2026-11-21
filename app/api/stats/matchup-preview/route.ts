import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import {
  buildMatchupPreview,
  MatchupPreviewError,
  type MatchupPreviewResponse,
} from "@/domain/hots/service/matchup-preview";
import type { MatchType } from "@/generated/prisma/client";

function parseNicknamesParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * 공개 매치업 프리뷰 데이터 조회
 * GET /api/stats/matchup-preview?a=nick1,nick2&b=nick3,nick4&type=LUNCH&leaderA=nick1&leaderB=nick3
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<MatchupPreviewResponse | { error: string }>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teamANicknames = parseNicknamesParam(searchParams.get("a"));
    const teamBNicknames = parseNicknamesParam(searchParams.get("b"));
    const rawType = searchParams.get("type")?.toUpperCase();
    const matchType: MatchType = rawType === "DINNER" ? "DINNER" : "LUNCH";
    const leaderANickname = searchParams.get("leaderA")?.trim() || null;
    const leaderBNickname = searchParams.get("leaderB")?.trim() || null;

    const preview = await buildMatchupPreview(prisma, {
      teamANicknames,
      teamBNicknames,
      matchType,
      leaderANickname,
      leaderBNickname,
    });

    return NextResponse.json(preview, {
      headers: {
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err) {
    if (err instanceof MatchupPreviewError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error("매치업 프리뷰 생성 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
