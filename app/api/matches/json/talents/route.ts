import { NextRequest, NextResponse } from "next/server";
import { MatchServiceError, updateMatchTalentsFromJson } from "@/domain/hots/service/match-service";
import type { UpdateMatchTalentsFromJsonResponse } from "@/domain/hots/service/match-service";

/**
 * JSON 기반 특성 일괄 업데이트 API
 * POST /api/matches/json/talents
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<UpdateMatchTalentsFromJsonResponse | { error: string }>> {
  try {
    const body: unknown = await request.json();
    const response = await updateMatchTalentsFromJson(body);
    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof MatchServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error("JSON 특성 업데이트 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
