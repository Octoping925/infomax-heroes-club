import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    player: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/config/prisma", () => ({ prisma: mockPrisma }));

import { createMatchesFromJson } from "./create-from-json";

const PLAYERS = Array.from({ length: 10 }, (_, index) => ({ id: `p${index + 1}`, nickname: `n${index + 1}` }));

function request(withTalent = false, withBan = false) {
  const player = (index: number) => ({
    name: `n${index}`,
    hero: index % 2 === 0 ? "아나" : "제이나",
    position: index % 2 === 0 ? "HEALER" : "SUB_DEALER",
    talents: withTalent && index === 1 ? ["talent-code"] : [],
    kills: 1,
    deaths: 1,
    takedowns: 2,
    heroDamage: 100,
    damageTaken: 50,
  });
  return {
    team1LeaderId: "p1",
    team2LeaderId: "p6",
    data: {
      "20260805": [
        {
          date: "20260805",
          idx: 1,
          gameLength: 900,
          map: "영원의 전쟁터",
          team1: { win: true, level: 20, players: [1, 2, 3, 4, 5].map(player), bans: withBan ? ["아나"] : [] },
          team2: { win: false, level: 19, players: [6, 7, 8, 9, 10].map(player), bans: [] },
        },
      ],
    },
  };
}

function transactionMock(talentError?: Error, banError?: Error) {
  let gameTeam = 0;
  const tx = {
    match: { create: vi.fn().mockResolvedValue({ id: "m1" }) },
    matchTeam: { createManyAndReturn: vi.fn().mockResolvedValue([{ id: "mt1", teamNumber: 1 }, { id: "mt2", teamNumber: 2 }]) },
    matchTeamMember: { createMany: vi.fn().mockResolvedValue({ count: 10 }) },
    game: { create: vi.fn().mockResolvedValue({ id: "g1" }) },
    gameTeam: { create: vi.fn().mockImplementation(async () => ({ id: `gt${++gameTeam}` })) },
    gameTeamMember: {
      createManyAndReturn: vi.fn().mockImplementation(async ({ data }) =>
        data.map((row: { playerId: string }) => ({ id: `member-${row.playerId}`, playerId: row.playerId })),
      ),
    },
    gameTeamMemberTalent: { createMany: talentError ? vi.fn().mockRejectedValue(talentError) : vi.fn() },
    gameTeamBan: { createMany: banError ? vi.fn().mockRejectedValue(banError) : vi.fn() },
  };
  mockPrisma.$transaction.mockImplementation(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx));
  return tx;
}

describe("createMatchesFromJson", () => {
  beforeEach(() => {
    mockPrisma.player.findMany.mockReset();
    mockPrisma.$transaction.mockReset();
    mockPrisma.player.findMany
      .mockResolvedValueOnce([{ id: "p1" }, { id: "p6" }])
      .mockResolvedValueOnce(PLAYERS);
  });

  it("keeps the manual JSON fallback on the shared writer with a null replay hash", async () => {
    const tx = transactionMock();
    await expect(createMatchesFromJson(request())).resolves.toEqual({ matchesCreated: 1, gamesCreated: 1, matchIds: ["m1"] });
    expect(tx.match.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ replayImportFingerprint: null }),
    }));
    expect(tx.game.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sourceReplayHash: null }) }));
  });

  it("contains a talent failure inside the one match transaction", async () => {
    transactionMock(new Error("talent insert failed"));
    await expect(createMatchesFromJson(request(true))).rejects.toThrow("talent insert failed");
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("contains a ban failure inside the one match transaction", async () => {
    transactionMock(undefined, new Error("ban insert failed"));
    await expect(createMatchesFromJson(request(false, true))).rejects.toThrow("ban insert failed");
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
