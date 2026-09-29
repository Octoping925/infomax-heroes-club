import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroTierTable } from "./HeroTierTable";
import { HoneyIcon } from "./tier";

describe("HeroTierTable", () => {
  it("renders the existing tier columns and Korean hero catalog entry", () => {
    const html = renderToStaticMarkup(
      createElement(HeroTierTable, {
        rows: [
          {
            hero: "Abathur",
            rank: 1,
            tier: "S",
            win: "52% (52승 48패)",
            pick: "11%",
            ban: "7%",
            score: "81.2",
          },
        ],
        showRole: true,
      }),
    );

    expect(html).toContain("아바투르");
    expect(html).toContain("포지션");
    expect(html).toContain("승률");
    expect(html).toContain("픽률");
    expect(html).toContain("밴률");
    expect(html).toContain("티어 점수");
    expect(html).toContain("52% (52승 48패)");
  });

  it("shows games only for the external table", () => {
    const html = renderToStaticMarkup(
      createElement(HeroTierTable, {
        rows: [{ hero: "Abathur", rank: 1, tier: "표본 부족", win: "-", pick: "-", ban: "-", score: "-", games: "99" }],
        showRole: false,
        showGames: true,
      }),
    );

    expect(html).toContain("경기 수");
    expect(html).toContain("표본 부족");
    expect(html).not.toContain("포지션");
  });

  it("places the existing honey icon on a hero portrait", () => {
    const html = renderToStaticMarkup(
      createElement(HeroTierTable, {
        rows: [
          {
            hero: "Ana",
            rank: 1,
            tier: "1티어",
            accessory: createElement(HoneyIcon),
            win: "55%",
            pick: "5%",
            ban: "2%",
            score: "80",
          },
        ],
        showRole: false,
      }),
    );

    expect(html).toContain("🐝");
  });
});
