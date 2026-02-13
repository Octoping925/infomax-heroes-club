import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameResult } from "@/generated/prisma/client";

const { mockPrisma, mockParseGameStats } = vi.hoisted(() => ({
  mockPrisma: {
    player: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mockParseGameStats: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/domain/hots/utils/game-stats-parser", () => ({
  parseGameStats: mockParseGameStats,
}));

import { createMatch } from "./create";
import { MatchServiceError } from "./errors";

function createRequest() {
  return {
    playedAt: "20260210",
    type: "LUNCH" as const,
    team1Leader: "리더1",
    team2Leader: "리더2",
    games: [
      {
        statsText: "dummy",
        winnerTeamNumber: 1,
      },
    ],
  };
}

function createParsedGame() {
  return {
    map: "BattlefieldOfEternity",
    teams: [
      {
        teamNumber: 1,
        players: [
          {
            nickname: "리더1",
            hero: "Ana",
            kills: 1,
            deaths: 1,
            takedowns: 2,
            heroDamage: 100,
            damageTaken: 50,
          },
        ],
      },
      {
        teamNumber: 2,
        players: [
          {
            nickname: "리더2",
            hero: "Jaina",
            kills: 2,
            deaths: 2,
            takedowns: 3,
            heroDamage: 200,
            damageTaken: 80,
          },
        ],
      },
    ],
  };
}

describe("createMatch", () => {
  beforeEach(() => {
    mockPrisma.player.findMany.mockReset();
    mockPrisma.$transaction.mockReset();
    mockParseGameStats.mockReset();
  });

  it("날짜 형식이 잘못되면 예외를 던진다", async () => {
    await expect(
      createMatch({
        ...createRequest(),
        playedAt: "잘못된날짜",
      }),
    ).rejects.toBeInstanceOf(MatchServiceError);
  });

  it("게임 목록이 비어 있으면 예외를 던진다", async () => {
    await expect(
      createMatch({
        ...createRequest(),
        games: [],
      }),
    ).rejects.toThrowError("최소 1개 이상의 게임이 필요합니다.");
  });

  it("스탯 파싱 실패를 MatchServiceError로 감싼다", async () => {
    mockParseGameStats.mockImplementation(() => {
      throw new Error("파싱 실패");
    });

    await expect(createMatch(createRequest())).rejects.toThrowError("게임 스탯 파싱 실패: 파싱 실패");
  });

  it("등록되지 않은 플레이어가 있으면 예외를 던진다", async () => {
    mockParseGameStats.mockReturnValue(createParsedGame());
    mockPrisma.player.findMany.mockResolvedValue([{ id: "p1", nickname: "리더1" }]);

    await expect(createMatch(createRequest())).rejects.toThrowError("등록되지 않은 플레이어: 리더2");
  });

  it("리더가 매핑되지 않으면 예외를 던진다", async () => {
    mockParseGameStats.mockReturnValue(createParsedGame());
    mockPrisma.player.findMany.mockResolvedValue([
      { id: "p1", nickname: "리더1" },
      { id: "p2", nickname: "리더2" },
    ]);

    await expect(
      createMatch({
        ...createRequest(),
        team1Leader: "없는리더",
      }),
    ).rejects.toThrowError("등록되지 않은 리더");
  });

  it("정상 요청이면 트랜잭션으로 매치와 게임을 생성한다", async () => {
    mockParseGameStats.mockReturnValue(createParsedGame());
    mockPrisma.player.findMany.mockResolvedValue([
      { id: "p1", nickname: "리더1" },
      { id: "p2", nickname: "리더2" },
    ]);

    const tx = {
      match: {
        create: vi.fn().mockResolvedValue({ id: "m1" }),
      },
      matchTeam: {
        createManyAndReturn: vi.fn().mockResolvedValue([{ id: "mt1" }, { id: "mt2" }]),
      },
      matchTeamMember: {
        createMany: vi.fn().mockResolvedValue(undefined),
      },
      game: {
        create: vi.fn().mockResolvedValue({ id: "g1" }),
      },
      gameTeam: {
        create: vi
          .fn()
          .mockResolvedValueOnce({ id: "gt1" })
          .mockResolvedValueOnce({ id: "gt2" }),
      },
      gameTeamMember: {
        createMany: vi.fn().mockResolvedValue(undefined),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (callback: (value: typeof tx) => Promise<unknown>) => {
      return callback(tx);
    });

    const result = await createMatch(createRequest());

    expect(result).toEqual({ matchId: "m1", gamesCreated: 1 });
    expect(tx.match.create).toHaveBeenCalledTimes(1);
    expect(tx.gameTeam.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: expect.objectContaining({ result: GameResult.WIN }) }),
    );
    expect(tx.gameTeam.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: expect.objectContaining({ result: GameResult.LOSE }) }),
    );
  });
});
