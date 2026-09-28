import { describe, expect, it } from "vitest";
import { selectVisibleRows } from "./select-visible-rows";
import type { HeroMetaRow } from "@/domain/hots/service/hero-meta-tier";

const rows: HeroMetaRow[] = [
  { hero: "Ana", role: "HEALER", games: 120, wins: 60, losses: 60, winRate: 50, pickRate: 5, banRate: null, tier: "B", tierScore: 50 },
  { hero: "Anduin", role: "HEALER", games: 120, wins: 72, losses: 48, winRate: 60, pickRate: 10, banRate: null, tier: "A", tierScore: 70 },
  { hero: "Diablo", role: "TANKER", games: 120, wins: 66, losses: 54, winRate: 55, pickRate: 20, banRate: 4, tier: "S", tierScore: 80 },
];

describe("selectVisibleRows", () => {
  it("finds Korean names without changing the source grades", () => {
    const visible = selectVisibleRows(rows, { role: "ALL", search: "안두", sort: "tier" });
    expect(visible.map((row) => [row.hero, row.tier])).toEqual([["Anduin", "A"]]);
  });

  it("filters by role and sorts by win rate", () => {
    const visible = selectVisibleRows(rows, { role: "HEALER", search: "", sort: "win" });
    expect(visible.map((row) => row.hero)).toEqual(["Anduin", "Ana"]);
  });
});
