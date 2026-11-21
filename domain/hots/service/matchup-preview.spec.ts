import { describe, expect, it, vi } from "vitest";
import { buildMatchupPreview, MatchupPreviewError } from "./matchup-preview";
import type { PrismaClient } from "@/generated/prisma/client";

function createMockPrisma(input: {
  players: Array<{ id: string; name: string; nickname: string }>;
  gameRows?: Array<unknown>;
  matches?: Array<unknown>;
}) {
  return {
    player: {
      findMany: vi.fn().mockResolvedValue(input.players),
    },
    gameTeamMember: {
      findMany: vi.fn().mockResolvedValue(input.gameRows ?? []),
    },
    match: {
      findMany: vi.fn().mockResolvedValue(input.matches ?? []),
    },
  } as unknown as PrismaClient;
}

describe("buildMatchupPreview", () => {
  it("rejects overlapping players between Team A and Team B", async () => {
    const prisma = createMockPrisma({ players: [] });
    await expect(
      buildMatchupPreview(prisma, {
        teamANicknames: ["alpha", "beta"],
        teamBNicknames: ["beta", "gamma"],
      }),
    ).rejects.toThrowError(MatchupPreviewError);
  });

  it("computes win probability, storylines, rivalries, duo synergy, and leader stats", async () => {
    const players = [
      { id: "p1", name: "김알파", nickname: "alpha" },
      { id: "p2", name: "이베타", nickname: "beta" },
      { id: "p3", name: "박감마", nickname: "gamma" },
      { id: "p4", name: "최델타", nickname: "delta" },
    ];

    const playedAt = new Date("2026-10-01T03:00:00.000Z");

    const gameRows = [
      // p1 wins 4 LUNCH games as Johanna
      ...Array.from({ length: 4 }, () => ({
        playerId: "p1",
        hero: "Johanna",
        position: "TANKER",
        gameTeam: { result: "WIN", game: { match: { type: "LUNCH", playedAt } } },
      })),
      // p2 wins 3 LUNCH games as Rehgar
      ...Array.from({ length: 3 }, () => ({
        playerId: "p2",
        hero: "Rehgar",
        position: "HEALER",
        gameTeam: { result: "WIN", game: { match: { type: "LUNCH", playedAt } } },
      })),
      // p3 loses 3 LUNCH games as Valla
      ...Array.from({ length: 3 }, () => ({
        playerId: "p3",
        hero: "Valla",
        position: "MAIN_DEALER",
        gameTeam: { result: "LOSE", game: { match: { type: "LUNCH", playedAt } } },
      })),
      // p4 loses 3 LUNCH games as Diablo
      ...Array.from({ length: 3 }, () => ({
        playerId: "p4",
        hero: "Diablo",
        position: "TANKER",
        gameTeam: { result: "LOSE", game: { match: { type: "LUNCH", playedAt } } },
      })),
    ];

    // 4 matches where (p1, p2) beat (p3, p4) 3 times and lost 1 time, with p1 leading team 1
    const matches = [1, 1, 1, 2].map((winnerTeamNumber, index) => ({
      id: `m-${index}`,
      type: "LUNCH",
      playedAt,
      winnerTeamNumber,
      teams: [
        {
          teamNumber: 1,
          leaderId: "p1",
          members: [{ playerId: "p1" }, { playerId: "p2" }],
        },
        {
          teamNumber: 2,
          leaderId: "p3",
          members: [{ playerId: "p3" }, { playerId: "p4" }],
        },
      ],
    }));

    const prisma = createMockPrisma({ players, gameRows, matches });

    const preview = await buildMatchupPreview(prisma, {
      teamANicknames: ["alpha", "beta"],
      teamBNicknames: ["gamma", "delta"],
      matchType: "LUNCH",
      leaderANickname: "alpha",
      leaderBNickname: "gamma",
    });

    expect(preview.probability.teamA).toBeGreaterThan(50);
    expect(preview.probability.teamA + preview.probability.teamB).toBeCloseTo(100, 1);
    expect(preview.enteredRosterStats).toMatchObject({
      totalGames: 4,
      wins: 3,
      losses: 1,
      winRate: 75,
    });
    expect(preview.teamA.bestDuo).toMatchObject({
      playerA: "alpha",
      playerB: "beta",
      winRate: 75,
    });
    expect(preview.teamB.jinxDuo).toMatchObject({
      playerA: "gamma",
      playerB: "delta",
      winRate: 25,
    });
    expect(preview.teamA.leaderStat).toMatchObject({
      nickname: "alpha",
      matchesAsLeader: 4,
      wins: 3,
      winRate: 75,
    });
    expect(preview.storylines.some((story) => story.kind === "REMATCH")).toBe(true);
    expect(preview.storylines.some((story) => story.kind === "RIVALRY")).toBe(true);
    expect(preview.storylines.some((story) => story.kind === "DUO_HOT")).toBe(true);
    expect(preview.storylines.some((story) => story.kind === "MATCH_TYPE")).toBe(true);
  });
});
