import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { createHeroMetaOptionsStore } from "./hero-meta-options";

describe("createHeroMetaOptionsStore", () => {
  it("reads and upserts the singleton option snapshot", async () => {
    const fetchedAt = new Date("2026-09-28T00:00:00.000Z");
    const findUnique = vi.fn(async () => ({ key: "default", options: { patches: ["2.55"], maps: ["Alterac Pass"] }, fetchedAt }));
    const upsert = vi.fn(async () => ({}));
    const store = createHeroMetaOptionsStore({ heroMetaReference: { findUnique, upsert } } as unknown as Pick<PrismaClient, "heroMetaReference">);

    expect(await store.get()).toEqual({ options: { patches: ["2.55"], maps: ["Alterac Pass"] }, fetchedAt });
    await store.save({ patches: ["2.56"], maps: ["Cursed Hollow"] }, fetchedAt);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { key: "default" } }));
  });
});
