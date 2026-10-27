import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GameMap } from "@/domain/hots/models/map";
import { MAP_CATALOG } from "@/domain/hots/constants";
import { MapStatTab } from "./map-stat-tab";

vi.mock("./MapPlayerWinRateChart", () => ({ MapPlayerWinRateChart: () => null }));
vi.mock("./MapHeroWinRateChart", () => ({ MapHeroWinRateChart: () => null }));

describe("맵 통계 선택기", () => {
  it("모든 맵을 기록의 식별자 값으로 제공하고 기본 맵을 선택한다", () => {
    const html = renderToStaticMarkup(createElement(MapStatTab));

    for (const map of Object.values(GameMap)) {
      expect(html).toContain(`value="${map}"`);
      expect(html).toContain(MAP_CATALOG[map].nameKo);
    }
    expect(html).toMatch(/<option value="AlteracPass"[^>]* selected=""/);
  });
});
