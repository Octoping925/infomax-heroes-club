import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TierPageClient, parsePageResult } from "./TierPageClient";

describe("TierPageClient", () => {
  it("shows the meta filters and tier table controls", () => {
    const html = renderToStaticMarkup(createElement(TierPageClient));
    expect(html).toContain("영웅 티어리스트");
    expect(html).toContain("플레이어 리그");
    expect(html).toContain('<option value="ALL" selected="">전체 맵</option>');
    expect(html).toContain("맵");
    expect(html).toContain("티어별 점수");
  });
});

describe("parsePageResult", () => {
  it("rejects an incomplete server error instead of passing it to the table renderer", () => {
    expect(() => parsePageResult(502, { status: "error", error: "DB unavailable" })).toThrow("DB unavailable");
    expect(() => parsePageResult(200, { status: "ready" })).toThrow("티어 정보 형식");
  });
});
