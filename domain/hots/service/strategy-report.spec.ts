import { describe, expect, it, vi } from "vitest";
import { buildStrategyReport } from "./strategy-report";
import type { PrismaClient } from "@/generated/prisma/client";
import type { HeroMetaStat } from "./hero-meta/hero-meta-tier";

function makeTankMetaStats(overrides: Partial<Record<string, Partial<HeroMetaStat>>> = {}): HeroMetaStat[] {
  const baseHeroes = ["Diablo", "Johanna", "Muradin", "ETC", "Anubarak", "Garrosh"] as const;
  return baseHeroes.map((hero, index) => ({
    hero,
    games: 1000,
    wins: 500 + (5 - index) * 20,
    losses: 500 - (5 - index) * 20,
    winRate: 50 + (5 - index) * 2,
    pickRate: 12 - index,
    banRate: 10 - index,
    ...overrides[hero],
  }));
}

describe("buildStrategyReport (admin strategy upgrades)", () => {
  it("boosts frequently target-banned enemy heroes, attaches map meta tier, and flags home/away map advantage", async () => {
    const playedAt = new Date("2026-10-05T03:00:00.000Z");

    const players = [
      { id: "ally1", name: "김아군", nickname: "ally1" },
      { id: "enemy1", name: "박상대", nickname: "enemy1" },
    ];

    const gameRows = [
      // ally1: 4 wins on InfernalShrines with Johanna (100% WR)
      ...Array.from({ length: 4 }, (_, i) => ({
        playerId: "ally1",
        hero: "Johanna",
        position: "TANKER",
        heroDamage: 30000,
        dpm: 1500,
        gameTeam: {
          result: "WIN",
          game: {
            id: `g-a-${i}`,
            map: "InfernalShrines",
            gameNumber: i + 1,
            matchId: `m-a-${i}`,
            match: { playedAt },
          },
        },
      })),
      // enemy1: 4 games on InfernalShrines with Muradin (50% WR), and 2 games with Diablo (100% WR)
      ...Array.from({ length: 4 }, (_, i) => ({
        playerId: "enemy1",
        hero: "Muradin",
        position: "TANKER",
        heroDamage: 25000,
        dpm: 1200,
        gameTeam: {
          result: i < 2 ? "WIN" : "LOSE",
          game: {
            id: `g-e-m-${i}`,
            map: "InfernalShrines",
            gameNumber: i + 1,
            matchId: `m-e-m-${i}`,
            match: { playedAt },
          },
        },
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        playerId: "enemy1",
        hero: "Diablo",
        position: "TANKER",
        heroDamage: 35000,
        dpm: 1800,
        gameTeam: {
          result: "WIN",
          game: {
            id: `g-e-d-${i}`,
            map: "CursedHollow",
            gameNumber: i + 1,
            matchId: `m-e-d-${i}`,
            match: { playedAt },
          },
        },
      })),
    ];

    // Opponents target-banned enemy1's Diablo 4 times (including 2 times on InfernalShrines)
    const scrimBans = Array.from({ length: 4 }, (_, i) => ({
      hero: "Diablo",
      gameTeam: {
        teamNumber: 1,
        game: {
          map: i < 2 ? "InfernalShrines" : "CursedHollow",
          teams: [
            { teamNumber: 1, members: [{ playerId: "ally1" }] },
            { teamNumber: 2, members: [{ playerId: "enemy1" }] },
          ],
        },
      },
    }));

    const prisma = {
      player: {
        findMany: vi.fn().mockResolvedValue(players),
      },
      gameTeamMember: {
        findMany: vi.fn().mockResolvedValue(gameRows),
      },
      match: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      gameTeamBan: {
        findMany: vi.fn().mockResolvedValue(scrimBans),
      },
      heroMetaSnapshot: {
        findUnique: vi.fn().mockResolvedValue({
          key: "all",
          stats: makeTankMetaStats(),
          patch: "2.55.14",
          fetchedAt: playedAt,
          jobPath: null,
          pendingPatch: null,
          nextPollAt: null,
          mapStats: {
            InfernalShrines: makeTankMetaStats(),
          },
          mapPatch: "2.55.14",
          mapFetchedAt: playedAt,
          mapJobPath: null,
          mapPendingPatch: null,
          mapNextPollAt: null,
        }),
      },
    } as unknown as PrismaClient;

    const report = await buildStrategyReport(prisma, {
      allyNicknames: ["ally1"],
      enemyNicknames: ["enemy1"],
      selectedMaps: ["InfernalShrines"],
    });

    expect(report.metaPatch).toBe("2.55.14");
    const plan = report.matchup.selectedMapPlans[0];
    expect(plan.advantage).toBe("ALLY_HOME");
    expect(plan.metaSource).toBe("MAP");

    // Diablo has 4 target bans + OP meta tier so it should be the #1 recommended ban against enemy1
    expect(plan.recommendedBans[0]).toMatchObject({
      hero: "Diablo",
      scrimBanCount: 4,
      scrimMapBanCount: 2,
      metaTier: "OP",
    });
    expect(plan.recommendedBans[0].reason).toContain("내전 피밴 4회");
    expect(plan.recommendedBans[0].reason).toContain("메타 OP");

    // Ally pick Johanna gets map meta tier attached too
    expect(plan.recommendedPicks[0]).toMatchObject({
      hero: "Johanna",
      metaTier: "1티어",
    });
  });
});
