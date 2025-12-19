import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import type { RivalryListResponse } from "@/app/api/stats/types";
import {
  fetchRivalries,
  normalizeFetchRivalriesParams,
} from "@/domain/hots/service/rivalry-service";

/**
 * 라이벌리 (A vs B) 카드 목록
 * GET /api/stats/rivalries?minMatches=3&limit=30&takeMatches=500
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<RivalryListResponse | { error: string }>> {
  try {
    const search = request.nextUrl.searchParams;
    const params = normalizeFetchRivalriesParams({
      minMatches: parseNumber(search.get("minMatches")),
      limit: parseNumber(search.get("limit")),
      takeMatches: parseNumber(search.get("takeMatches")),
      includeInsufficientSample: parseBoolean(search.get("includeInsufficientSample")),
    });

    const response = await fetchRivalries({ prisma, params });
    return NextResponse.json(response);
  } catch (err) {
    console.error("라이벌리 조회 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseNumber(input: string | null): number | undefined {
  if (input === null) return undefined;
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function parseBoolean(input: string | null): boolean | undefined {
  if (input === null) return undefined;
  if (input === "true") return true;
  if (input === "false") return false;
  return undefined;
}


