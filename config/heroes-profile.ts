import type { FilterOptions, HeroMetaFilters } from "@/domain/hots/service/hero-meta-filters";
import type { HeroMetaSource, HeroMetaSourceResult } from "@/domain/hots/service/hero-meta-loader";

const BASE_URL = "https://www.heroesprofile.com/api/external/v1";

export class HeroesProfileRequestError extends Error {
  constructor(readonly status: number) {
    const message = status === 401
      ? "Heroes Profile API 키 인증에 실패했습니다."
      : status === 403
        ? "현재 Heroes Profile 플랜에 이 통계 조회 권한이 없습니다."
        : status === 429
          ? "Heroes Profile API 요청 한도에 도달했습니다. 잠시 후 다시 시도합니다."
          : `Heroes Profile 응답 오류 (${status})`;
    super(message);
    this.name = "HeroesProfileRequestError";
  }
}

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
    const version = typeof row === "string" ? row : item?.version ?? item?.patch ?? item?.major;
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
      if (!location && !path.startsWith("/jobs/")) throw new Error("Heroes Profile 작업 주소가 없습니다.");
      const retryAfter = Number(response.headers.get("Retry-After") ?? "10");
      return { kind: "pending", jobPath: location ? validateJobLocation(location) : path, retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : 10 };
    }
    if (!response.ok) throw new HeroesProfileRequestError(response.status);
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
    if (!response.ok) throw new HeroesProfileRequestError(response.status);
    return response.json() as Promise<unknown>;
  };
  const [patches, maps] = await Promise.all([request("/patches"), request("/maps")]);
  return parseReferenceOptions(patches, maps);
}
