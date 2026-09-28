import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { createHeroMetaDailyStore } from "@/domain/hots/repositories/hero-meta-snapshot";
import { parseHeroMetaAudience } from "@/domain/hots/service/hero-meta-filters";
import { gradeHeroStats } from "@/domain/hots/service/hero-meta-tier";

export async function GET(request: NextRequest) {
  const audienceValue = request.nextUrl.searchParams.get("audience");
  const audience = parseHeroMetaAudience(audienceValue);
  const headers = { "Cache-Control": "no-store" };
  if (!audience) {
    return NextResponse.json({ status: "invalid", error: "지원하지 않는 리그 분류입니다." }, { status: 400, headers });
  }

  try {
    const snapshot = await createHeroMetaDailyStore(prisma).get(audience);
    if (!snapshot?.stats || !snapshot.fetchedAt || !snapshot.patch) {
      return NextResponse.json({ status: "pending", audience, rows: [], updatedAt: null, patch: null }, { headers });
    }
    return NextResponse.json({
      status: "ready",
      audience,
      rows: gradeHeroStats(snapshot.stats),
      updatedAt: snapshot.fetchedAt.toISOString(),
      patch: snapshot.patch,
      stale: Date.now() - snapshot.fetchedAt.getTime() >= 86_400_000,
    }, { headers });
  } catch (error) {
    console.error("영웅 메타 DB 조회 오류:", error);
    return NextResponse.json({ status: "error", error: "저장된 티어 정보를 불러오지 못했습니다." }, { status: 500, headers });
  }
}
