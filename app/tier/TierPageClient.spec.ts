import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TierPageClient } from "./TierPageClient";

describe("TierPageClient", () => {
  it("introduces derived meta tiers and links to the club tier list", () => {
    const html = renderToStaticMarkup(createElement(TierPageClient));
    expect(html).toContain("전체 메타 티어");
    expect(html).toContain("Heroes Profile");
    expect(html).toContain("내전 티어");
    expect(html).toContain("/stats#scrimStats");
  });
});
