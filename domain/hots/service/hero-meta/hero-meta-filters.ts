export interface FilterOptions {
  readonly patches: ReadonlyArray<string>;
  readonly maps: ReadonlyArray<string>;
}

export type HeroMetaAudience = "all" | "platinum_plus";

export function parseHeroMetaAudience(value: string | null): HeroMetaAudience | null {
  if (value === null || value === "all") return "all";
  if (value === "platinum_plus") return value;
  return null;
}

export interface HeroMetaFilters {
  readonly mode: "sl" | "qm" | "ar";
  readonly region: "ALL" | "NA" | "EU" | "KR" | "CN";
  readonly patch: string;
  readonly map: string | null;
  readonly leagueTier: string | null;
}

export function validateFixedHeroMetaFilters(params: URLSearchParams): void {
  const mode = params.get("mode") ?? "sl";
  const region = params.get("region") ?? "ALL";
  const leagueTier = params.get("leagueTier") || null;
  if (!(["sl", "qm", "ar"] as string[]).includes(mode)) throw new Error("지원하지 않는 게임 모드입니다.");
  if (!(["ALL", "NA", "EU", "KR", "CN"] as string[]).includes(region)) throw new Error("지원하지 않는 지역입니다.");
  if (leagueTier && !["0", "1", "2", "3", "4", "5", "6"].includes(leagueTier)) {
    throw new Error("지원하지 않는 리그 등급입니다.");
  }
}

export function parseHeroMetaFilters(params: URLSearchParams, options: FilterOptions): HeroMetaFilters {
  validateFixedHeroMetaFilters(params);
  const mode = params.get("mode") ?? "sl";
  const region = params.get("region") ?? "ALL";
  const patch = params.get("patch") ?? options.patches[0];
  const map = params.get("map") || null;
  const leagueTier = params.get("leagueTier") || null;
  if (!patch || !options.patches.includes(patch)) throw new Error("지원하지 않는 패치입니다.");
  if (map && !options.maps.includes(map)) throw new Error("지원하지 않는 맵입니다.");

  return {
    mode: mode as HeroMetaFilters["mode"],
    region: region as HeroMetaFilters["region"],
    patch,
    map,
    leagueTier,
  };
}
