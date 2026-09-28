import { describe, expect, it, vi } from "vitest";
import { createHeroMetaSnapshotStore } from "./hero-meta-snapshot";
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
