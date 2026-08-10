import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";

import GuidePageClient from "./GuidePageClient";
import { extractGuideHeadings, prepareGuideMarkdown } from "./guide-content";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "롤 유저를 위한 히오스 입문 가이드 | 인포맥스 히오스 동호회",
  description:
    "롤 경험자가 히오스 첫 내전에 바로 참여할 수 있도록 차이점, 포지션, 운영, 추천 영웅과 체크리스트를 정리한 안내서입니다.",
};

export default async function GuidePage() {
  const sourcePath = path.join(
    process.cwd(),
    "docs",
    "hots-beginner-guide-for-lol-players.md",
  );
  const source = await readFile(sourcePath, "utf8");
  const markdown = prepareGuideMarkdown(source);
  const headings = extractGuideHeadings(markdown);

  return <GuidePageClient markdown={markdown} headings={headings} />;
}
