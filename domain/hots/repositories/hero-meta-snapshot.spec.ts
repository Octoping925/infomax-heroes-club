import { describe, expect, it, vi } from "vitest";
import { createHeroMetaDailyStore, createHeroMetaSnapshotStore } from "./hero-meta-snapshot";
import type { PrismaClient } from "@/generated/prisma/client";

describe("createHeroMetaSnapshotStore", () => {
  it("claims a refresh with a conditional database update", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const store = createHeroMetaSnapshotStore({ heroMetaSnapshot: {
      upsert: vi.fn(), updateMany, update: vi.fn(),
    } } as unknown as Pick<PrismaClient, "heroMetaSnapshot">);
    const now = new Date("2026-09-28T00:00:00.000Z");
    const leaseUntil = new Date(now.getTime() + 60_000);

    expect(await store.claim("key", now, leaseUntil, null)).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { key: "key", fetchedAt: null, AND: [
        { OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
        { OR: [{ nextPollAt: null }, { nextPollAt: { lte: now } }] },
      ] },
      data: { leaseUntil },
    });
  });

  it("reports a lost claim so another request does not call the API", async () => {
    const store = createHeroMetaSnapshotStore({ heroMetaSnapshot: {
      upsert: vi.fn(), updateMany: vi.fn(async () => ({ count: 0 })), update: vi.fn(),
    } } as unknown as Pick<PrismaClient, "heroMetaSnapshot">);
    const now = new Date("2026-09-28T00:00:00.000Z");
    expect(await store.claim("key", now, new Date(now.getTime() + 60_000), null)).toBe(false);
  });
});

describe("createHeroMetaDailyStore map snapshots", () => {
  it("stores map freshness independently from the overall patch fields", async () => {
    const update = vi.fn(async (args: unknown) => { void args; return {}; });
    const store = createHeroMetaDailyStore({ heroMetaSnapshot: {
      findUnique: vi.fn(), upsert: vi.fn(), updateMany: vi.fn(), update,
    } } as unknown as Pick<PrismaClient, "heroMetaSnapshot">);
    const fetchedAt = new Date("2026-09-28T00:00:00.000Z");

    await store.saveMapReady("all", "2.55", { SkyTemple: [] }, fetchedAt);

    expect(update).toHaveBeenCalledWith({
      where: { key: "all" },
      data: expect.objectContaining({ mapPatch: "2.55", mapFetchedAt: fetchedAt }),
    });
    const updateArgs = update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateArgs.data).not.toHaveProperty("patch");
  });
});
