import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TierPageClient, parsePageResult } from "./TierPageClient";

describe("TierPageClient", () => {
  it("introduces derived meta tiers and links to the club tier list", () => {
    const html = renderToStaticMarkup(createElement(TierPageClient));
    expect(html).toContain("전체 맵 메타 티어");
    expect(html).toContain("Heroes Profile");
    expect(html).toContain("내전 티어");
    expect(html).toContain("/stats#scrimStats");
    expect(html).toContain("<option value=\"ALL\" selected=\"\">전체 맵</option>");
    expect(html).toContain("맵");
  });
});

describe("parsePageResult", () => {
  it("rejects an incomplete server error instead of passing it to the table renderer", () => {
    expect(() => parsePageResult(502, { status: "error", error: "DB unavailable" })).toThrow("DB unavailable");
    expect(() => parsePageResult(200, { status: "ready" })).toThrow("티어 정보 형식");
  });
});
