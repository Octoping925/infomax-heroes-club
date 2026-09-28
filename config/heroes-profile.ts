import type { FilterOptions, HeroMetaFilters } from "@/domain/hots/service/hero-meta-filters";
import type { HeroMetaSource, HeroMetaSourceResult } from "@/domain/hots/service/hero-meta-loader";

const BASE_URL = "https://www.heroesprofile.com/api/external/v1";

export function validateJobLocation(location: string): string {
  const url = new URL(location, "https://www.heroesprofile.com");
  const match = url.pathname.match(/^\/(?:api\/external\/)?v1\/jobs\/([a-zA-Z0-9-]+)$/);
  if (url.origin !== "https://www.heroesprofile.com" || !match || url.search || url.hash) {
    throw new Error("Heroes Profile 작업 주소가 올바르지 않습니다.");
  }
  return `/jobs/${match[1]}`;
}

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

export function parseReferenceOptions(patches: unknown, maps: unknown): FilterOptions {
  const patchRows = object(patches)?.patches;
  const mapRows = object(maps)?.maps;
  if (!Array.isArray(patchRows) || !Array.isArray(mapRows)) throw new Error("Heroes Profile 옵션 형식이 올바르지 않습니다.");
  const majorPatches = [...new Set(patchRows.flatMap((row) => {
    const item = object(row);
    const version = item?.version ?? item?.patch ?? item?.major;
    const match = typeof version === "string" ? version.match(/^(\d+\.\d+)/) : null;
    return match ? [match[1]] : [];
  }))].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const mapNames = mapRows.flatMap((row) => {
    const item = object(row);
    return item?.playable !== 0 && typeof item?.name === "string" ? [item.name] : [];
  }).sort((a, b) => a.localeCompare(b));
  if (majorPatches.length === 0) throw new Error("사용 가능한 패치가 없습니다.");
  return { patches: majorPatches, maps: mapNames };
}

export function heroesProfileSource(apiKey: string, fetcher: typeof fetch = fetch): HeroMetaSource {
  async function request(path: string): Promise<HeroMetaSourceResult> {
    const response = await fetcher(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    if (response.status === 202) {
      const location = response.headers.get("Location");
      if (!location) throw new Error("Heroes Profile 작업 주소가 없습니다.");
      const retryAfter = Number(response.headers.get("Retry-After") ?? "10");
      return { kind: "pending", jobPath: validateJobLocation(location), retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : 10 };
    }
    if (!response.ok) throw new Error(`Heroes Profile 응답 오류 (${response.status})`);
    return { kind: "ready", raw: await response.json() };
  }

  return {
    fetchStats: async (filters: HeroMetaFilters) => {
      const params = new URLSearchParams({ timeframe_type: "major", timeframe: filters.patch, game_type: filters.mode });
      if (filters.region !== "ALL") params.set("region", filters.region);
      if (filters.map) params.set("game_map", filters.map);
      if (filters.leagueTier) params.set("league_tier", filters.leagueTier);
      return request(`/heroes/stats?${params.toString()}`);
    },
    pollJob: async (path: string) => {
      if (!/^\/jobs\/[a-zA-Z0-9-]+$/.test(path)) throw new Error("Heroes Profile 작업 주소가 올바르지 않습니다.");
      return request(path);
    },
  };
}

export async function getHeroMetaOptions(apiKey: string, fetcher: typeof fetch = fetch): Promise<FilterOptions> {
  const headers = { Authorization: `Bearer ${apiKey}` };
  const request = async (path: string) => {
    const response = await fetcher(`${BASE_URL}${path}`, { headers, next: { revalidate: 86_400 } });
    if (!response.ok) throw new Error(`Heroes Profile 옵션 조회 실패 (${response.status})`);
    return response.json() as Promise<unknown>;
  };
  const [patches, maps] = await Promise.all([request("/patches"), request("/maps")]);
  return parseReferenceOptions(patches, maps);
}
