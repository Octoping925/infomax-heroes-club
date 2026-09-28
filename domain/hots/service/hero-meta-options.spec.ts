import { describe, expect, it, vi } from "vitest";
import { loadHeroMetaOptions, type HeroMetaOptionsStore } from "./hero-meta-options";

const now = new Date("2026-09-28T00:00:00.000Z");
const options = { patches: ["2.55"], maps: ["Alterac Pass"] };

describe("loadHeroMetaOptions", () => {
  it("uses a fresh persisted reference without making an upstream call", async () => {
    const store: HeroMetaOptionsStore = {
      get: vi.fn(async () => ({ options, fetchedAt: now })),
      save: vi.fn(async () => {}),
    };
    const fetchOptions = vi.fn();
    expect(await loadHeroMetaOptions({ store, fetchOptions, now })).toEqual(options);
    expect(fetchOptions).not.toHaveBeenCalled();
  });

  it("keeps stale reference choices available when refresh fails", async () => {
    const store: HeroMetaOptionsStore = {
      get: vi.fn(async () => ({ options, fetchedAt: new Date(now.getTime() - 86_400_001) })),
      save: vi.fn(async () => {}),
    };
    const fetchOptions = vi.fn(async () => { throw new Error("offline"); });
    expect(await loadHeroMetaOptions({ store, fetchOptions, now })).toEqual(options);
  });

  it("persists new reference choices after a successful refresh", async () => {
    const store: HeroMetaOptionsStore = {
      get: vi.fn(async () => null),
      save: vi.fn(async () => {}),
    };
    expect(await loadHeroMetaOptions({ store, fetchOptions: async () => options, now })).toEqual(options);
    expect(store.save).toHaveBeenCalledWith(options, now);
  });
});
