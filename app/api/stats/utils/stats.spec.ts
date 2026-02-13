import { describe, expect, it } from "vitest";
import { GameResult } from "@/generated/prisma/client";
import {
  buildWinRateStatsFromCounts,
  buildWinRateStatsFromResults,
  calculateTotalGames,
  createResultCounts,
  toResultByWinnerTeamNumber,
  updateCountsByResult,
} from "./stats";

describe("stats 집계 유틸", () => {
  it("createResultCounts는 0으로 초기화한다", () => {
    expect(createResultCounts()).toEqual({ wins: 0, losses: 0, draws: 0 });
  });

  it("updateCountsByResult는 결과별 카운트를 증가시킨다", () => {
    const counts = createResultCounts();
    updateCountsByResult(counts, GameResult.WIN);
    updateCountsByResult(counts, GameResult.LOSE);
    updateCountsByResult(counts, GameResult.DRAW);

    expect(counts).toEqual({ wins: 1, losses: 1, draws: 1 });
  });

  it("calculateTotalGames는 총 경기 수를 계산한다", () => {
    expect(calculateTotalGames({ wins: 2, losses: 3, draws: 1 })).toBe(6);
  });

  it("toResultByWinnerTeamNumber는 승패무를 변환한다", () => {
    expect(toResultByWinnerTeamNumber(null, 1)).toBe(GameResult.DRAW);
    expect(toResultByWinnerTeamNumber(1, 1)).toBe(GameResult.WIN);
    expect(toResultByWinnerTeamNumber(2, 1)).toBe(GameResult.LOSE);
  });

  it("buildWinRateStatsFromCounts는 응답 스키마를 만든다", () => {
    expect(buildWinRateStatsFromCounts({ wins: 2, losses: 1, draws: 1 })).toEqual({
      totalGames: 4,
      wins: 2,
      losses: 1,
      draws: 1,
      winRate: 62.5,
    });
  });

  it("buildWinRateStatsFromResults는 결과 배열을 집계한다", () => {
    expect(buildWinRateStatsFromResults([GameResult.WIN, GameResult.LOSE, GameResult.DRAW])).toEqual({
      totalGames: 3,
      wins: 1,
      losses: 1,
      draws: 1,
      winRate: 50,
    });
  });
});
