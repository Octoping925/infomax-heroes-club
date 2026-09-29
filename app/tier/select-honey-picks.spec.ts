import { describe, expect, it } from "vitest";
import type { HeroMetaRow } from "@/domain/hots/service/hero-meta-tier";
import { selectHoneyPicks } from "./select-honey-picks";

const healers: HeroMetaRow[] = [
  {
    hero: "Ana",
    role: "HEALER",
    games: 200,
    wins: 120,
    losses: 80,
    winRate: 60,
    pickRate: 4,
    banRate: 40,
    tier: "A",
    tierScore: 80,
  },
  {
    hero: "Anduin",
    role: "HEALER",
    games: 200,
    wins: 116,
    losses: 84,
    winRate: 58,
    pickRate: 5,
    banRate: 10,
    tier: "A",
    tierScore: 75,
  },
  {
    hero: "Auriel",
    role: "HEALER",
    games: 200,
    wins: 110,
    losses: 90,
    winRate: 55,
    pickRate: 6,
    banRate: 20,
    tier: "B",
    tierScore: 70,
  },
  {
    hero: "Brightwing",
    role: "HEALER",
    games: 200,
    wins: 100,
    losses: 100,
    winRate: 50,
    pickRate: 7,
    banRate: 30,
    tier: "C",
    tierScore: 60,
  },
  {
    hero: "Deckard",
    role: "HEALER",
    games: 200,
    wins: 90,
    losses: 110,
    winRate: 45,
    pickRate: 8,
    banRate: 0,
    tier: "D",
    tierScore: 50,
  },
];

describe("selectHoneyPicks", () => {
  it("selects high adjusted win rate with low ban rate within the same role", () => {
    const picks = selectHoneyPicks(healers);
    expect([...picks]).toEqual(["Anduin", "Auriel"]);
  });

  it("uses pick rate when ban rate is unavailable and excludes ungraded heroes", () => {
    const withoutBans: HeroMetaRow[] = [
      ...healers.map((row) => ({ ...row, banRate: null, pickRate: row.hero === "Ana" ? 20 : row.pickRate })),
      { ...healers[0], hero: "Kharazim", games: 99, tier: null, banRate: null },
    ];
    const picks = selectHoneyPicks(withoutBans);
    expect([...picks]).toEqual(["Anduin", "Auriel"]);
  });

  it("uses the current snapshot independently of search and map display", () => {
    const first = selectHoneyPicks(healers);
    const changed = healers.map((row) =>
      row.hero === "Anduin" ? { ...row, wins: 80, losses: 120, winRate: 40 } : row,
    );
    const second = selectHoneyPicks(changed);
    expect(first.has("Anduin")).toBe(true);
    expect(second.has("Anduin")).toBe(false);
  });
});
