import type { HeroMetaAudience } from "./hero-meta-filters";
import { parseGroupedHeroStats, parseHeroStats, type HeroMetaMapStats, type HeroMetaStat } from "./hero-meta-tier";
import type { HeroMetaSourceResult } from "./hero-meta-loader";
import { sumBy } from "es-toolkit";

export interface HeroMetaDailySnapshot {
  readonly stats: HeroMetaStat[] | null;
  readonly patch: string | null;
  readonly fetchedAt: Date | null;
  readonly jobPath: string | null;
  readonly pendingPatch: string | null;
  readonly nextPollAt: Date | null;
  readonly mapStats: HeroMetaMapStats | null;
  readonly mapPatch: string | null;
  readonly mapFetchedAt: Date | null;
  readonly mapJobPath: string | null;
  readonly mapPendingPatch: string | null;
  readonly mapNextPollAt: Date | null;
}

export interface HeroMetaDailyStore {
  get(audience: HeroMetaAudience): Promise<HeroMetaDailySnapshot | null>;
  claimDaily(audience: HeroMetaAudience, runDate: string, now: Date, leaseUntil: Date): Promise<boolean>;
  claimMapDaily(audience: HeroMetaAudience, runDate: string, now: Date, leaseUntil: Date): Promise<boolean>;
  saveReady(audience: HeroMetaAudience, patch: string, stats: HeroMetaStat[], fetchedAt: Date): Promise<void>;
  savePending(
    audience: HeroMetaAudience,
    patch: string | null,
    jobPath: string | null,
    nextPollAt: Date | null,
  ): Promise<void>;
  saveFailure(audience: HeroMetaAudience, message: string): Promise<void>;
  saveMapReady(audience: HeroMetaAudience, patch: string, stats: HeroMetaMapStats, fetchedAt: Date): Promise<void>;
  saveMapPending(
    audience: HeroMetaAudience,
    patch: string | null,
    jobPath: string | null,
    nextPollAt: Date | null,
  ): Promise<void>;
  saveMapFailure(audience: HeroMetaAudience, message: string): Promise<void>;
}

export interface HeroMetaDailySource {
  getLatestMajorSubPatch(): Promise<string>;
  fetchStats(patch: string, audience: HeroMetaAudience): Promise<HeroMetaSourceResult>;
  fetchMapStats(patch: string, audience: HeroMetaAudience): Promise<HeroMetaSourceResult>;
  pollJob(path: string): Promise<HeroMetaSourceResult>;
}

export interface HeroMetaRefreshResult {
  readonly audience: HeroMetaAudience;
  readonly status: "ready" | "pending" | "failed" | "already-ran";
  readonly patch: string;
  readonly rows: number;
  readonly mapRows?: number;
  readonly error?: string;
}

const AUDIENCES: ReadonlyArray<HeroMetaAudience> = ["all", "platinum_plus"];

function kstDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function retryAfterSeconds(result: Extract<HeroMetaSourceResult, { kind: "pending" }>): number {
  return Math.max(1, Math.ceil(result.retryAfterSeconds));
}

function statusOf(error: unknown): number | null {
  return typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
    ? error.status
    : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : "Heroes Profile 수집에 실패했습니다.";
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function refreshAudience(
  audience: HeroMetaAudience,
  patch: string,
  deps: {
    readonly now: Date;
    readonly deadline: number;
    readonly store: HeroMetaDailyStore;
    readonly source: HeroMetaDailySource;
  },
): Promise<HeroMetaRefreshResult> {
  const { now, deadline, store, source } = deps;
  const runDate = kstDate(now);
  const claimed = await store.claimDaily(audience, runDate, now, new Date(Math.min(deadline, now.getTime() + 60_000)));
  if (!claimed) return { audience, status: "already-ran", patch, rows: 0 };

  const snapshot = await store.get(audience);
  if (snapshot?.jobPath && snapshot.pendingPatch !== patch) {
    await store.savePending(audience, null, null, null);
  }
  const result = await refreshDataset({
    patch,
    deadline,
    state: {
      jobPath: snapshot?.pendingPatch === patch ? snapshot.jobPath : null,
      pendingPatch: snapshot?.pendingPatch ?? null,
      nextPollAt: snapshot?.nextPollAt ?? null,
    },
    fetch: () => source.fetchStats(patch, audience),
    poll: (path) => source.pollJob(path),
    parse: parseHeroStats,
    count: (stats) => stats.length,
    saveReady: (stats, fetchedAt) => store.saveReady(audience, patch, stats, fetchedAt),
    savePending: (pendingPatch, jobPath, nextPollAt) => store.savePending(audience, pendingPatch, jobPath, nextPollAt),
    saveFailure: (message) => store.saveFailure(audience, message),
    emptyMessage: "Heroes Profile 응답에 저장할 수 있는 영웅 통계가 없습니다.",
  });
  return { audience, status: result.status, patch, rows: result.rows, error: result.error };
}

async function refreshMapAudience(
  audience: HeroMetaAudience,
  patch: string,
  deps: {
    readonly now: Date;
    readonly deadline: number;
    readonly store: HeroMetaDailyStore;
    readonly source: HeroMetaDailySource;
  },
): Promise<HeroMetaRefreshResult> {
  const { now, deadline, store, source } = deps;
  const runDate = kstDate(now);
  const claimed = await store.claimMapDaily(
    audience,
    runDate,
    now,
    new Date(Math.min(deadline, now.getTime() + 60_000)),
  );
  if (!claimed) return { audience, status: "already-ran", patch, rows: 0, mapRows: 0 };

  const snapshot = await store.get(audience);
  if (snapshot?.mapJobPath && snapshot.mapPendingPatch !== patch) {
    await store.saveMapPending(audience, null, null, null);
  }
  const result = await refreshDataset({
    patch,
    deadline,
    state: {
      jobPath: snapshot?.mapPendingPatch === patch ? snapshot.mapJobPath : null,
      pendingPatch: snapshot?.mapPendingPatch ?? null,
      nextPollAt: snapshot?.mapNextPollAt ?? null,
    },
    fetch: () => source.fetchMapStats(patch, audience),
    poll: (path) => source.pollJob(path),
    parse: parseGroupedHeroStats,
    count: (stats) => sumBy(Object.values(stats), (rows) => rows.length),
    saveReady: (stats, fetchedAt) => store.saveMapReady(audience, patch, stats, fetchedAt),
    savePending: (pendingPatch, jobPath, nextPollAt) =>
      store.saveMapPending(audience, pendingPatch, jobPath, nextPollAt),
    saveFailure: (message) => store.saveMapFailure(audience, message),
    emptyMessage: "Heroes Profile 응답에 저장할 수 있는 맵별 영웅 통계가 없습니다.",
  });
  return { audience, status: result.status, patch, rows: 0, mapRows: result.rows, error: result.error };
}

async function refreshDataset<T>(deps: {
  readonly patch: string;
  readonly deadline: number;
  readonly state: {
    readonly jobPath: string | null;
    readonly pendingPatch: string | null;
    readonly nextPollAt: Date | null;
  };
  readonly fetch: () => Promise<HeroMetaSourceResult>;
  readonly poll: (path: string) => Promise<HeroMetaSourceResult>;
  readonly parse: (raw: unknown) => T;
  readonly count: (stats: T) => number;
  readonly saveReady: (stats: T, fetchedAt: Date) => Promise<void>;
  readonly savePending: (patch: string | null, jobPath: string | null, nextPollAt: Date | null) => Promise<void>;
  readonly saveFailure: (message: string) => Promise<void>;
  readonly emptyMessage: string;
}): Promise<{ status: "ready" | "pending" | "failed"; rows: number; error?: string }> {
  const { patch, deadline, fetch, poll, parse, count, saveReady, savePending, saveFailure, emptyMessage } = deps;
  let jobPath = deps.state.pendingPatch === patch ? deps.state.jobPath : null;
  let retriedExpiredJob = false;

  if (jobPath && deps.state.nextPollAt && deps.state.nextPollAt.getTime() > Date.now()) {
    const delay = deps.state.nextPollAt.getTime() - Date.now();
    if (Date.now() + delay >= deadline) {
      await savePending(patch, jobPath, deps.state.nextPollAt);
      return { status: "pending", rows: 0 };
    }
    await sleep(delay);
  }

  while (Date.now() < deadline) {
    try {
      const response = jobPath ? await poll(jobPath) : await fetch();
      if (response.kind === "ready") {
        const stats = parse(response.raw);
        const rows = count(stats);
        if (rows === 0) throw new Error(emptyMessage);
        await saveReady(stats, new Date());
        return { status: "ready", rows };
      }

      jobPath = response.jobPath;
      const nextPollAt = new Date(Date.now() + retryAfterSeconds(response) * 1000);
      await savePending(patch, jobPath, nextPollAt);
      const delay = nextPollAt.getTime() - Date.now();
      if (Date.now() + delay >= deadline) return { status: "pending", rows: 0 };
      await sleep(delay);
    } catch (error) {
      const status = statusOf(error);
      if (jobPath && !retriedExpiredJob && (status === 404 || status === 500)) {
        retriedExpiredJob = true;
        jobPath = null;
        await savePending(null, null, null);
        continue;
      }
      const message = errorMessage(error);
      await saveFailure(message);
      return { status: "failed", rows: 0, error: message };
    }
  }

  await savePending(patch, jobPath, new Date(Date.now() + 10_000));
  return { status: "pending", rows: 0 };
}

export async function refreshHeroMetaDaily(deps: {
  readonly now: Date;
  readonly deadline: number;
  readonly store: HeroMetaDailyStore;
  readonly source: HeroMetaDailySource;
}): Promise<HeroMetaRefreshResult[]> {
  const patch = await deps.source.getLatestMajorSubPatch();
  return Promise.all(AUDIENCES.map((audience) => refreshAudience(audience, patch, deps)));
}

export async function refreshHeroMetaMapsDaily(deps: {
  readonly now: Date;
  readonly deadline: number;
  readonly store: HeroMetaDailyStore;
  readonly source: HeroMetaDailySource;
}): Promise<HeroMetaRefreshResult[]> {
  const patch = await deps.source.getLatestMajorSubPatch();
  return Promise.all(AUDIENCES.map((audience) => refreshMapAudience(audience, patch, deps)));
}
