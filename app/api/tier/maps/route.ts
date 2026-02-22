import { DooraySlashCommandRequest, DooraySlashCommandResponse } from "@/domain/dooray/types";
import { HeroIcyVeinKeyMap, HeroMap } from "@/domain/hots/constants/hero";
import { NextRequest } from "next/server";

type TierLabel = "S" | "A" | "B" | "C" | "D";
type TierTrend = "UP" | "DOWN" | "SAME";

type TierHero = {
  readonly name: string;
  readonly heroSlug: string | null;
  readonly url: string;
  readonly isBanRecommended: boolean;
  readonly trend: TierTrend;
};

type TierRoleGroup = {
  readonly role: string;
  readonly roleId: string | null;
  readonly heroes: ReadonlyArray<TierHero>;
};

type TierSection = {
  readonly tier: TierLabel;
  readonly roles: ReadonlyArray<TierRoleGroup>;
};

type MapConfig = {
  readonly slug: string;
  readonly name: string;
  readonly aliases: ReadonlyArray<string>;
};

const MAP_CONFIGS: ReadonlyArray<MapConfig> = [
  {
    slug: "alterac-pass",
    name: "Alterac Pass",
    aliases: ["alterac pass", "alteracpass", "알터랙", "알터랙고개"],
  },
  {
    slug: "battlefield-of-eternity",
    name: "Battlefield of Eternity",
    aliases: ["battlefield of eternity", "battlefieldofeternity", "영전", "영원의전쟁터"],
  },
  {
    slug: "blackhearts-bay",
    name: "Blackheart's Bay",
    aliases: ["blackheartsbay", "항만", "블랙하트"],
  },
  {
    slug: "braxis-holdout",
    name: "Braxis Holdout",
    aliases: ["브락", "브락시스항전", "항전", "테란"],
  },
  {
    slug: "cursed-hollow",
    name: "Cursed Hollow",
    aliases: ["저골", "저주받은골짜기"],
  },
  {
    slug: "dragon-shire",
    name: "Dragon Shire",
    aliases: ["용의 둥지", "용의둥지", "둥지", "용둥", "용기사"],
  },
  {
    slug: "garden-of-terror",
    name: "Garden of Terror",
    aliases: ["공포의 정원", "공포의정원", "정원", "씨앗", "공정"],
  },
  {
    slug: "hanamura-temple",
    name: "Hanamura Temple",
    aliases: ["hanamura", "하나무라 사원", "하나무라사원", "하나무라"],
  },
  {
    slug: "infernal-shrines",
    name: "Infernal Shrines",
    aliases: ["불지옥 신단", "불지옥신단", "신단", "불지옥"],
  },
  {
    slug: "sky-temple",
    name: "Sky Temple",
    aliases: ["하늘 사원", "하늘사원", "하늘", "사막"],
  },
  {
    slug: "tomb-of-the-spider-queen",
    name: "Tomb of the Spider Queen",
    aliases: ["거미 여왕의 무덤", "거미여왕의무덤", "거미", "무덤"],
  },
  {
    slug: "towers-of-doom",
    name: "Towers of Doom",
    aliases: ["파멸의 탑", "파멸의탑", "파탑"],
  },
  {
    slug: "volskaya-foundry",
    name: "Volskaya Foundry",
    aliases: ["볼스카야 공장", "볼스카야공장", "볼스", "볼스카야"],
  },
  {
    slug: "warhead-junction",
    name: "Warhead Junction",
    aliases: ["핵탄두 격전지", "핵탄두격전지", "핵", "핵탄두"],
  },
];

const MAP_LOOKUP: ReadonlyMap<string, MapConfig> = buildMapLookup(MAP_CONFIGS);

const TIER_SECTIONS: ReadonlyArray<{ readonly id: string; readonly label: TierLabel }> = [
  { id: "tier-s", label: "S" },
  { id: "tier-a", label: "A" },
  { id: "tier-b", label: "B" },
  { id: "tier-c", label: "C" },
  { id: "tier-d", label: "D" },
];

/**
 * 메신저 웹훅용 맵 티어리스트 조회
 * POST /api/tier/maps (body.text: map name)
 */
export async function POST(request: NextRequest): Promise<Response> {
  const body: Partial<DooraySlashCommandRequest> = await request.json().catch(() => ({}));
  return handleTierListRequest(body.text ?? null);
}

/**
 * 로컬 테스트용
 * GET /api/tier/maps?map=Alterac Pass
 */
export async function GET(request: NextRequest): Promise<Response> {
  return handleTierListRequest(request.nextUrl.searchParams.get("map"));
}

async function handleTierListRequest(rawMapName: string | null): Promise<Response> {
  const mapName = rawMapName?.trim();
  if (!mapName) {
    return webhookResponse({
      text: [
        "맵 이름을 입력해주세요.",
        "예) /map-tier 알터랙",
        "",
        `[지원 맵] ${MAP_CONFIGS.map((map) => map.name).join(", ")}`,
      ].join("\n"),
      responseType: "ephemeral",
    });
  }

  const config = MAP_LOOKUP.get(normalizeMapQuery(mapName));
  if (!config) {
    return webhookResponse({
      text: [
        `지원하지 않는 맵입니다: ${mapName}`,
        "",
        `[지원 맵] ${MAP_CONFIGS.map((map) => map.aliases.join(", ")).join(", ")}`,
      ].join("\n"),
      responseType: "ephemeral",
    });
  }

  const sourceUrl = buildTierListUrl(config.slug);

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; infomax-heroes-club/1.0; +https://www.icy-veins.com)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return webhookResponse({
        text: `티어리스트 조회 실패: ${response.status} ${response.statusText}`,
        responseType: "ephemeral",
      });
    }

    const html = await response.text();
    const parsed = parseTierListHtml(html);

    if (parsed.tiers.length === 0) {
      return webhookResponse({
        text: "티어리스트 파싱에 실패했습니다. (원본 HTML 구조 변경 가능성)",
        responseType: "ephemeral",
      });
    }

    return webhookResponse(
      {
        text: formatTierMessage({
          map: parsed.map ?? config.name,
          updatedAt: parsed.updatedAt,
          tiers: parsed.tiers,
          sourceUrl,
        }),
        responseType: "ephemeral",
      },
      {
        headers: {
          "Cache-Control": "public, max-age=600",
        },
      },
    );
  } catch (error) {
    console.error("맵 티어리스트 조회 오류:", error);
    return webhookResponse({
      text: `맵 티어리스트 조회 중 오류가 발생했습니다.\n${error instanceof Error ? error.message : "알 수 없는 오류"}`,
      responseType: "ephemeral",
    });
  }
}

function webhookResponse(body: DooraySlashCommandResponse, init?: ResponseInit): Response {
  return Response.json(body, init);
}

function formatTierMessage(input: {
  readonly map: string;
  readonly updatedAt: string | null;
  readonly tiers: ReadonlyArray<TierSection>;
  readonly sourceUrl: string;
}): string {
  const lines: string[] = [
    `[히오스 ${input.map} 티어리스트]`,
    input.updatedAt ? `업데이트: ${input.updatedAt}` : "업데이트: 정보 없음",
    "표기: BAN(밴 추천), ▲(상향), ▼(하향)",
    "",
  ];

  for (const section of input.tiers) {
    const totalHeroes = section.roles.reduce((sum, role) => sum + role.heroes.length, 0);
    lines.push(`${section.tier} 티어 (${totalHeroes}명)`);

    for (const role of section.roles) {
      const roleLabel = ROLE_LABEL_MAP[role.role] ?? role.role;
      const heroesText = role.heroes.map(formatHeroText).join(", ");
      lines.push(`- ${roleLabel}(${role.heroes.length}): ${heroesText}`);
    }

    lines.push("");
  }

  return lines.join("\n").trim();
}

function formatHeroText(hero: TierHero): string {
  const marks: string[] = [];
  if (hero.isBanRecommended) marks.push("BAN");
  if (hero.trend === "UP") marks.push("▲");
  if (hero.trend === "DOWN") marks.push("▼");

  if (marks.length === 0) return hero.name;
  return `${hero.name}(${marks.join(" ")})`;
}

const ROLE_LABEL_MAP: Record<string, string> = {
  Tank: "탱커",
  Offlaner: "투사",
  "Melee Assassin": "근접 암살자",
  "Ranged Assassin": "원거리 암살자",
  Healer: "힐러",
  Support: "지원가",
};

const HERO_NAME_KO_BY_ICY_KEY = buildHeroNameMapByIcyKey();

function buildMapLookup(configs: ReadonlyArray<MapConfig>): ReadonlyMap<string, MapConfig> {
  const lookup = new Map<string, MapConfig>();

  for (const config of configs) {
    const tokens = new Set<string>([
      config.slug,
      config.slug.replaceAll("-", " "),
      config.slug.replaceAll("-", ""),
      config.name,
      ...config.aliases,
    ]);

    for (const token of tokens) {
      lookup.set(normalizeMapQuery(token), config);
    }
  }

  return lookup;
}

function normalizeMapQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("’", "'")
    .replaceAll("'", "")
    .replace(/[^\w가-힣\s-]/g, " ")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTierListUrl(slug: string): string {
  return `https://www.icy-veins.com/heroes/heroes-of-the-storm-${slug}-tier-list`;
}

function parseTierListHtml(html: string): { map: string | null; updatedAt: string | null; tiers: TierSection[] } {
  const map = extractMapName(html);
  const updatedAt = extractUpdatedAt(html);

  const tiers: TierSection[] = [];

  for (const section of TIER_SECTIONS) {
    const sectionStart = html.indexOf(`<h2 id="${section.id}"`);
    if (sectionStart < 0) continue;

    const htlStart = html.indexOf('<div class="htl">', sectionStart);
    if (htlStart < 0) continue;

    const parsedHtl = extractBalancedDiv(html, htlStart);
    if (!parsedHtl) continue;

    const roles = parseRoleGroups(parsedHtl.innerHtml);
    tiers.push({
      tier: section.label,
      roles,
    });
  }

  return { map, updatedAt, tiers };
}

function extractMapName(html: string): string | null {
  const h1Match = html.match(/<h1[^>]*>\s*Heroes of the Storm\s+(.+?)\s+Tier List\s*<\/h1>/i);
  if (!h1Match) return null;
  return normalizeText(h1Match[1]);
}

function extractUpdatedAt(html: string): string | null {
  const changelogMatch = html.match(
    /<h2 id="changelog"[\s\S]*?<ul class="changelog">[\s\S]*?<li>\s*<strong>\s*([^<:]+):\s*<\/strong>/i,
  );

  if (!changelogMatch) return null;
  return normalizeText(changelogMatch[1]);
}

function parseRoleGroups(htlHtml: string): TierRoleGroup[] {
  const groups: TierRoleGroup[] = [];
  let cursor = 0;

  while (cursor < htlHtml.length) {
    const blockStart = htlHtml.indexOf('<div class="htl_l', cursor);
    if (blockStart < 0) break;

    const block = extractBalancedDiv(htlHtml, blockStart);
    if (!block) break;

    const group = parseRoleGroup(block.innerHtml);
    if (group && group.heroes.length > 0) {
      groups.push(group);
    }

    cursor = block.endIndex;
  }

  return groups;
}

function parseRoleGroup(roleBlockHtml: string): TierRoleGroup | null {
  const divBlocks = extractTopLevelDivBlocks(roleBlockHtml);
  if (divBlocks.length < 2) return null;

  const headerHtml = divBlocks[0];
  const heroesHtml = divBlocks[1];

  const roleName = extractRoleName(headerHtml);
  if (!roleName) return null;

  const roleIdMatch = headerHtml.match(/htl_role_([a-z-]+)/i);
  const heroes = extractHeroes(heroesHtml);

  return {
    role: roleName,
    roleId: roleIdMatch?.[1] ?? null,
    heroes,
  };
}

function extractRoleName(headerHtml: string): string | null {
  const spanMatches = Array.from(headerHtml.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi));
  if (spanMatches.length < 2) return null;

  const role = normalizeText(spanMatches[1][1]);
  return role.length > 0 ? role : null;
}

function extractHeroes(heroesHtml: string): TierHero[] {
  const heroes: TierHero[] = [];
  const heroMatches = heroesHtml.matchAll(/<span([^>]*)>\s*<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/span>/gi);

  for (const match of heroMatches) {
    const spanAttributes = match[1];
    const href = match[2];
    const anchorHtml = match[3];
    const rankingKey = extractRankingKey(spanAttributes);
    const plainSpanMatches = Array.from(anchorHtml.matchAll(/<span>\s*([^<]+?)\s*<\/span>/gi));
    const heroNameFromHtml = normalizeText(plainSpanMatches.at(-1)?.[1] ?? "");

    const slugMatch = href.match(/\/heroes\/([^/?#]+)-build-guide/i);
    const heroSlug = slugMatch?.[1] ?? null;

    const heroName = resolveHeroNameKo({
      rankingKey,
      heroSlug,
      fallbackName: heroNameFromHtml,
    });

    if (!heroName) continue;

    heroes.push({
      name: heroName,
      heroSlug,
      url: normalizeUrl(href),
      isBanRecommended: /htl_ban_true/.test(anchorHtml),
      trend: /htl_change_up/.test(anchorHtml) ? "UP" : /htl_change_down/.test(anchorHtml) ? "DOWN" : "SAME",
    });
  }

  return heroes;
}

function extractTopLevelDivBlocks(source: string): string[] {
  const blocks: string[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const start = source.indexOf("<div", cursor);
    if (start < 0) break;

    const block = extractBalancedDiv(source, start);
    if (!block) break;

    blocks.push(block.innerHtml);
    cursor = block.endIndex;
  }

  return blocks;
}

function extractBalancedDiv(source: string, start: number): { innerHtml: string; endIndex: number } | null {
  const divTagRegex = /<\/?div\b[^>]*>/gi;
  divTagRegex.lastIndex = start;

  let depth = 0;
  let contentStart = -1;

  for (let match = divTagRegex.exec(source); match; match = divTagRegex.exec(source)) {
    const tag = match[0];
    const isClosing = tag.startsWith("</");

    if (!isClosing) {
      depth += 1;
      if (depth === 1) {
        contentStart = divTagRegex.lastIndex;
      }
      continue;
    }

    depth -= 1;
    if (depth === 0 && contentStart >= 0) {
      return {
        innerHtml: source.slice(contentStart, match.index),
        endIndex: divTagRegex.lastIndex,
      };
    }
  }

  return null;
}

function normalizeText(value: string): string {
  return decodeHtmlEntities(stripHtmlTags(value)).replace(/\s+/g, " ").trim();
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

function decodeHtmlEntities(value: string): string {
  const decodedNamed = value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

  const decodedHex = decodedNamed.replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
    const codePoint = Number.parseInt(hex, 16);
    return Number.isNaN(codePoint) ? _ : String.fromCodePoint(codePoint);
  });

  return decodedHex.replace(/&#([0-9]+);/g, (_, numeric: string) => {
    const codePoint = Number.parseInt(numeric, 10);
    return Number.isNaN(codePoint) ? _ : String.fromCodePoint(codePoint);
  });
}

function normalizeUrl(url: string): string {
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `https://www.icy-veins.com${url}`;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://www.icy-veins.com/${url.replace(/^\/+/, "")}`;
}

function extractRankingKey(spanAttributes: string): string | null {
  const rankingIdMatch = spanAttributes.match(/\bid="ranking-([^"]+)"/i);
  if (!rankingIdMatch) return null;
  return rankingIdMatch[1].trim();
}

function resolveHeroNameKo(input: {
  readonly rankingKey: string | null;
  readonly heroSlug: string | null;
  readonly fallbackName: string;
}): string {
  const candidates = [input.rankingKey, input.heroSlug];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalizedKey = normalizeIcyKey(candidate);
    if (!normalizedKey) continue;

    const varianVariantName = VARIAN_VARIANT_NAME_MAP[normalizedKey];
    if (varianVariantName) return varianVariantName;

    const direct = HERO_NAME_KO_BY_ICY_KEY.get(normalizedKey);
    if (direct) return direct;

    if (normalizedKey.startsWith("varian")) {
      const varianName = HERO_NAME_KO_BY_ICY_KEY.get("varian");
      if (varianName) return varianName;
    }
  }

  return input.fallbackName;
}

function normalizeIcyKey(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("'", "")
    .replaceAll("’", "")
    .replace(/[^a-z0-9]/g, "");
}

const VARIAN_VARIANT_NAME_MAP: Record<string, string> = {
  variantaunt: "바리안-도발",
  variantwin: "바리안-쌍검",
  variancolossus: "바리안-거강",
  varianclossus: "바리안-거강",
};

function buildHeroNameMapByIcyKey(): ReadonlyMap<string, string> {
  const map = new Map<string, string>();

  for (const [hero, icyKey] of Object.entries(HeroIcyVeinKeyMap)) {
    const heroNameKo = HeroMap[hero as keyof typeof HeroMap];
    map.set(normalizeIcyKey(icyKey), heroNameKo);
  }

  return map;
}
