import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("@/config/prisma", () => ({ prisma: {} }));
vi.mock("@/config/heroes-profile", () => ({ heroesProfileDailySource: () => ({}) }));
vi.mock("@/domain/hots/repositories/hero-meta-snapshot", () => ({ createHeroMetaDailyStore: () => ({}) }));
vi.mock("@/domain/hots/service/hero-meta-daily-refresh", () => ({ refreshHeroMetaDaily: refresh }));

import { GET } from "./route";
import { GET as GET_PLATINUM_PLUS } from "./platinum-plus/route";

describe("GET /api/cron/hero-meta by audience", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.stubEnv("HEROES_PROFILE_API_KEY", "test-api-key");
    refresh.mockReset();
    refresh.mockResolvedValue([{ audience: "all", status: "ready", patch: "2.55.17", rows: 90 }]);
  });

  it("collects only all in the original cron", async () => {
    const response = await GET(new NextRequest("http://localhost/api/cron/hero-meta", {
      headers: { authorization: "Bearer test-cron-secret" },
    }));

    expect(response.status).toBe(200);
    expect(refresh).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledWith(expect.objectContaining({ audience: "all" }));
  });

  it("collects only platinum-plus in its separate cron", async () => {
    const response = await GET_PLATINUM_PLUS(new NextRequest("http://localhost/api/cron/hero-meta/platinum-plus", {
      headers: { authorization: "Bearer test-cron-secret" },
    }));

    expect(response.status).toBe(200);
    expect(refresh).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledWith(expect.objectContaining({ audience: "platinum_plus" }));
  });
});
