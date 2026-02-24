import { describe, expect, it } from "vitest";
import { formatHighlightTimestamp, MAX_HIGHLIGHT_SECONDS, parseHighlightTimestampInput } from "./highlight-time";

describe("highlight-time utils", () => {
  it("초를 HH:MM:SS 형식으로 포맷한다", () => {
    expect(formatHighlightTimestamp(804)).toBe("00:13:24");
    expect(formatHighlightTimestamp(3723)).toBe("01:02:03");
    expect(formatHighlightTimestamp(-1)).toBe("00:00:00");
  });

  it("초 단위 문자열을 파싱한다", () => {
    expect(parseHighlightTimestampInput("804")).toBe(804);
    expect(parseHighlightTimestampInput(`${MAX_HIGHLIGHT_SECONDS}`)).toBe(MAX_HIGHLIGHT_SECONDS);
    expect(parseHighlightTimestampInput(`${MAX_HIGHLIGHT_SECONDS + 1}`)).toBeNull();
  });

  it("mm:ss / hh:mm:ss 형식을 파싱한다", () => {
    expect(parseHighlightTimestampInput("13:24")).toBe(804);
    expect(parseHighlightTimestampInput("01:02:03")).toBe(3723);
    expect(parseHighlightTimestampInput("1:70")).toBeNull();
    expect(parseHighlightTimestampInput("1:2:70")).toBeNull();
  });

  it("잘못된 입력은 null을 반환한다", () => {
    expect(parseHighlightTimestampInput("")).toBeNull();
    expect(parseHighlightTimestampInput(" ")).toBeNull();
    expect(parseHighlightTimestampInput("abc")).toBeNull();
    expect(parseHighlightTimestampInput("1:2:3:4")).toBeNull();
    expect(parseHighlightTimestampInput("-1")).toBeNull();
  });
});
