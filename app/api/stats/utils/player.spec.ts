import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    player: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/config/prisma", () => ({
  prisma: mockPrisma,
}));

import { fetchPlayerMap } from "./player";

describe("fetchPlayerMap", () => {
  beforeEach(() => {
    mockPrisma.player.findMany.mockReset();
  });

  it("플레이어 목록을 id 기반 Map으로 반환한다", async () => {
    mockPrisma.player.findMany.mockResolvedValue([
      { id: "p1", name: "홍길동", nickname: "길동" },
      { id: "p2", name: "김철수", nickname: "철수" },
    ]);

    const result = await fetchPlayerMap();

    expect(result.get("p1")).toEqual({ id: "p1", name: "홍길동", nickname: "길동" });
    expect(result.get("p2")).toEqual({ id: "p2", name: "김철수", nickname: "철수" });
    expect(result.size).toBe(2);
  });
});
