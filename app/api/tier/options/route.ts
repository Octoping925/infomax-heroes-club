import { NextResponse } from "next/server";
import { getHeroMetaOptions } from "@/config/heroes-profile";

export async function GET() {
  const apiKey = process.env.HEROES_PROFILE_API_KEY;
  const headers = { "Cache-Control": "no-store" };
  if (!apiKey) {
    return NextResponse.json({ status: "unconfigured", error: "Heroes Profile API 키가 아직 설정되지 않았습니다." }, { status: 503, headers });
  }
  try {
    return NextResponse.json(await getHeroMetaOptions(apiKey), { headers });
  } catch (error) {
    console.error("Heroes Profile 옵션 조회 오류:", error);
    return NextResponse.json({ status: "error", error: "패치와 맵 목록을 불러오지 못했습니다." }, { status: 502, headers });
  }
}
