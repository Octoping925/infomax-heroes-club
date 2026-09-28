import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { heroesProfileDailySource } from "@/config/heroes-profile";
import { createHeroMetaDailyStore } from "@/domain/hots/repositories/hero-meta-snapshot";
import { refreshHeroMetaDaily } from "@/domain/hots/service/hero-meta-daily-refresh";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const apiKey = process.env.HEROES_PROFILE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Heroes Profile API 키가 설정되지 않았습니다." }, { status: 503 });
  }

  try {
    const results = await refreshHeroMetaDaily({
      now: new Date(),
      deadline: Date.now() + 270_000,
      store: createHeroMetaDailyStore(prisma),
      source: heroesProfileDailySource(apiKey),
    });
    const failed = results.some((result) => result.status === "failed");
    if (failed)
      console.error(
        "Heroes Profile 일일 수집 일부 실패:",
        results.filter((result) => result.status === "failed"),
      );
    return NextResponse.json({ results }, { status: failed ? 502 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Heroes Profile 일일 수집 오류:", error);
    return NextResponse.json(
      { error: "영웅 통계 수집에 실패했습니다." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
