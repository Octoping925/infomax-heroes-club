import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hero, MatchType } from "@/generated/prisma/client";

const { mockFetchPlayerMap } = vi.hoisted(() => ({
  mockFetchPlayerMap: vi.fn(),
}));

vi.mock("@/app/api/stats/utils/player", () => ({
  fetchPlayerMap: mockFetchPlayerMap,
}));

import { fetchRivalries, normalizeFetchRivalriesParams } from "./rivalry-service";

describe("normalizeFetchRivalriesParams", () => {
  it("파라미터를 허용 범위로 보정한다", () => {
    const result = normalizeFetchRivalriesParams({
      minMatches: -1,
      limit: 999,
      takeMatches: 99999,
    });

    expect(result).toEqual({
      minMatches: 1,
      limit: 200,
      takeMatches: 2000,
      includeInsufficientSample: false,
    });
  });
});

describe("fetchRivalries", () => {
  beforeEach(() => {
    mockFetchPlayerMap.mockReset();
    mockFetchPlayerMap.mockResolvedValue(
      new Map([
        ["a", { id: "a", name: "홍길동", nickname: "길동" }],
        ["b", { id: "b", name: "김철수", nickname: "철수" }],
      ]),
    );
  });

  it("데이터가 없으면 빈 결과를 반환한다", async () => {
    const prisma = {
      match: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      matchTeamMember: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const result = await fetchRivalries(prisma as never, {
      minMatches: 1,
      limit: 10,
      takeMatches: 10,
      includeInsufficientSample: true,
    });

    expect(result.items).toEqual([]);
    expect(result.hottest).toBeNull();
  });

  it("맞대결 데이터를 라이벌리 카드로 변환한다", async () => {
    const prisma = {
      match: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "m1",
            playedAt: new Date("2026-02-10T00:00:00.000Z"),
            type: MatchType.LUNCH,
            winnerTeamNumber: 1,
            teams: [
              {
                teamNumber: 1,
                members: [{ playerId: "a" }],
              },
              {
                teamNumber: 2,
                members: [{ playerId: "b" }],
              },
            ],
            games: [
              {
                teams: [
                  {
                    teamNumber: 1,
                    members: [
                      {
                        playerId: "a",
                        hero: Hero.Ana,
                        kills: 10,
                        deaths: 2,
                        takedowns: 12,
                        heroDamage: 50000,
                      },
                    ],
                  },
                  {
                    teamNumber: 2,
                    members: [
                      {
                        playerId: "b",
                        hero: Hero.Jaina,
                        kills: 5,
                        deaths: 4,
                        takedowns: 8,
                        heroDamage: 30000,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]),
      },
      matchTeamMember: {
        findMany: vi.fn().mockResolvedValue([
          {
            playerId: "a",
            matchTeam: {
              teamNumber: 1,
              match: {
                winnerTeamNumber: 1,
              },
            },
          },
          {
            playerId: "b",
            matchTeam: {
              teamNumber: 2,
              match: {
                winnerTeamNumber: 1,
              },
            },
          },
        ]),
      },
    };

    const result = await fetchRivalries(prisma as never, {
      minMatches: 1,
      limit: 10,
      takeMatches: 10,
      includeInsufficientSample: true,
    });

    expect(result.items).toHaveLength(1);
    expect(result.hottest?.id).toBe("a:b");
    expect(result.items[0]?.playerA.playerId).toBe("a");
    expect(result.items[0]?.playerB.playerId).toBe("b");
    expect(result.items[0]?.breakdown.matchesCount).toBe(1);
  });
});
