import type { FilterOptions, HeroMetaAudience, HeroMetaFilters } from "@/domain/hots/service/hero-meta-filters";
import type { HeroMetaSource, HeroMetaSourceResult } from "@/domain/hots/service/hero-meta-loader";
import { uniq } from "es-toolkit";

const BASE_URL = "https://www.heroesprofile.com/api/external/v1";

export class HeroesProfileRequestError extends Error {
  constructor(readonly status: number) {
    const message =
      status === 401
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
  const match = new RegExp(/^\/(?:api\/external\/)?v1\/jobs\/([a-zA-Z0-9-]+)$/).exec(url.pathname);
  if (url.origin !== "https://www.heroesprofile.com" || !match || url.search || url.hash) {
    throw new Error("Heroes Profile 작업 주소가 올바르지 않습니다.");
  }
  return `/jobs/${match[1]}`;
}

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function parseRetryAfter(value: string | null): number {
  if (value === null) return 10;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return seconds;
  const retryAt = Date.parse(value);
  return Number.isNaN(retryAt) ? 10 : Math.max(0, (retryAt - Date.now()) / 1000);
}

export function parseReferenceOptions(patches: unknown, maps: unknown): FilterOptions {
  const patchRows = object(patches)?.patches;
  const mapRows = object(maps)?.maps;

  if (!Array.isArray(patchRows) || !Array.isArray(mapRows)) {
    throw new TypeError("Heroes Profile 옵션 형식이 올바르지 않습니다.");
  }

  const majorPatches = uniq(
    patchRows.flatMap((row) => {
      const item = object(row);
      const version =
        typeof row === "string" ? row : (item?.game_version ?? item?.version ?? item?.patch ?? item?.major);

      const match = typeof version === "string" ? new RegExp(/^(\d+\.\d+)/).exec(version) : null;

      if (match && item?.valid_globals !== false) {
        return [match[1]];
      }

      if (typeof item?.major === "number" && typeof item.minor === "number" && item.valid_globals !== false) {
        return [`${item.major}.${item.minor}`];
      }

      return [];
    }),
  ).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  const mapNames = mapRows
    .flatMap((row) => {
      const item = object(row);
      return item?.playable !== 0 && typeof item?.name === "string" ? [item.name] : [];
    })
    .sort((a, b) => a.localeCompare(b));

  if (majorPatches.length === 0) {
    throw new Error("사용 가능한 패치가 없습니다.");
  }

  return { patches: majorPatches, maps: mapNames };
}

export function parseLatestMajorSubPatch(patches: unknown): string {
  const patchRows = object(patches)?.patches;

  if (!Array.isArray(patchRows)) {
    throw new TypeError("Heroes Profile 패치 옵션 형식이 올바르지 않습니다.");
  }

  const subPatches = patchRows.flatMap((row) => {
    const item = object(row);
    if (item?.valid_globals === false) {
      return [];
    }

    const version = typeof row === "string" ? row : (item?.game_version ?? item?.version ?? item?.patch);
    const match = typeof version === "string" ? version.match(/^(\d+\.\d+\.\d+)(?:\.\d+)?$/) : null;

    return match ? [match[1]] : [];
  });

  const latest = uniq(subPatches).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];

  if (!latest) {
    throw new Error("사용 가능한 메이저 서브 패치가 없습니다.");
  }

  return latest;
}

export function getLatestMajorSubPatch(apiKey: string, fetcher: typeof fetch = fetch): Promise<string> {
  return (async () => {
    const response = await fetcher(`${BASE_URL}/patches`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) throw new HeroesProfileRequestError(response.status);
    const raw = (await response.json()) as unknown;
    return parseLatestMajorSubPatch(raw);
  })();
}

export function heroesProfileSource(
  apiKey: string,
  fetcher: typeof fetch = fetch,
): HeroMetaSource & {
  fetchGroupedMapStats(filters: HeroMetaFilters): Promise<HeroMetaSourceResult>;
} {
  async function request(path: string): Promise<HeroMetaSourceResult> {
    const response = await fetcher(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    if (response.status === 202) {
      const location = response.headers.get("Location");
      if (!location && !path.startsWith("/jobs/")) throw new Error("Heroes Profile 작업 주소가 없습니다.");
      const retryAfterSeconds = parseRetryAfter(response.headers.get("Retry-After"));
      return { kind: "pending", jobPath: location ? validateJobLocation(location) : path, retryAfterSeconds };
    }
    if (!response.ok) throw new HeroesProfileRequestError(response.status);
    return { kind: "ready", raw: await response.json() };
  }

  return {
    fetchStats: async (filters: HeroMetaFilters) => {
      const params = new URLSearchParams({
        timeframe_type: "major_grouped",
        timeframe: filters.patch,
        game_type: filters.mode,
      });

      if (filters.region !== "ALL") params.set("region", filters.region);
      if (filters.map) params.set("game_map", filters.map);
      if (filters.leagueTier) params.set("league_tier", filters.leagueTier);

      return request(`/heroes/stats?${params.toString()}`);
    },
    fetchGroupedMapStats: async (filters: HeroMetaFilters) => {
      const params = new URLSearchParams({
        timeframe_type: "major_grouped",
        timeframe: filters.patch,
        game_type: filters.mode,
        group_by_map: "true",
      });

      if (filters.region !== "ALL") params.set("region", filters.region);
      if (filters.leagueTier) params.set("league_tier", filters.leagueTier);

      return request(`/heroes/stats?${params.toString()}`);
    },
    pollJob: async (path: string) => {
      if (!/^\/jobs\/[a-zA-Z0-9-]+$/.test(path)) throw new Error("Heroes Profile 작업 주소가 올바르지 않습니다.");
      return request(path);
    },
  };
}

export function heroesProfileDailySource(
  apiKey: string,
  fetcher: typeof fetch = fetch,
): {
  getLatestMajorSubPatch(): Promise<string>;
  fetchStats(patch: string, audience: HeroMetaAudience): Promise<HeroMetaSourceResult>;
  fetchMapStats(patch: string, audience: HeroMetaAudience): Promise<HeroMetaSourceResult>;
  pollJob(path: string): Promise<HeroMetaSourceResult>;
} {
  const source = heroesProfileSource(apiKey, fetcher);

  return {
    getLatestMajorSubPatch: () => getLatestMajorSubPatch(apiKey, fetcher),
    fetchStats: (patch, audience) =>
      source.fetchStats({
        mode: "sl",
        region: "ALL",
        patch,
        map: null,
        leagueTier: audience === "platinum_plus" ? "4,5,6" : null,
      }),
    fetchMapStats: (patch, audience) =>
      source.fetchGroupedMapStats({
        mode: "sl",
        region: "ALL",
        patch,
        map: null,
        leagueTier: audience === "platinum_plus" ? "4,5,6" : null,
      }),
    pollJob: (path) => source.pollJob(path),
  };
}
