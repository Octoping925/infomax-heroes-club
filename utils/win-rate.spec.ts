import { describe, expect, it } from "vitest";
import { calculateWinRate } from "./win-rate";

describe("calculateWinRate", () => {
  it("승무패를 반영해 승률을 소수점 둘째 자리로 반올림한다", () => {
    expect(calculateWinRate(1, 1, 0)).toBe(50);
    expect(calculateWinRate(2, 1, 1)).toBe(62.5);
  });

  it("전체 경기 수가 0이면 NaN을 반환한다", () => {
    expect(Number.isNaN(calculateWinRate(0, 0, 0))).toBe(true);
  });
});
