import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hero, MatchType } from "@/generated/prisma/client";

const { mockFetchPlayerMap } = vi.hoisted(() => ({
  mockFetchPlayerMap: vi.fn(),
}));

vi.mock("@/app/api/stats/utils/player", () => ({
  fetchPlayerMap: mockFetchPlayerMap,
}));

import { fetchRivalries, normalizeFetchRivalriesParams } from "./rivalry-service";

function makeMatch(input: {
  readonly id: string;
  readonly playedAt: string;
  readonly winnerTeamNumber: number | null;
  readonly type?: MatchType;
  readonly aStats?: Partial<{
    hero: Hero;
    kills: number;
    deaths: number;
    takedowns: number;
    heroDamage: number;
  }>;
  readonly bStats?: Partial<{
    hero: Hero;
    kills: number;
    deaths: number;
    takedowns: number;
    heroDamage: number;
  }>;
}) {
  const type = input.type ?? MatchType.LUNCH;
  const a = {
    playerId: "a",
    hero: Hero.Ana,
    kills: 10,
    deaths: 2,
    takedowns: 12,
    heroDamage: 50000,
    ...input.aStats,
  };
  const b = {
    playerId: "b",
    hero: Hero.Jaina,
    kills: 5,
    deaths: 4,
    takedowns: 8,
    heroDamage: 30000,
    ...input.bStats,
  };

  return {
    id: input.id,
    playedAt: new Date(input.playedAt),
    type,
    winnerTeamNumber: input.winnerTeamNumber,
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
            members: [a],
          },
          {
            teamNumber: 2,
            members: [b],
          },
        ],
      },
    ],
  };
}

function createPrismaMock(matches: ReadonlyArray<ReturnType<typeof makeMatch>>) {
  return {
    match: {
      findMany: vi.fn().mockResolvedValue(matches),
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
}

function clamp01(v: number) {
  return Math.min(Math.max(v, 0), 1);
}

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

  it("선택 연도에 맞는 playedAt 필터를 Prisma 조회에 전달한다", async () => {
    const matches = [
      makeMatch({
        id: "m-2025",
        playedAt: "2025-12-30T15:00:00.000Z",
        winnerTeamNumber: 1,
      }),
      makeMatch({
        id: "m-2026",
        playedAt: "2026-02-10T00:00:00.000Z",
        winnerTeamNumber: 1,
      }),
    ];

    const prisma = {
      match: {
        findMany: vi.fn().mockImplementation(async (args?: { where?: { playedAt?: { gte: Date; lt: Date } } }) => {
          const playedAt = args?.where?.playedAt;
          if (!playedAt) {
            return matches;
          }

          return matches.filter(
            (match) => match.playedAt >= playedAt.gte && match.playedAt < playedAt.lt,
          );
        }),
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
      year: 2026,
    });

    expect(prisma.match.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          playedAt: {
            gte: new Date("2025-12-31T15:00:00.000Z"),
            lt: new Date("2026-12-31T15:00:00.000Z"),
          },
        },
      }),
    );
    expect(prisma.matchTeamMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          matchTeam: {
            match: {
              playedAt: {
                gte: new Date("2025-12-31T15:00:00.000Z"),
                lt: new Date("2026-12-31T15:00:00.000Z"),
              },
            },
          },
        },
      }),
    );
    expect(result.params.year).toBe(2026);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.lastPlayedAt).toBe("2026-02-10T00:00:00.000Z");
  });

  it("최근 5경기 보너스는 결정전적 3:2/2:3일 때만 반영된다", async () => {
    const prisma = createPrismaMock([
      makeMatch({
        id: "m1",
        playedAt: "2026-02-10T00:00:00.000Z",
        winnerTeamNumber: 1,
      }),
      makeMatch({
        id: "m2",
        playedAt: "2026-02-09T00:00:00.000Z",
        winnerTeamNumber: 2,
      }),
      makeMatch({
        id: "m3",
        playedAt: "2026-02-08T00:00:00.000Z",
        winnerTeamNumber: 1,
      }),
      makeMatch({
        id: "m4",
        playedAt: "2026-02-07T00:00:00.000Z",
        winnerTeamNumber: null,
      }),
      makeMatch({
        id: "m5",
        playedAt: "2026-02-06T00:00:00.000Z",
        winnerTeamNumber: null,
      }),
    ]);

    const result = await fetchRivalries(prisma as never, {
      minMatches: 1,
      limit: 10,
      takeMatches: 10,
      includeInsufficientSample: true,
    });

    const card = result.items[0];
    expect(card).toBeDefined();
    if (!card) return;

    const rawWithoutBonus = clamp01(
      0.3 * card.breakdown.countScore +
        0.3 * card.breakdown.balance +
        0.2 * card.breakdown.recency +
        0.2 * card.breakdown.performanceCloseness,
    );
    expect(card.breakdown.rawScore).toBeCloseTo(rawWithoutBonus, 2);
    expect(card.labels.some((l) => l.text === "최근 5경기 박빙")).toBe(false);
  });

  it("퍼포먼스 근접도는 계산 가능한 지표만으로 평균을 낸다", async () => {
    const prisma = createPrismaMock([
      makeMatch({
        id: "m1",
        playedAt: "2026-02-10T00:00:00.000Z",
        winnerTeamNumber: 1,
        aStats: {
          heroDamage: 0,
          takedowns: 10,
          deaths: 2,
        },
        bStats: {
          heroDamage: 0,
          takedowns: 8,
          deaths: 4,
        },
      }),
    ]);

    const result = await fetchRivalries(prisma as never, {
      minMatches: 1,
      limit: 10,
      takeMatches: 10,
      includeInsufficientSample: true,
    });

    expect(result.items[0]?.breakdown.performanceCloseness).toBeCloseTo(0.25, 3);
  });

  it("오래된 10경기는 개수가 많아도 최근성 점수가 낮아야 한다", async () => {
    const matches = Array.from({ length: 10 }, (_, idx) =>
      makeMatch({
        id: `m${idx + 1}`,
        playedAt: `2020-01-${String(10 - idx).padStart(2, "0")}T00:00:00.000Z`,
        winnerTeamNumber: idx % 2 === 0 ? 1 : 2,
      }),
    );
    const prisma = createPrismaMock(matches);

    const result = await fetchRivalries(prisma as never, {
      minMatches: 1,
      limit: 10,
      takeMatches: 10,
      includeInsufficientSample: true,
    });

    expect(result.items[0]?.breakdown.matchesCount).toBe(10);
    expect(result.items[0]?.breakdown.recency).toBeLessThan(0.1);
  });
});
