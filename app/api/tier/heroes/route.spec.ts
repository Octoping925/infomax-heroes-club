import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getOptions: vi.fn(),
  load: vi.fn(),
  source: vi.fn(),
  store: vi.fn(),
  optionsStore: vi.fn(),
  loadOptions: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ prisma: {} }));
vi.mock("@/config/heroes-profile", () => ({
  getHeroMetaOptions: mocks.getOptions,
  heroesProfileSource: mocks.source,
  HeroesProfileRequestError: class extends Error {},
}));
vi.mock("@/domain/hots/repositories/hero-meta-snapshot", () => ({ createHeroMetaSnapshotStore: mocks.store }));
vi.mock("@/domain/hots/repositories/hero-meta-options", () => ({ createHeroMetaOptionsStore: mocks.optionsStore }));
vi.mock("@/domain/hots/service/hero-meta-options", () => ({ loadHeroMetaOptions: mocks.loadOptions }));
vi.mock("@/domain/hots/service/hero-meta-loader", () => ({ loadHeroMeta: mocks.load }));

import { GET } from "./route";

describe("GET /api/tier/heroes", () => {
  beforeEach(() => {
    vi.stubEnv("HEROES_PROFILE_API_KEY", "test-key");
    mocks.getOptions.mockReset().mockResolvedValue({ patches: ["2.55"], maps: ["Alterac Pass"] });
    mocks.loadOptions.mockReset().mockResolvedValue({ patches: ["2.55"], maps: ["Alterac Pass"] });
    mocks.load.mockReset().mockResolvedValue({ status: "ready", rows: [], updatedAt: "2026-09-28T00:00:00.000Z", retryAfterSeconds: null });
    mocks.source.mockReset().mockReturnValue({});
    mocks.store.mockReset().mockReturnValue({});
    mocks.optionsStore.mockReset().mockReturnValue({ get: vi.fn().mockResolvedValue({ options: { patches: ["2.55"], maps: ["Alterac Pass"] } }) });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("reports missing configuration without calling Heroes Profile", async () => {
    vi.stubEnv("HEROES_PROFILE_API_KEY", "");
    mocks.optionsStore.mockReturnValue({ get: vi.fn().mockResolvedValue(null) });
    const response = await GET(new NextRequest("http://localhost/api/tier/heroes"));
    expect(response.status).toBe(503);
    expect((await response.json()).status).toBe("unconfigured");
    expect(mocks.getOptions).not.toHaveBeenCalled();
  });

  it("serves the last saved stats while the key is absent", async () => {
    vi.stubEnv("HEROES_PROFILE_API_KEY", "");
    mocks.load.mockResolvedValue({ status: "stale", rows: [{ hero: "Ana" }], updatedAt: "2026-09-27T00:00:00.000Z", retryAfterSeconds: 300 });
    const response = await GET(new NextRequest("http://localhost/api/tier/heroes"));
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("stale");
    expect(mocks.source).not.toHaveBeenCalled();
  });

  it("rejects invalid filters before loading statistics", async () => {
    const response = await GET(new NextRequest("http://localhost/api/tier/heroes?map=Wrong"));
    expect(response.status).toBe(400);
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it("rejects invalid fixed filters before requesting reference options", async () => {
    const response = await GET(new NextRequest("http://localhost/api/tier/heroes?mode=invalid"));
    expect(response.status).toBe(400);
    expect(mocks.loadOptions).not.toHaveBeenCalled();
  });

  it("does not request reference options from Heroes Profile when the local snapshot is cold", async () => {
    mocks.optionsStore.mockReturnValue({ get: vi.fn().mockResolvedValue(null) });
    const response = await GET(new NextRequest("http://localhost/api/tier/heroes"));
    expect(response.status).toBe(503);
    expect(mocks.getOptions).not.toHaveBeenCalled();
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it("uses map and league tier together for a valid request", async () => {
    const response = await GET(new NextRequest("http://localhost/api/tier/heroes?map=Alterac+Pass&leagueTier=5"));
    expect(response.status).toBe(200);
    expect(mocks.load).toHaveBeenCalledWith(
      { mode: "sl", region: "ALL", patch: "2.55", map: "Alterac Pass", leagueTier: "5" },
      expect.objectContaining({ store: {}, source: {}, now: expect.any(Date) }),
    );
  });
});
