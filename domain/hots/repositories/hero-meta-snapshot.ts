import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { HeroMetaSnapshotStore } from "../service/hero-meta-loader";
import type { HeroMetaDailySnapshot, HeroMetaDailyStore } from "../service/hero-meta-daily-refresh";
import type { HeroMetaAudience } from "../service/hero-meta-filters";
import type { HeroMetaStat } from "../service/hero-meta-tier";
import { HERO_CATALOG } from "../constants";

function readStats(raw: unknown): HeroMetaStat[] | null {
  if (raw === null) return null;
  if (!Array.isArray(raw)) throw new Error("저장된 영웅 통계가 손상되었습니다.");
  return raw.map((value) => {
    if (typeof value !== "object" || value === null) throw new Error("저장된 영웅 통계가 손상되었습니다.");
    const row = value as Record<string, unknown>;
    if (typeof row.hero !== "string" || !(row.hero in HERO_CATALOG) ||
      ![row.games, row.wins, row.losses, row.winRate, row.pickRate].every((number) => typeof number === "number" && Number.isFinite(number)) ||
      (row.banRate !== null && (typeof row.banRate !== "number" || !Number.isFinite(row.banRate)))) {
      throw new Error("저장된 영웅 통계가 손상되었습니다.");
    }
    return row as unknown as HeroMetaStat;
  });
}

export function createHeroMetaSnapshotStore(client: Pick<PrismaClient, "heroMetaSnapshot">): HeroMetaSnapshotStore {
  const model = client.heroMetaSnapshot;
  return {
    async getOrCreate(key) {
      const row = await model.upsert({ where: { key }, create: { key }, update: {} });
      return {
        stats: readStats(row.stats),
        fetchedAt: row.fetchedAt,
        jobPath: row.jobPath,
        nextPollAt: row.nextPollAt,
        leaseUntil: row.leaseUntil,
      };
    },
    async claim(key, now, leaseUntil, expectedFetchedAt) {
      const result = await model.updateMany({
        where: { key, fetchedAt: expectedFetchedAt, AND: [
          { OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
          { OR: [{ nextPollAt: null }, { nextPollAt: { lte: now } }] },
        ] },
        data: { leaseUntil },
      });
      return result.count === 1;
    },
    async saveReady(key, stats, fetchedAt) {
      await model.update({
        where: { key },
        data: { stats: stats as unknown as Prisma.InputJsonValue, fetchedAt, jobPath: null, nextPollAt: null, leaseUntil: null },
      });
    },
    async savePending(key, jobPath, nextPollAt) {
      await model.update({ where: { key }, data: { jobPath, nextPollAt, leaseUntil: null } });
    },
    async saveError(key, nextRetryAt) {
      await model.update({ where: { key }, data: { jobPath: null, nextPollAt: nextRetryAt, leaseUntil: null } });
    },
  };
}

export function createHeroMetaDailyStore(client: Pick<PrismaClient, "heroMetaSnapshot">): HeroMetaDailyStore {
  const model = client.heroMetaSnapshot;
  return {
    async get(audience): Promise<HeroMetaDailySnapshot | null> {
      const row = await model.findUnique({ where: { key: audience } });
      if (!row) return null;
      return {
        stats: readStats(row.stats),
        patch: row.patch,
        fetchedAt: row.fetchedAt,
        jobPath: row.jobPath,
        pendingPatch: row.pendingPatch,
        nextPollAt: row.nextPollAt,
      };
    },
    async claimDaily(audience: HeroMetaAudience, runDate: string, now: Date, leaseUntil: Date) {
      await model.upsert({ where: { key: audience }, create: { key: audience }, update: {} });
      const result = await model.updateMany({
        where: {
          key: audience,
          AND: [
            { OR: [{ lastRunDate: null }, { lastRunDate: { lt: runDate } }] },
            { OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
          ],
        },
        data: { lastRunDate: runDate, leaseUntil },
      });
      return result.count === 1;
    },
    async saveReady(audience, patch, stats, fetchedAt) {
      await model.update({
        where: { key: audience },
        data: {
          stats: stats as unknown as Prisma.InputJsonValue,
          patch,
          fetchedAt,
          jobPath: null,
          pendingPatch: null,
          nextPollAt: null,
          leaseUntil: null,
          lastError: null,
        },
      });
    },
    async savePending(audience, patch, jobPath, nextPollAt) {
      await model.update({
        where: { key: audience },
        data: { pendingPatch: patch, jobPath, nextPollAt, leaseUntil: null },
      });
    },
    async saveFailure(audience, message) {
      await model.update({
        where: { key: audience },
        data: { lastError: message, leaseUntil: null },
      });
    },
  };
}
