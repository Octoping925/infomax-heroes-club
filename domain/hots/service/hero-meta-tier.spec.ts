import { afterEach, describe, expect, it, vi } from "vitest";
import { gradeHeroStats, parseGroupedHeroStats, parseHeroStats, type HeroMetaStat } from "./hero-meta-tier";

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

  it("uses the Heroes Profile win rate instead of recalculating a rounded source rate", () => {
    expect(parseHeroStats({ data: [
      { name: "Yrel", games_played: 158234, wins: 75245, losses: 82989, win_rate: 47.55, pick_rate: 3.27 },
    ] })).toMatchObject([{ hero: "Yrel", winRate: 47.55 }]);
  });

  it("drops rows missing required game or popularity fields", () => {
    expect(parseHeroStats({ data: [
      { name: "Ana", wins: 50, pick_rate: 10 },
      { name: "Anduin", games_played: 100, wins: 50, losses: 50 },
    ] })).toEqual([]);
  });
});

describe("parseGroupedHeroStats", () => {
  it("maps Heroes Profile grouped map names to local map keys", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const maps = parseGroupedHeroStats({ data: {
      "Alterac Pass": [{ name: "Yrel", games_played: 120, wins: 60, losses: 60, win_rate: 50, pick_rate: 10 }],
      "Garden of Terror": [{ name: "Ana", games_played: 130, wins: 65, losses: 65, win_rate: 50, pick_rate: 11 }],
      "Unknown Map": [{ name: "Anduin", games_played: 100, wins: 50, losses: 50, win_rate: 50, pick_rate: 8 }],
    } });

    expect(maps.AlteracPass?.map((row) => row.hero)).toEqual(["Yrel"]);
    expect(maps.HauntedWoods?.map((row) => row.hero)).toEqual(["Ana"]);
    expect("Unknown Map" in maps).toBe(false);
    expect(warn).toHaveBeenCalledWith("Unmapped Heroes Profile map name:", "Unknown Map");
  });

  it("rejects a response without grouped map data", () => {
    expect(() => parseGroupedHeroStats({ data: [] })).toThrow("맵별 통계 응답 형식이 올바르지 않습니다.");
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
  it("assigns role-relative grades and withholds a 99-game hero", () => {
    const rows = gradeHeroStats([...healers, { ...healers[0], hero: "Kharazim", games: 99 }]);
    expect(healers.map((row) => rows.find((graded) => graded.hero === row.hero)?.tier)).toEqual(["S", "B", "B", "C", "E"]);
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
