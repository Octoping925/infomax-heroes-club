import { describe, expect, it } from "vitest";
import { chooseCombinations } from "./combination";

describe("chooseCombinations", () => {
  it("조합 크기에 맞는 모든 조합을 반환한다", () => {
    const result = chooseCombinations(["A", "B", "C"], 2);

    expect(result).toEqual([
      ["A", "B"],
      ["A", "C"],
      ["B", "C"],
    ]);
  });

  it("선택 수가 0이면 빈 조합 한 개를 반환한다", () => {
    expect(chooseCombinations([1, 2, 3], 0)).toEqual([[]]);
  });

  it("선택 수가 원소 수보다 크면 빈 배열을 반환한다", () => {
    expect(chooseCombinations([1, 2], 3)).toEqual([]);
  });
});
