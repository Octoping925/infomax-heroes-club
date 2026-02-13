import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameResult, MatchType } from "@/generated/prisma/client";

const { mockPrisma, mockFetchPlayerMap } = vi.hoisted(() => ({
  mockPrisma: {
    gameTeamMember: {
      findMany: vi.fn(),
    },
    matchTeamMember: {
      findMany: vi.fn(),
    },
  },
  mockFetchPlayerMap: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("./player", () => ({
  fetchPlayerMap: mockFetchPlayerMap,
}));

import { fetchPlayerLunchDinnerWinRate, parseLunchDinnerUnit } from "./lunch-dinner";

describe("lunch-dinner 유틸", () => {
  beforeEach(() => {
    mockPrisma.gameTeamMember.findMany.mockReset();
    mockPrisma.matchTeamMember.findMany.mockReset();
    mockFetchPlayerMap.mockReset();

    mockFetchPlayerMap.mockResolvedValue(
      new Map([
        ["p1", { id: "p1", name: "홍길동", nickname: "길동" }],
        ["p2", { id: "p2", name: "김철수", nickname: "철수" }],
      ]),
    );
  });

  it("parseLunchDinnerUnit은 match 외 입력을 game으로 처리한다", () => {
    expect(parseLunchDinnerUnit("match")).toBe("match");
    expect(parseLunchDinnerUnit("game")).toBe("game");
    expect(parseLunchDinnerUnit("other")).toBe("game");
    expect(parseLunchDinnerUnit(null)).toBe("game");
  });

  it("게임 단위 집계를 계산한다", async () => {
    mockPrisma.gameTeamMember.findMany.mockResolvedValue([
      {
        playerId: "p1",
        gameTeam: {
          result: GameResult.WIN,
          game: {
            match: {
              type: MatchType.LUNCH,
            },
          },
        },
      },
      {
        playerId: "p1",
        gameTeam: {
          result: GameResult.LOSE,
          game: {
            match: {
              type: MatchType.DINNER,
            },
          },
        },
      },
    ]);

    const result = await fetchPlayerLunchDinnerWinRate("game");

    expect(result).toHaveLength(1);
    expect(result[0]?.playerId).toBe("p1");
    expect(result[0]?.lunchStats.wins).toBe(1);
    expect(result[0]?.dinnerStats.losses).toBe(1);
  });

  it("매치 단위 집계를 계산한다", async () => {
    mockPrisma.matchTeamMember.findMany.mockResolvedValue([
      {
        playerId: "p1",
        matchTeam: {
          teamNumber: 1,
          match: {
            type: MatchType.LUNCH,
            winnerTeamNumber: 1,
          },
        },
      },
      {
        playerId: "p1",
        matchTeam: {
          teamNumber: 1,
          match: {
            type: MatchType.DINNER,
            winnerTeamNumber: 2,
          },
        },
      },
      {
        playerId: "unknown",
        matchTeam: {
          teamNumber: 1,
          match: {
            type: MatchType.DINNER,
            winnerTeamNumber: null,
          },
        },
      },
    ]);

    const result = await fetchPlayerLunchDinnerWinRate("match");

    expect(result).toHaveLength(1);
    expect(result[0]?.lunchStats.wins).toBe(1);
    expect(result[0]?.dinnerStats.losses).toBe(1);
    expect(result[0]?.absWinRateDiff).toBeGreaterThan(0);
  });
});
