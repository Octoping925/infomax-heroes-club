import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { getHeroMetaOptions, HeroesProfileRequestError } from "@/config/heroes-profile";
import { createHeroMetaOptionsStore } from "@/domain/hots/repositories/hero-meta-options";
import { loadHeroMetaOptions } from "@/domain/hots/service/hero-meta-options";

export async function GET() {
  const apiKey = process.env.HEROES_PROFILE_API_KEY;
  const headers = { "Cache-Control": "no-store" };
  try {
    const options = await loadHeroMetaOptions({
      store: createHeroMetaOptionsStore(prisma),
      fetchOptions: () => apiKey ? getHeroMetaOptions(apiKey) : Promise.reject(new Error("Heroes Profile API 키가 아직 설정되지 않았습니다.")),
      now: new Date(),
    });
    return NextResponse.json(options, { headers });
  } catch (error) {
    if (!apiKey) {
      return NextResponse.json({ status: "unconfigured", error: "Heroes Profile API 키가 아직 설정되지 않았습니다." }, { status: 503, headers });
    }
    console.error("Heroes Profile 옵션 조회 오류:", error);
    const message = error instanceof HeroesProfileRequestError ? error.message : "패치와 맵 목록을 불러오지 못했습니다.";
    return NextResponse.json({ status: "error", error: message }, { status: 502, headers });
  }
}
