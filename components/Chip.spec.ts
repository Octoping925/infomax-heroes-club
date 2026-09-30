import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Chip } from "./Chip";
import { Position } from "./Position";
import type { HeroRole } from "@/domain/hots/models";

it("renders default and customized chips", () => {
  const defaults = renderToStaticMarkup(Chip({ children: "순위" }));
  expect(defaults).toContain("text-sm");
  expect(defaults).not.toContain('style=');
  expect(defaults).not.toContain("font-bold");

  const custom = renderToStaticMarkup(Chip({
    children: "MVP",
    textSize: "xs",
    bold: true,
    className: "bg-[#EB9C00] text-cyan-300 rounded-full border px-3 py-1",
  }));
  expect(custom).toContain("text-xs font-bold bg-[#EB9C00] text-cyan-300 rounded-full border px-3 py-1");
  expect(custom).not.toContain("text-sm");
  expect(custom).not.toContain("text-white");
  expect(custom).not.toContain('style=');
  expect(custom).toContain("MVP</span>");
});

it("preserves role colors and small or large position labels", () => {
  const roles: ReadonlyArray<{ role: HeroRole; color: string }> = [
    { role: "TANKER", color: "blue" },
    { role: "OFFLANER", color: "green" },
    { role: "MAIN_DEALER", color: "red" },
    { role: "SUB_DEALER", color: "purple" },
    { role: "HEALER", color: "cyan" },
  ];
  for (const { role, color } of roles) {
    const html = renderToStaticMarkup(Position({ position: role }));
    expect(html).toContain(`text-${color}-300`);
    expect(html).toContain(`bg-${color}-500/20`);
    expect(html).toContain("text-xs");
  }
  expect(renderToStaticMarkup(Position({ position: "TANKER", large: true }))).toContain("text-sm");
});

it("maps supported text sizes to static Tailwind classes", () => {
  const sizes = {
    "3xs": "text-[10px]",
    "2xs": "text-[11px]",
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  } as const;
  for (const size of Object.keys(sizes) as Array<keyof typeof sizes>) {
    expect(renderToStaticMarkup(Chip({ children: "크기", textSize: size }))).toContain(sizes[size]);
  }
});
