import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TopBar } from "./TopBar";

describe("TopBar", () => {
  it("offers the public tier and matchup pages in navigation", () => {
    const html = renderToStaticMarkup(createElement(TopBar, { title: "메타 티어", value: "tier" }));
    expect(html).toContain('href="/tier"');
    expect(html).toContain("메타 티어");
    expect(html).toContain('href="/matchup"');
    expect(html).toContain("매치업");
    expect(html).not.toContain('href="/admin/strategy"');
  });
});
