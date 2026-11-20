import type { HeroWinRateResponse } from "@/app/api/stats/types";
import type { Hero } from "@/domain/hots/models";
import { calculateWinRate } from "@/utils/win-rate";
import { describe, expect, it } from "vitest";
import { getPersonalHeroStatHighlights } from "./personal-hero-stat-highlights";

function record(hero: Hero, wins: number, losses: number, draws = 0): HeroWinRateResponse {
  return { hero, wins, losses, draws, totalGames: wins + losses + draws, winRate: calculateWinRate(wins, losses, draws) };
}

describe("getPersonalHeroStatHighlights", () => {
  it("uses game count to keep small unbeaten and winless records out of the rate cards", () => {
    const jaina = record("Jaina", 24, 12);
    const illidan = record("Illidan", 8, 20);
    const muradin = record("Muradin", 29, 25);

    expect(getPersonalHeroStatHighlights([
      record("Genji", 9, 0),
      record("Uther", 0, 9),
      record("Valla", 3, 1),
      jaina,
      illidan,
      muradin,
    ])).toEqual({
      strong: jaina,
      weak: illidan,
      mostPlayed: muradin,
      mostPlayedIsTied: false,
    });
  });

  it("requires the adjusted rate to clear 50 and counts draws as half a result", () => {
    const jaina = record("Jaina", 8, 2);
    const illidan = record("Illidan", 2, 8);
    const muradin = record("Muradin", 0, 0, 12);

    expect(getPersonalHeroStatHighlights([jaina, illidan, muradin])).toEqual({
      strong: undefined,
      weak: undefined,
      mostPlayed: muradin,
      mostPlayedIsTied: false,
    });
  });

  it("ranks eligible records by adjusted rate and breaks score ties by Korean hero name", () => {
    const jaina = record("Jaina", 24, 12);
    const genji = record("Genji", 24, 12);
    const valla = record("Valla", 13, 5);

    expect(getPersonalHeroStatHighlights([jaina, genji, valla])).toEqual({
      strong: genji,
      weak: undefined,
      mostPlayed: genji,
      mostPlayedIsTied: true,
    });
  });

  it("leaves a two-game map unfeatured", () => {
    expect(getPersonalHeroStatHighlights([record("Jaina", 2, 0)])).toEqual({
      strong: undefined,
      weak: undefined,
      mostPlayed: undefined,
      mostPlayedIsTied: false,
    });
  });
});
