import { describe, expect, it } from "vitest";
import {
  parseBoolean,
  parseClampedInteger,
  parseClampedIntegerParam,
  parseEnumParam,
  parseNumber,
} from "./query";

describe("stats query 유틸", () => {
  it("parseNumber는 숫자 문자열만 파싱한다", () => {
    expect(parseNumber("10.5")).toBe(10.5);
    expect(parseNumber("abc")).toBeUndefined();
    expect(parseNumber(null)).toBeUndefined();
  });

  it("parseClampedInteger는 반올림 규칙과 범위를 적용한다", () => {
    expect(parseClampedInteger("10.9", { min: 1, max: 20, fallback: 5 })).toBe(10);
    expect(parseClampedInteger("10.9", { min: 1, max: 20, fallback: 5, round: "trunc" })).toBe(10);
    expect(parseClampedInteger("-1", { min: 1, max: 20, fallback: 5 })).toBe(1);
    expect(parseClampedInteger("100", { min: 1, max: 20, fallback: 5 })).toBe(20);
    expect(parseClampedInteger("abc", { min: 1, max: 20, fallback: 5 })).toBe(5);
  });

  it("parseClampedIntegerParam은 첫 번째 유효 키를 읽는다", () => {
    const params = new URLSearchParams("a=3&b=9");
    expect(parseClampedIntegerParam(params, { keys: ["a", "b"], min: 1, max: 10, fallback: 5 })).toBe(3);
    expect(parseClampedIntegerParam(params, { keys: ["z"], min: 1, max: 10, fallback: 5 })).toBe(5);
  });

  it("parseEnumParam은 허용 값만 통과시킨다", () => {
    const params = new URLSearchParams("unit=game");
    expect(parseEnumParam(params, "unit", ["match", "game"], "match")).toBe("game");

    const invalidParams = new URLSearchParams("unit=invalid");
    expect(parseEnumParam(invalidParams, "unit", ["match", "game"], "match")).toBe("match");
  });

  it("parseBoolean은 true/false 문자열만 처리한다", () => {
    expect(parseBoolean("true")).toBe(true);
    expect(parseBoolean("false")).toBe(false);
    expect(parseBoolean("yes")).toBeUndefined();
    expect(parseBoolean(null)).toBeUndefined();
  });
});
