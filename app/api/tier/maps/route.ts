import { NextRequest } from "next/server";
import { prisma } from "@/config/prisma";
import type { DooraySlashCommandRequest, DooraySlashCommandResponse } from "@/domain/dooray/types";
import { HERO_CATALOG, MAP_CATALOG } from "@/domain/hots/constants";
import type { GameMap, HeroRole } from "@/domain/hots/models";
import { createHeroMetaDailyStore } from "@/domain/hots/repositories/hero-meta-snapshot";
import { gradeHeroStats, type HeroMetaGrade, type HeroMetaRow } from "@/domain/hots/service/hero-meta-tier";
import { selectHoneyPicks } from "@/app/tier/select-honey-picks";
import { selectVisibleRows } from "@/app/tier/select-visible-rows";

const MAP_ALIASES: Record<GameMap, readonly string[]> = {
  AlteracPass: ["Alterac Pass", "알터랙", "알터랙고개"],
  BattlefieldOfEternity: ["Battlefield of Eternity", "영전", "영원의전쟁터"],
  BlackheartsBay: ["Blackheart's Bay", "항만", "블랙하트"],
  BraxisHoldout: ["Braxis Holdout", "브락", "브락시스항전", "항전", "테란"],
  CursedHollow: ["Cursed Hollow", "저골", "저주받은골짜기"],
  DragonShire: ["Dragon Shire", "둥지", "용둥", "용기사"],
  HauntedWoods: ["Garden of Terror", "garden-of-terror", "정원", "씨앗", "공정"],
  Hanamura: ["Hanamura Temple", "하나무라"],
  InfernalShrines: ["Infernal Shrines", "신단", "불지옥"],
  SkyTemple: ["Sky Temple", "하늘", "사막"],
  TombOfTheSpiderQueen: ["Tomb of the Spider Queen", "거미", "무덤"],
  TowersOfDoom: ["Towers of Doom", "파탑"],
  VolskayaFoundry: ["Volskaya Foundry", "볼스", "볼스카야"],
  WarheadJunction: ["Warhead Junction", "핵", "핵탄두"],
  HauntedMines: ["Haunted Mines", "죽광", "광산"],
};

const ROLE_LABELS: Record<HeroRole, string> = {
  TANKER: "탱커",
  OFFLANER: "투사",
  MAIN_DEALER: "메인딜러",
  SUB_DEALER: "서브딜러",
  HEALER: "힐러",
};

const TIER_LABELS: ReadonlyArray<{ grade: HeroMetaGrade; label: string }> = [
  { grade: "S", label: "OP" },
  { grade: "A", label: "1티어" },
  { grade: "B", label: "2티어" },
  { grade: "C", label: "3티어" },
  { grade: "D", label: "4티어" },
  { grade: "E", label: "5티어" },
];

function normalizeMapName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
}

const MAP_LOOKUP = new Map<string, GameMap>(
  (Object.keys(MAP_CATALOG) as GameMap[]).flatMap((map) =>
    [map, MAP_CATALOG[map].nameKo, ...MAP_ALIASES[map]].map((alias) => [normalizeMapName(alias), map]),
  ),
);

function resolveMap(rawName: string | null): GameMap | null {
  return MAP_LOOKUP.get(normalizeMapName(rawName?.trim() ?? "")) ?? null;
}

/** Dooray slash command: body.text contains an optional map name. */
export async function POST(request: NextRequest): Promise<Response> {
  const body: Partial<DooraySlashCommandRequest> = await request.json().catch(() => ({}));
  return handleTierListRequest(request, typeof body.text === "string" ? body.text : null);
}

/** Local preview: GET /api/tier/maps?map=하늘사원 */
export async function GET(request: NextRequest): Promise<Response> {
  return handleTierListRequest(request, request.nextUrl.searchParams.get("map"));
}

async function handleTierListRequest(request: NextRequest, rawMapName: string | null): Promise<Response> {
  const map = resolveMap(rawMapName);
  const mapName = map === null ? "전체 맵" : MAP_CATALOG[map].nameKo;

  try {
    const snapshot = await createHeroMetaDailyStore(prisma).get("all");
    const stats = map === null ? snapshot?.stats : snapshot?.mapStats?.[map];
    const patch = map === null ? snapshot?.patch : snapshot?.mapPatch;
    const fetchedAt = map === null ? snapshot?.fetchedAt : snapshot?.mapFetchedAt;
    if (!stats || !patch || !fetchedAt) {
      return webhookResponse(
        `[히오스 ${mapName} 메타 티어리스트]\n데이터 준비 중입니다. 하루 한 번 통계를 수집합니다.`,
      );
    }

    const rows = selectVisibleRows(gradeHeroStats(stats), { role: "ALL", search: "", sort: "tier" });
    const message = formatTierMessage({
      rows,
      mapName,
      patch,
      fetchedAt,
      pageUrl: new URL("/tier", request.url).toString(),
    });
    return webhookResponse(message);
  } catch (error) {
    console.error("맵 메타 티어리스트 DB 조회 오류:", error);
    return webhookResponse("저장된 티어 정보를 불러오지 못했습니다.");
  }
}

function formatTierMessage(input: {
  readonly rows: ReadonlyArray<HeroMetaRow>;
  readonly mapName: string;
  readonly patch: string;
  readonly fetchedAt: Date;
  readonly pageUrl: string;
}): string {
  const updatedAt = input.fetchedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const honeyPicks = selectHoneyPicks(input.rows);
  const lines = [
    `[히오스 ${input.mapName} 메타 티어리스트]`,
    `폭풍 리그 · 전체 지역/리그 · 패치 ${input.patch}`,
    `갱신: ${updatedAt} KST`,
    "",
  ];

  for (const { grade, label } of TIER_LABELS) {
    const tierRows = input.rows.filter((row) => row.tier === grade);
    if (tierRows.length === 0) continue;
    lines.push(`${label} (${tierRows.length}명)`);
    for (const [role, roleLabel] of Object.entries(ROLE_LABELS) as [HeroRole, string][]) {
      const heroes = tierRows.filter((row) => row.role === role);
      if (heroes.length === 0) continue;
      lines.push(
        `- ${roleLabel}: ${heroes.map((row) => `${HERO_CATALOG[row.hero].nameKo}${honeyPicks.has(row.hero) ? "🐝" : ""}`).join(", ")}`,
      );
    }
    lines.push("");
  }

  const ungraded = input.rows.filter((row) => row.tier === null);
  if (ungraded.length > 0)
    lines.push(`표본 부족/등급 보류: ${ungraded.map((row) => HERO_CATALOG[row.hero].nameKo).join(", ")}`, "");
  lines.push(
    "🐝 꿀픽: 200경기 이상, 역할별 보정 승률 상위 30% + 밴율 중간값 이하(없으면 픽률)",
    "출처: Heroes Profile 저장 통계",
    `자세히(사이트에서 맵 선택): ${input.pageUrl}`,
  );
  return lines.join("\n").trim();
}

function webhookResponse(text: string): Response {
  const body: DooraySlashCommandResponse = { text, responseType: "ephemeral" };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
