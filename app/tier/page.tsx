import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { TierPageClient } from "./TierPageClient";

export const metadata: Metadata = {
  title: "영웅 메타 티어 | Infomax Heroes Club",
  description: "Heroes Profile 통계를 바탕으로 영웅별 역할 상대 티어를 조회합니다.",
};

export default function TierPage() {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <TopBar title="영웅 메타 티어" value="tier" />
      <TierPageClient />
    </div>
  );
}
