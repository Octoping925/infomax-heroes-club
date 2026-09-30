import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Rank } from "./Rank";

it("renders rank, MVP, and ACE with their chip colors", () => {
  const render = (isWinnerTeam: boolean, isBestOnTeam: boolean) =>
    renderToStaticMarkup(createElement(Rank, { rank: 2, isWinnerTeam, isBestOnTeam }));

  const rank = render(true, false);
  expect(rank).toContain("2등");
  expect(rank).toContain("bg-[#4c4c53] text-white");

  const mvp = render(true, true);
  expect(mvp).toContain("MVP</span>");
  expect(mvp).toContain("font-bold");
  expect(mvp).toContain("bg-[#EB9C00] text-white");

  const ace = render(false, true);
  expect(ace).toContain("ACE</span>");
  expect(ace).toContain("font-bold");
  expect(ace).toContain("bg-[#7D59E8] text-white");
});
