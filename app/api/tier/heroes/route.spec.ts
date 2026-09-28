import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getOptions: vi.fn(),
  load: vi.fn(),
  source: vi.fn(),
  store: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ prisma: {} }));
vi.mock("@/config/heroes-profile", () => ({ getHeroMetaOptions: mocks.getOptions, heroesProfileSource: mocks.source }));
vi.mock("@/domain/hots/repositories/hero-meta-snapshot", () => ({ createHeroMetaSnapshotStore: mocks.store }));
vi.mock("@/domain/hots/service/hero-meta-loader", () => ({ loadHeroMeta: mocks.load }));

import { GET } from "./route";

describe("GET /api/tier/heroes", () => {
  beforeEach(() => {
    vi.stubEnv("HEROES_PROFILE_API_KEY", "test-key");
    mocks.getOptions.mockReset().mockResolvedValue({ patches: ["2.55"], maps: ["Alterac Pass"] });
    mocks.load.mockReset().mockResolvedValue({ status: "ready", rows: [], updatedAt: "2026-09-28T00:00:00.000Z", retryAfterSeconds: null });
    mocks.source.mockReset().mockReturnValue({});
    mocks.store.mockReset().mockReturnValue({});
  });
  afterEach(() => vi.unstubAllEnvs());

  it("reports missing configuration without calling Heroes Profile", async () => {
    vi.stubEnv("HEROES_PROFILE_API_KEY", "");
    const response = await GET(new NextRequest("http://localhost/api/tier/heroes"));
    expect(response.status).toBe(503);
    expect((await response.json()).status).toBe("unconfigured");
    expect(mocks.getOptions).not.toHaveBeenCalled();
  });

  it("rejects invalid filters before loading statistics", async () => {
    const response = await GET(new NextRequest("http://localhost/api/tier/heroes?map=Wrong"));
    expect(response.status).toBe(400);
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
