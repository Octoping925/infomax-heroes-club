import { describe, expect, it } from "vitest";

import {
  extractGuideHeadings,
  prepareGuideMarkdown,
  slugifyGuideHeading,
} from "./guide-content";

describe("prepareGuideMarkdown", () => {
  it("keeps the first repeated level-two section and preserves later sections", () => {
    const markdown = [
      "# Guide",
      "",
      "## 1. Basics",
      "",
      "First body",
      "",
      "## Quick Start",
      "",
      "Keep this checklist",
      "",
      "## Quick Start",
      "",
      "Remove this duplicate",
      "",
      "## References",
      "",
      "Keep references",
    ].join("\n");

    const result = prepareGuideMarkdown(markdown);

    expect(result.match(/^## Quick Start$/gm)).toHaveLength(1);
    expect(result).toContain("Keep this checklist");
    expect(result).not.toContain("Remove this duplicate");
    expect(result).toContain("Keep references");
  });

  it("does not deduplicate level-three headings with the same text", () => {
    const markdown = [
      "## One",
      "### Tip",
      "First tip",
      "## Two",
      "### Tip",
      "Second tip",
    ].join("\n");

    const result = prepareGuideMarkdown(markdown);

    expect(result.match(/^### Tip$/gm)).toHaveLength(2);
  });
});

describe("guide headings", () => {
  it("extracts unique level-two headings with stable ids", () => {
    const markdown = [
      "# Guide",
      "## 1. 히오스는 어떤 게임인가요?",
      "### 작은 제목",
      "## 내전 신입용 빠른 시작",
    ].join("\n");

    expect(extractGuideHeadings(markdown)).toEqual([
      {
        id: "1-히오스는-어떤-게임인가요",
        label: "1. 히오스는 어떤 게임인가요?",
      },
      {
        id: "내전-신입용-빠른-시작",
        label: "내전 신입용 빠른 시작",
      },
    ]);
  });

  it("creates a readable fallback id", () => {
    expect(slugifyGuideHeading("?!")).toBe("section");
  });
});
