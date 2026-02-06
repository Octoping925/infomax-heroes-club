import { NextRequest, NextResponse } from "next/server";
import { createMatch, getMatchHistory, MatchServiceError, parseTakeParam } from "@/domain/hots/service/match-service";
import type { CreateMatchRequest, CreateMatchResponse, MatchHistoryItem } from "@/domain/hots/types/match-contract";

/**
 * 역대 내전(match) 전적 조회
 * GET /api/matches?take=50
 */
export async function GET(request: NextRequest): Promise<NextResponse<MatchHistoryItem[] | { error: string }>> {
  try {
    const take = parseTakeParam(request.nextUrl.searchParams.get("take"));
    const response = await getMatchHistory(take);

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    console.error("역대 내전 조회 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 내전 생성 API
 * POST /api/matches
 */
export async function POST(request: NextRequest): Promise<NextResponse<CreateMatchResponse | { error: string }>> {
  try {
    const body: CreateMatchRequest = await request.json();
    const response = await createMatch(body);
    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof MatchServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error("내전 생성 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
