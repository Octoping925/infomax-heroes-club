import { describe, expect, it } from "vitest";
import { formatNumberOrDash } from "./format";

describe("formatNumberOrDash", () => {
  it("null 또는 undefined면 대시를 반환한다", () => {
    expect(formatNumberOrDash(null)).toBe("-");
    expect(formatNumberOrDash(undefined as unknown as number)).toBe("-");
  });

  it("값이 있으면 문자열로 변환한다", () => {
    expect(formatNumberOrDash(10)).toBe("10");
    expect(formatNumberOrDash("20")).toBe("20");
  });
});
