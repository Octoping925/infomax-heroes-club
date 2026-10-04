import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { MAP_CATALOG } from "@/domain/hots/constants/maps";
import type { GameMap } from "@/domain/hots/models/map";
import { createHeroMetaDailyStore } from "@/domain/hots/repositories/hero-meta-snapshot";
import { parseHeroMetaAudience } from "@/domain/hots/service/hero-meta/hero-meta-filters";
import { gradeHeroStats } from "@/domain/hots/service/hero-meta/hero-meta-tier";

export async function GET(request: NextRequest) {
  const audience = parseHeroMetaAudience(request.nextUrl.searchParams.get("audience"));
  const mapValue = request.nextUrl.searchParams.get("map");
  const headers = { "Cache-Control": "no-store" };
  if (!audience) {
    return NextResponse.json({ status: "invalid", error: "지원하지 않는 리그 분류입니다." }, { status: 400, headers });
  }
  if (mapValue && !Object.hasOwn(MAP_CATALOG, mapValue)) {
    return NextResponse.json({ status: "invalid", error: "지원하지 않는 맵입니다." }, { status: 400, headers });
  }

  try {
    const snapshot = await createHeroMetaDailyStore(prisma).get(audience);
    const availableMaps = Object.keys(MAP_CATALOG)
      .filter((map) => snapshot?.mapStats && map in snapshot.mapStats)
      .map((id) => ({ id: id as GameMap, name: MAP_CATALOG[id as GameMap].nameKo }));
    const isMapQuery = mapValue !== null;
    const stats = isMapQuery ? snapshot?.mapStats?.[mapValue as GameMap] : snapshot?.stats;
    const fetchedAt = isMapQuery ? snapshot?.mapFetchedAt : snapshot?.fetchedAt;
    const patch = isMapQuery ? snapshot?.mapPatch : snapshot?.patch;
    if (!stats || !fetchedAt || !patch) {
      return NextResponse.json(
        {
          status: "pending",
          audience,
          map: mapValue,
          maps: availableMaps,
          rows: [],
          updatedAt: null,
          patch: null,
        },
        { headers },
      );
    }
    return NextResponse.json(
      {
        status: "ready",
        audience,
        map: mapValue,
        maps: availableMaps,
        rows: gradeHeroStats(
          stats.map((row) => ({
            ...row,
            // Older snapshots stored a full-precision wins/games ratio, while Heroes Profile publishes two decimals.
            winRate: Number(row.winRate.toFixed(2)),
          })),
        ),
        updatedAt: fetchedAt.toISOString(),
        patch,
        stale: Date.now() - fetchedAt.getTime() >= 86_400_000,
      },
      { headers },
    );
  } catch (error) {
    console.error("영웅 메타 DB 조회 오류:", error);
    return NextResponse.json(
      { status: "error", error: "저장된 티어 정보를 불러오지 못했습니다." },
      { status: 500, headers },
    );
  }
}
