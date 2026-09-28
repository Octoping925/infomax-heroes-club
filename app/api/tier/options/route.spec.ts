import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getOptions: vi.fn() }));
vi.mock("@/config/heroes-profile", () => ({ getHeroMetaOptions: mocks.getOptions }));

import { GET } from "./route";

describe("GET /api/tier/options", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("explains the missing API key", async () => {
    vi.stubEnv("HEROES_PROFILE_API_KEY", "");
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).status).toBe("unconfigured");
  });

  it("returns patch and map choices with a configured key", async () => {
    vi.stubEnv("HEROES_PROFILE_API_KEY", "test-key");
    mocks.getOptions.mockResolvedValue({ patches: ["2.55"], maps: ["Alterac Pass"] });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ patches: ["2.55"], maps: ["Alterac Pass"] });
  });
});
