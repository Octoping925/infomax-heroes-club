import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";

import GuidePageClient from "../GuidePageClient";
import { extractGuideHeadings } from "../guide-content";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "히오스 조합 구성 가이드 | 인포맥스 히오스 동호회",
  description:
    "메인탱, 투사, 힐러, 메인딜러와 서브딜러의 역할부터 라인 경험치와 캠프 관리까지, 히오스 조합 구성과 운영의 기본을 정리했습니다.",
};

export default async function CombinationGuidePage() {
  const markdown = await readFile(path.join(process.cwd(), "docs", "hots-beginner-guide-combination.md"), "utf8");

  return <GuidePageClient variant="combination" markdown={markdown} headings={extractGuideHeadings(markdown)} />;
}
