import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { heroesProfileSource, HeroesProfileRequestError } from "@/config/heroes-profile";
import { parseHeroMetaFilters, validateFixedHeroMetaFilters } from "@/domain/hots/service/hero-meta-filters";
import { loadHeroMeta } from "@/domain/hots/service/hero-meta-loader";
import { createHeroMetaSnapshotStore } from "@/domain/hots/repositories/hero-meta-snapshot";
import { createHeroMetaOptionsStore } from "@/domain/hots/repositories/hero-meta-options";

export async function GET(request: NextRequest) {
  const apiKey = process.env.HEROES_PROFILE_API_KEY;
  const headers = { "Cache-Control": "no-store" };
  try {
    try {
      validateFixedHeroMetaFilters(request.nextUrl.searchParams);
    } catch (error) {
      return NextResponse.json({ status: "invalid", error: error instanceof Error ? error.message : "필터가 올바르지 않습니다." }, { status: 400, headers });
    }
    const optionSnapshot = await createHeroMetaOptionsStore(prisma).get();
    if (!optionSnapshot) {
      const status = apiKey ? "pending" : "unconfigured";
      const error = apiKey ? "패치와 맵 목록을 준비하고 있습니다." : "Heroes Profile API 키가 아직 설정되지 않았습니다.";
      return NextResponse.json({ status, error }, { status: 503, headers });
    }
    const options = optionSnapshot.options;
    let filters;
    try {
      filters = parseHeroMetaFilters(request.nextUrl.searchParams, options);
    } catch (error) {
      return NextResponse.json({ status: "invalid", error: error instanceof Error ? error.message : "필터가 올바르지 않습니다." }, { status: 400, headers });
    }
    const result = await loadHeroMeta(filters, {
      store: createHeroMetaSnapshotStore(prisma),
      source: apiKey ? heroesProfileSource(apiKey) : {
        fetchStats: async () => { throw new Error("Heroes Profile API 키가 아직 설정되지 않았습니다."); },
        pollJob: async () => { throw new Error("Heroes Profile API 키가 아직 설정되지 않았습니다."); },
      },
      now: new Date(),
    });
    if (!apiKey && result.status === "error") {
      return NextResponse.json({ status: "unconfigured", error: "Heroes Profile API 키가 아직 설정되지 않았습니다." }, { status: 503, headers });
    }
    if (result.status === "ready" && result.rows.length === 0) {
      return NextResponse.json({ ...result, status: "empty" }, { headers });
    }
    return NextResponse.json(result, { status: result.status === "error" ? 502 : 200, headers });
  } catch (error) {
    console.error("Heroes Profile 티어 조회 오류:", error);
    const message = error instanceof HeroesProfileRequestError ? error.message : "Heroes Profile 통계를 불러오지 못했습니다.";
    return NextResponse.json({ status: "error", error: message }, { status: 502, headers });
  }
}
