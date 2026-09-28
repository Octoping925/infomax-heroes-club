import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getOptions: vi.fn(), load: vi.fn(), store: vi.fn() }));
vi.mock("@/config/heroes-profile", () => ({ getHeroMetaOptions: mocks.getOptions, HeroesProfileRequestError: class extends Error {} }));
vi.mock("@/config/prisma", () => ({ prisma: {} }));
vi.mock("@/domain/hots/repositories/hero-meta-options", () => ({ createHeroMetaOptionsStore: mocks.store }));
vi.mock("@/domain/hots/service/hero-meta-options", () => ({ loadHeroMetaOptions: mocks.load }));

import { GET } from "./route";

describe("GET /api/tier/options", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("explains the missing API key", async () => {
    vi.stubEnv("HEROES_PROFILE_API_KEY", "");
    mocks.load.mockRejectedValue(new Error("Heroes Profile API 키가 아직 설정되지 않았습니다."));
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).status).toBe("unconfigured");
  });

  it("returns patch and map choices with a configured key", async () => {
    vi.stubEnv("HEROES_PROFILE_API_KEY", "test-key");
    mocks.getOptions.mockResolvedValue({ patches: ["2.55"], maps: ["Alterac Pass"] });
    mocks.load.mockResolvedValue({ patches: ["2.55"], maps: ["Alterac Pass"] });
    mocks.store.mockReturnValue({});
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ patches: ["2.55"], maps: ["Alterac Pass"] });
  });
});
