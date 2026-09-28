import { afterEach, describe, expect, it, vi } from "vitest";
import { gradeHeroStats, parseHeroStats, type HeroMetaStat } from "./hero-meta-tier";

describe("parseHeroStats", () => {
  afterEach(() => vi.restoreAllMocks());

  it("matches punctuated and accented Heroes Profile names to local heroes", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const rows = parseHeroStats({ data: [
      { name: "E.T.C.", games_played: "100", wins: "55", losses: "45", pick_rate: "12.5", ban_rate: "4" },
      { name: "Lúcio", games_played: 120, wins: 62, losses: 58, pick_rate: 10, ban_rate: null },
      { name: "Unknown Hero", games_played: 100, wins: 50, losses: 50, pick_rate: 10 },
    ] });

    expect(rows.map((row) => row.hero)).toEqual(["ETC", "Lucio"]);
    expect(rows[0]).toMatchObject({ games: 100, wins: 55, pickRate: 12.5, banRate: 4 });
    expect(rows[1]?.banRate).toBeNull();
    expect(warn).toHaveBeenCalledWith("Unmapped Heroes Profile hero names:", ["Unknown Hero"]);
  });

  it("accepts v1 popularity and derives games from wins and losses", () => {
    expect(parseHeroStats({ data: [
      { name: "Ana", wins: 55, losses: 45, popularity: 12.5, ban_rate: 3 },
    ] })).toMatchObject([{ hero: "Ana", games: 100, pickRate: 12.5 }]);
  });

  it("drops rows missing required game or popularity fields", () => {
    expect(parseHeroStats({ data: [
      { name: "Ana", wins: 50, pick_rate: 10 },
      { name: "Anduin", games_played: 100, wins: 50, losses: 50 },
    ] })).toEqual([]);
  });
});

const healers: HeroMetaStat[] = ["Ana", "Anduin", "Auriel", "Brightwing", "Deckard"].map((hero, index) => ({
  hero: hero as HeroMetaStat["hero"],
  games: 100,
  wins: 65 - index * 7,
  losses: 35 + index * 7,
  winRate: 65 - index * 7,
  pickRate: 20 - index * 3,
  banRate: 10 - index,
}));

describe("gradeHeroStats", () => {
  it("assigns S through D by role and withholds a 99-game hero", () => {
    const rows = gradeHeroStats([...healers, { ...healers[0], hero: "Kharazim", games: 99 }]);
    expect(healers.map((row) => rows.find((graded) => graded.hero === row.hero)?.tier)).toEqual(["S", "A", "B", "C", "D"]);
    expect(rows.find((row) => row.hero === "Kharazim")?.tier).toBeNull();
  });

  it("withholds a grade when fewer than five heroes qualify in a role", () => {
    const rows = gradeHeroStats(healers.slice(0, 4));
    expect(rows.every((row) => row.tier === null)).toBe(true);
  });

  it("keeps scores finite without ban data and resolves ties by hero name", () => {
    const rows = gradeHeroStats(healers.map((row) => ({ ...row, wins: 50, losses: 50, winRate: 50, pickRate: 10, banRate: null })));
    expect(rows.map((row) => row.hero)).toEqual(["Ana", "Anduin", "Auriel", "Brightwing", "Deckard"]);
    expect(rows.every((row) => Number.isFinite(row.tierScore))).toBe(true);
  });
});
