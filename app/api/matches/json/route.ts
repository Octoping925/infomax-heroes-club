import { NextRequest, NextResponse } from "next/server";
import { createMatchesFromJson, MatchServiceError } from "@/domain/hots/service/match-service";
import type { CreateMatchesFromJsonResponse } from "@/domain/hots/service/match-service";

/**
 * JSON 기반 내전 생성 API
 * POST /api/matches/json
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<CreateMatchesFromJsonResponse | { error: string }>> {
  try {
    const body: unknown = await request.json();
    const response = await createMatchesFromJson(body);
    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof MatchServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error("JSON 내전 생성 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
