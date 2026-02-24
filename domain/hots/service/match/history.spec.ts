import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockFetchPlayerMap } = vi.hoisted(() => ({
  mockPrisma: {
    match: {
      findMany: vi.fn(),
    },
  },
  mockFetchPlayerMap: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/app/api/stats/utils/player", () => ({
  fetchPlayerMap: mockFetchPlayerMap,
}));

import { getMatchHistory } from "./history";

describe("getMatchHistory", () => {
  beforeEach(() => {
    mockPrisma.match.findMany.mockReset();
    mockFetchPlayerMap.mockReset();
  });

  it("매치 히스토리를 응답 스키마로 변환한다", async () => {
    mockFetchPlayerMap.mockResolvedValue(
      new Map([
        ["p1", { id: "p1", name: "홍길동", nickname: "길동" }],
        ["p2", { id: "p2", name: "김철수", nickname: "철수" }],
      ]),
    );

    mockPrisma.match.findMany.mockResolvedValue([
      {
        id: "m1",
        playedAt: new Date("2026-02-10T00:00:00.000Z"),
        type: "LUNCH",
        winnerTeamNumber: 1,
        youtubeUrl: "https://www.youtube.com/watch?v=abcDEF12345",
        highlights: [
          {
            id: "h1",
            seconds: 84,
            note: "한타",
            createdAt: new Date("2026-02-10T00:10:00.000Z"),
          },
        ],
        teams: [
          {
            id: "mt1",
            teamNumber: 1,
            leaderId: "p1",
            members: [{ playerId: "p1" }],
          },
          {
            id: "mt2",
            teamNumber: 2,
            leaderId: "p2",
            members: [{ playerId: "p2" }],
          },
        ],
        games: [
          {
            id: "g1",
            gameNumber: 1,
            gameLength: 1000,
            map: "BattlefieldOfEternity",
            winnerTeamNumber: 1,
            teams: [
              {
                id: "gt1",
                teamNumber: 1,
                result: "WIN",
                teamLevel: 20,
                bans: [{ banOrder: 1, hero: "Ana" }],
                members: [
                  {
                    id: "gm1",
                    playerId: "p1",
                    position: "MAIN_DEALER",
                    hero: "Ana",
                    kills: 10,
                    deaths: 1,
                    takedowns: 12,
                    heroDamage: 50000,
                    siegeDamage: 10000,
                    healingDone: 0,
                    experienceContribution: 12000,
                    damageTaken: 8000,
                    timeCCdEnemyHeroes: 30,
                    timeSpentDead: 5,
                    mercCampCaptures: 0,
                    watchTowerCaptures: 1,
                  },
                ],
              },
              {
                id: "gt2",
                teamNumber: 2,
                result: "LOSE",
                teamLevel: 18,
                bans: [{ banOrder: 1, hero: "Jaina" }],
                members: [
                  {
                    id: "gm2",
                    playerId: "p2",
                    position: "HEALER",
                    hero: "Jaina",
                    kills: 2,
                    deaths: 6,
                    takedowns: 5,
                    heroDamage: 20000,
                    siegeDamage: 3000,
                    healingDone: 10000,
                    experienceContribution: 8000,
                    damageTaken: 12000,
                    timeCCdEnemyHeroes: 10,
                    timeSpentDead: 20,
                    mercCampCaptures: 0,
                    watchTowerCaptures: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);

    const result = await getMatchHistory(10);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("m1");
    expect(result[0]?.youtubeUrl).toBe("https://www.youtube.com/watch?v=abcDEF12345");
    expect(result[0]?.highlights).toEqual([
      {
        id: "h1",
        seconds: 84,
        note: "한타",
        createdAt: "2026-02-10T00:10:00.000Z",
      },
    ]);
    expect(result[0]?.teams[0]?.leader.nickname).toBe("길동");
    expect(result[0]?.games[0]?.teams[0]?.members[0]?.player.nickname).toBe("길동");
    expect(result[0]?.games[0]?.teams[0]?.members[0]?.rank).toBeGreaterThan(0);
  });
});
