import { describe, expect, it } from "vitest";
import { GameResult } from "@/generated/prisma/client";
import { calculateGameResult, parseTakeParam, toPlayerStats } from "./common";

describe("match/common 유틸", () => {
  it("parseTakeParam은 기본값과 최대값을 적용한다", () => {
    expect(parseTakeParam(null)).toBe(50);
    expect(parseTakeParam("0")).toBe(50);
    expect(parseTakeParam("10.9")).toBe(10);
    expect(parseTakeParam("999")).toBe(200);
    expect(parseTakeParam("abc")).toBe(50);
  });

  it("toPlayerStats는 필요한 스탯만 변환한다", () => {
    const source = {
      id: "m1",
      position: "HEALER" as const,
      kills: 1,
      deaths: 2,
      takedowns: 3,
      heroDamage: 4,
      siegeDamage: 5,
      healingDone: 6,
      experienceContribution: 7,
      damageTaken: 8,
      timeCCdEnemyHeroes: 9,
      timeSpentDead: 10,
      mercCampCaptures: 11,
      watchTowerCaptures: 12,
    };

    expect(toPlayerStats(source)).toEqual(source);
  });

  it("calculateGameResult는 승패무를 계산한다", () => {
    expect(calculateGameResult(1, null)).toBe(GameResult.DRAW);
    expect(calculateGameResult(1, 1)).toBe(GameResult.WIN);
    expect(calculateGameResult(1, 2)).toBe(GameResult.LOSE);
  });
});
