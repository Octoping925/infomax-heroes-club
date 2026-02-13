import { describe, expect, it } from "vitest";
import { scoreHeroes } from "./tier-score-calc";

describe("scoreHeroes", () => {
  it("영웅별 점수 객체를 반환한다", () => {
    const result = scoreHeroes(
      [
        { hero: "Ana", wins: 8, losses: 2 },
        { hero: "Jaina", wins: 4, losses: 6 },
      ],
      {
        priorWinRate: 0.5,
        priorGames: 10,
      },
    );

    expect(Object.keys(result)).toEqual(["Ana", "Jaina"]);
    expect(result.Ana?.score).toBeGreaterThan(result.Jaina?.score ?? 0);
  });

  it("음수 wins/losses를 0으로 보정한다", () => {
    const result = scoreHeroes(
      [{ hero: "Ana", wins: -3, losses: -1 }],
      {
        priorWinRate: 1.2,
        priorGames: 5,
      },
    );

    expect(result.Ana?.games).toBe(0);
    expect(result.Ana?.rawWinRate).toBe(0);
    expect(result.Ana?.bayesWinRate).toBeLessThanOrEqual(1);
    expect(result.Ana?.score).toBeGreaterThanOrEqual(0);
  });
});
