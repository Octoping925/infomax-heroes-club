import { describe, expect, it } from "vitest";
import { commarize } from "./commarize";

describe("commarize", () => {
  it("숫자를 한국어 로케일 문자열로 변환한다", () => {
    expect(commarize(1234567)).toBe("1,234,567");
  });
});
