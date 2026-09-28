import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { getHeroMetaOptions, heroesProfileSource } from "@/config/heroes-profile";
import { parseHeroMetaFilters } from "@/domain/hots/service/hero-meta-filters";
import { loadHeroMeta } from "@/domain/hots/service/hero-meta-loader";
import { createHeroMetaSnapshotStore } from "@/domain/hots/repositories/hero-meta-snapshot";

export async function GET(request: NextRequest) {
  const apiKey = process.env.HEROES_PROFILE_API_KEY;
  const headers = { "Cache-Control": "no-store" };
  if (!apiKey) {
    return NextResponse.json({ status: "unconfigured", error: "Heroes Profile API 키가 아직 설정되지 않았습니다." }, { status: 503, headers });
  }

  try {
    const options = await getHeroMetaOptions(apiKey);
    let filters;
    try {
      filters = parseHeroMetaFilters(request.nextUrl.searchParams, options);
    } catch (error) {
      return NextResponse.json({ status: "invalid", error: error instanceof Error ? error.message : "필터가 올바르지 않습니다." }, { status: 400, headers });
    }
    const result = await loadHeroMeta(filters, {
      store: createHeroMetaSnapshotStore(prisma),
      source: heroesProfileSource(apiKey),
      now: new Date(),
    });
    if (result.status === "ready" && result.rows.length === 0) {
      return NextResponse.json({ ...result, status: "empty" }, { headers });
    }
    return NextResponse.json(result, { status: result.status === "error" ? 502 : 200, headers });
  } catch (error) {
    console.error("Heroes Profile 티어 조회 오류:", error);
    return NextResponse.json({ status: "error", error: "Heroes Profile 통계를 불러오지 못했습니다." }, { status: 502, headers });
  }
}
