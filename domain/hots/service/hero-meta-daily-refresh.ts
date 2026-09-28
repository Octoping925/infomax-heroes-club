import type { HeroMetaAudience } from "./hero-meta-filters";
import { parseHeroStats, type HeroMetaStat } from "./hero-meta-tier";
import type { HeroMetaSourceResult } from "./hero-meta-loader";

export interface HeroMetaDailySnapshot {
  readonly stats: HeroMetaStat[] | null;
  readonly patch: string | null;
  readonly fetchedAt: Date | null;
  readonly jobPath: string | null;
  readonly pendingPatch: string | null;
  readonly nextPollAt: Date | null;
}

export interface HeroMetaDailyStore {
  get(audience: HeroMetaAudience): Promise<HeroMetaDailySnapshot | null>;
  claimDaily(audience: HeroMetaAudience, runDate: string, now: Date, leaseUntil: Date): Promise<boolean>;
  saveReady(audience: HeroMetaAudience, patch: string, stats: HeroMetaStat[], fetchedAt: Date): Promise<void>;
  savePending(audience: HeroMetaAudience, patch: string | null, jobPath: string | null, nextPollAt: Date | null): Promise<void>;
  saveFailure(audience: HeroMetaAudience, message: string): Promise<void>;
}

export interface HeroMetaDailySource {
  getLatestMajorPatch(): Promise<string>;
  fetchStats(patch: string, audience: HeroMetaAudience): Promise<HeroMetaSourceResult>;
  pollJob(path: string): Promise<HeroMetaSourceResult>;
}

export interface HeroMetaRefreshResult {
  readonly audience: HeroMetaAudience;
  readonly status: "ready" | "pending" | "failed" | "already-ran";
  readonly patch: string;
  readonly rows: number;
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
  let jobPath = snapshot?.pendingPatch === patch ? snapshot.jobPath : null;
  let retriedExpiredJob = false;

  if (jobPath && snapshot?.nextPollAt && snapshot.nextPollAt.getTime() > Date.now()) {
    const delay = snapshot.nextPollAt.getTime() - Date.now();
    if (Date.now() + delay >= deadline) {
      await store.savePending(audience, patch, jobPath, snapshot.nextPollAt);
      return { audience, status: "pending", patch, rows: 0 };
    }
    await sleep(delay);
  }

  while (Date.now() < deadline) {
    try {
      const response = jobPath ? await source.pollJob(jobPath) : await source.fetchStats(patch, audience);
      if (response.kind === "ready") {
        const stats = parseHeroStats(response.raw);
        if (stats.length === 0) throw new Error("Heroes Profile 응답에 저장할 수 있는 영웅 통계가 없습니다.");
        await store.saveReady(audience, patch, stats, new Date());
        return { audience, status: "ready", patch, rows: stats.length };
      }

      jobPath = response.jobPath;
      const nextPollAt = new Date(Date.now() + retryAfterSeconds(response) * 1000);
      await store.savePending(audience, patch, jobPath, nextPollAt);
      const delay = nextPollAt.getTime() - Date.now();
      if (Date.now() + delay >= deadline) return { audience, status: "pending", patch, rows: 0 };
      await sleep(delay);
    } catch (error) {
      const status = statusOf(error);
      if (jobPath && !retriedExpiredJob && (status === 404 || status === 500)) {
        retriedExpiredJob = true;
        jobPath = null;
        await store.savePending(audience, null, null, null);
        continue;
      }
      await store.saveFailure(audience, errorMessage(error));
      return { audience, status: "failed", patch, rows: 0, error: errorMessage(error) };
    }
  }

  await store.savePending(audience, patch, jobPath, new Date(Date.now() + 10_000));
  return { audience, status: "pending", patch, rows: 0 };
}

export async function refreshHeroMetaDaily(deps: {
  readonly now: Date;
  readonly deadline: number;
  readonly store: HeroMetaDailyStore;
  readonly source: HeroMetaDailySource;
}): Promise<HeroMetaRefreshResult[]> {
  const patch = await deps.source.getLatestMajorPatch();
  return Promise.all(AUDIENCES.map((audience) => refreshAudience(audience, patch, deps)));
}
