import { NextRequest, NextResponse } from "next/server";

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

type TierMapResponse = {
  readonly map: string;
  readonly slug: string;
  readonly sourceUrl: string;
  readonly fetchedAt: string;
  readonly updatedAt: string | null;
  readonly tiers: ReadonlyArray<TierSection>;
};

type ErrorResponse = {
  readonly error: string;
  readonly availableMaps?: ReadonlyArray<string>;
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
    aliases: ["alterac pass", "alteracpass", "알터랙 고개", "알터랙고개"],
  },
  {
    slug: "battlefield-of-eternity",
    name: "Battlefield of Eternity",
    aliases: ["battlefield of eternity", "battlefieldofeternity", "영원의 전쟁터", "영원 전쟁터"],
  },
  {
    slug: "blackhearts-bay",
    name: "Blackheart's Bay",
    aliases: ["blackhearts bay", "blackheart's bay", "blackheartsbay", "블랙하트 항만", "블랙하트항만"],
  },
  {
    slug: "braxis-holdout",
    name: "Braxis Holdout",
    aliases: ["braxis holdout", "braxisholdout", "브락시스 항전", "브락시스항전"],
  },
  {
    slug: "cursed-hollow",
    name: "Cursed Hollow",
    aliases: ["cursed hollow", "cursedhollow", "저주받은 골짜기", "저주받은골짜기"],
  },
  {
    slug: "dragon-shire",
    name: "Dragon Shire",
    aliases: ["dragon shire", "dragonshire", "용의 둥지", "용의둥지"],
  },
  {
    slug: "garden-of-terror",
    name: "Garden of Terror",
    aliases: ["garden of terror", "gardenofterror", "공포의 정원", "공포의정원", "haunted woods", "hauntedwoods"],
  },
  {
    slug: "hanamura-temple",
    name: "Hanamura Temple",
    aliases: ["hanamura temple", "hanamura", "하나무라 사원", "하나무라사원", "하나무라"],
  },
  {
    slug: "infernal-shrines",
    name: "Infernal Shrines",
    aliases: ["infernal shrines", "infernalshrines", "불지옥 신단", "불지옥신단"],
  },
  {
    slug: "sky-temple",
    name: "Sky Temple",
    aliases: ["sky temple", "skytemple", "하늘 사원", "하늘사원"],
  },
  {
    slug: "tomb-of-the-spider-queen",
    name: "Tomb of the Spider Queen",
    aliases: [
      "tomb of the spider queen",
      "tombofthespiderqueen",
      "거미 여왕의 무덤",
      "거미여왕의무덤",
    ],
  },
  {
    slug: "towers-of-doom",
    name: "Towers of Doom",
    aliases: ["towers of doom", "towersofdoom", "파멸의 탑", "파멸의탑"],
  },
  {
    slug: "volskaya-foundry",
    name: "Volskaya Foundry",
    aliases: ["volskaya foundry", "volskayafoundry", "볼스카야 공장", "볼스카야공장"],
  },
  {
    slug: "warhead-junction",
    name: "Warhead Junction",
    aliases: ["warhead junction", "warheadjunction", "핵탄두 격전지", "핵탄두격전지"],
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
 * Icy Veins 맵별 티어리스트 조회
 * GET /api/tier/maps?map=Alterac Pass
 */
export async function GET(request: NextRequest): Promise<NextResponse<TierMapResponse | ErrorResponse>> {
  const mapParam = request.nextUrl.searchParams.get("map");
  if (!mapParam?.trim()) {
    return NextResponse.json(
      {
        error: "map 쿼리파라미터가 필요합니다. 예: /api/tier/maps?map=Alterac Pass",
        availableMaps: MAP_CONFIGS.map((map) => map.name),
      },
      { status: 400 },
    );
  }

  const config = MAP_LOOKUP.get(normalizeMapQuery(mapParam));
  if (!config) {
    return NextResponse.json(
      {
        error: `지원하지 않는 맵 이름입니다: ${mapParam}`,
        availableMaps: MAP_CONFIGS.map((map) => map.name),
      },
      { status: 400 },
    );
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
      return NextResponse.json(
        {
          error: `Icy Veins 요청 실패: ${response.status} ${response.statusText}`,
        },
        { status: 502 },
      );
    }

    const html = await response.text();
    const parsed = parseTierListHtml(html);

    if (parsed.tiers.length === 0) {
      return NextResponse.json(
        {
          error: "티어리스트를 파싱하지 못했습니다. HTML 구조가 변경되었을 수 있습니다.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        map: parsed.map ?? config.name,
        slug: config.slug,
        sourceUrl,
        fetchedAt: new Date().toISOString(),
        updatedAt: parsed.updatedAt,
        tiers: parsed.tiers,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=600",
        },
      },
    );
  } catch (error) {
    console.error("맵 티어리스트 조회 오류:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 },
    );
  }
}

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
  const heroAnchorMatches = heroesHtml.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi);

  for (const match of heroAnchorMatches) {
    const href = match[1];
    const anchorHtml = match[2];
    const plainSpanMatches = Array.from(anchorHtml.matchAll(/<span>\s*([^<]+?)\s*<\/span>/gi));
    const heroName = normalizeText(plainSpanMatches.at(-1)?.[1] ?? "");

    if (!heroName) continue;

    const slugMatch = href.match(/\/heroes\/([^/?#]+)-build-guide/i);
    heroes.push({
      name: heroName,
      heroSlug: slugMatch?.[1] ?? null,
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
  return decodeHtmlEntities(stripHtmlTags(value))
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

function decodeHtmlEntities(value: string): string {
  const decodedNamed = value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
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
