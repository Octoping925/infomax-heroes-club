import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroTierTable } from "./HeroTierTable";

describe("HeroTierTable", () => {
  it("renders the tier columns with the hero's Korean name and role", () => {
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
      }),
    );

    expect(html).toContain("아바투르");
    expect(html).toContain("서브딜러");
    expect(html).toContain("승률");
    expect(html).toContain("픽률");
    expect(html).toContain("밴률");
    expect(html).toContain("티어 점수");
    expect(html).toContain("52% (52승 48패)");
  });

  it("shows the game count under the win rate when given", () => {
    const html = renderToStaticMarkup(
      createElement(HeroTierTable, {
        rows: [{ hero: "Abathur", rank: 1, tier: "표본 부족", win: "-", pick: "-", ban: "-", score: "-", games: "99" }],
      }),
    );

    expect(html).toContain("99경기");
    expect(html).toContain("표본 부족");
  });

  it("marks a honey pick with the icon and a screen-reader label", () => {
    const html = renderToStaticMarkup(
      createElement(HeroTierTable, {
        rows: [
          {
            hero: "Ana",
            rank: 1,
            tier: "1티어",
            isHoneyPick: true,
            win: "55%",
            pick: "5%",
            ban: "2%",
            score: "80",
          },
        ],
      }),
    );

    expect(html).toContain("🐝");
    expect(html).toContain("(꿀픽)");
  });
});
