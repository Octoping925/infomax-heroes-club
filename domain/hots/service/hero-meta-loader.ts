import type { HeroMetaFilters } from "./hero-meta-filters";
import { gradeHeroStats, parseHeroStats, type HeroMetaRow, type HeroMetaStat } from "./hero-meta-tier";

export interface HeroMetaSnapshot {
  readonly stats: HeroMetaStat[] | null;
  readonly fetchedAt: Date | null;
  readonly jobPath: string | null;
  readonly nextPollAt: Date | null;
  readonly leaseUntil: Date | null;
}

export interface HeroMetaSnapshotStore {
  getOrCreate(key: string): Promise<HeroMetaSnapshot>;
  claim(key: string, now: Date, leaseUntil: Date, expectedFetchedAt: Date | null): Promise<boolean>;
  saveReady(key: string, stats: HeroMetaStat[], fetchedAt: Date): Promise<void>;
  savePending(key: string, jobPath: string, nextPollAt: Date): Promise<void>;
  saveError(key: string, nextRetryAt: Date): Promise<void>;
}

export type HeroMetaSourceResult = { readonly kind: "ready"; readonly raw: unknown } | {
  readonly kind: "pending";
  readonly jobPath: string;
  readonly retryAfterSeconds: number;
};

export interface HeroMetaSource {
  fetchStats(filters: HeroMetaFilters): Promise<HeroMetaSourceResult>;
  pollJob(path: string): Promise<HeroMetaSourceResult>;
}

export interface HeroMetaResult {
  readonly status: "ready" | "stale" | "pending" | "error";
  readonly rows: HeroMetaRow[];
  readonly updatedAt: string | null;
  readonly retryAfterSeconds: number | null;
  readonly error?: string;
}

export async function loadHeroMeta(filters: HeroMetaFilters, deps: {
  readonly store: HeroMetaSnapshotStore;
  readonly source: HeroMetaSource;
  readonly now: Date;
  readonly nowAfterRequest?: () => Date;
}): Promise<HeroMetaResult> {
  const { store, source, now } = deps;
  const key = JSON.stringify([filters.mode, filters.region, filters.patch, filters.map, filters.leagueTier]);
  const snapshot = await store.getOrCreate(key);
  const rows = snapshot.stats ? gradeHeroStats(snapshot.stats) : [];
  const updatedAt = snapshot.fetchedAt?.toISOString() ?? null;
  const stale = snapshot.fetchedAt === null || now.getTime() - snapshot.fetchedAt.getTime() >= 86_400_000;
  if (!stale) return { status: "ready", rows, updatedAt, retryAfterSeconds: null };

  const waitUntil = [snapshot.nextPollAt, snapshot.leaseUntil].filter((date): date is Date => date !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  if (waitUntil && waitUntil > now) {
    return { status: snapshot.stats ? "stale" : "pending", rows, updatedAt, retryAfterSeconds: Math.ceil((waitUntil.getTime() - now.getTime()) / 1000) };
  }

  if (!(await store.claim(key, now, new Date(now.getTime() + 60_000), snapshot.fetchedAt))) {
    const latest = await store.getOrCreate(key);
    const latestRows = latest.stats ? gradeHeroStats(latest.stats) : [];
    const latestUpdatedAt = latest.fetchedAt?.toISOString() ?? null;
    const latestStale = latest.fetchedAt === null || now.getTime() - latest.fetchedAt.getTime() >= 86_400_000;
    return {
      status: latestStale ? (latest.stats ? "stale" : "pending") : "ready",
      rows: latestRows,
      updatedAt: latestUpdatedAt,
      retryAfterSeconds: latestStale ? 10 : null,
    };
  }

  try {
    const response = snapshot.jobPath ? await source.pollJob(snapshot.jobPath) : await source.fetchStats(filters);
    if (response.kind === "pending") {
      const retryAfterSeconds = Math.max(1, response.retryAfterSeconds);
      const pollFrom = deps.nowAfterRequest?.() ?? new Date();
      await store.savePending(key, response.jobPath, new Date(pollFrom.getTime() + retryAfterSeconds * 1000));
      return { status: snapshot.stats ? "stale" : "pending", rows, updatedAt, retryAfterSeconds };
    }
    const stats = parseHeroStats(response.raw);
    if (stats.length === 0 && typeof response.raw === "object" && response.raw !== null &&
      "data" in response.raw && Array.isArray(response.raw.data) && response.raw.data.length > 0) {
      throw new Error("Heroes Profile 영웅 통계에 필요한 항목이 없습니다.");
    }
    await store.saveReady(key, stats, now);
    return { status: "ready", rows: gradeHeroStats(stats), updatedAt: now.toISOString(), retryAfterSeconds: null };
  } catch (error) {
    const errorAt = deps.nowAfterRequest?.() ?? new Date();
    await store.saveError(key, new Date(errorAt.getTime() + 300_000));
    return {
      status: snapshot.stats ? "stale" : "error",
      rows,
      updatedAt,
      retryAfterSeconds: 300,
      error: error instanceof Error ? error.message : "Heroes Profile 요청에 실패했습니다.",
    };
  }
}
