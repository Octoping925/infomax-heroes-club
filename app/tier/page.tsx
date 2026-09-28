import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { TierPageClient } from "./TierPageClient";
import Link from "next/link";

export const metadata: Metadata = {
  title: "영웅 메타 티어 | Infomax Heroes Club",
  description: "Heroes Profile 통계를 바탕으로 영웅별 역할 상대 티어를 조회합니다.",
};

export default function TierPage() {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <TopBar title="영웅 메타 티어" value="tier" />
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-6 md:py-12">
        <section className="space-y-4 border-b border-white/10 pb-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Heroes Profile · Global Meta</p>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">영웅 메타 티어</h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
            전 세계 경기 통계를 바탕으로 영웅의 역할별 티어를 확인하세요. 1~5티어는 Heroes Profile이 제공하는 등급이
            아니라 이 사이트가 계산한 결과입니다.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="https://www.heroesprofile.com/Global/Hero"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-200 underline underline-offset-4"
            >
              Heroes Profile 원본 통계
            </Link>
            <Link href="/stats#scrimStats" className="text-slate-200 underline underline-offset-4">
              동호회 내전 티어 보기
            </Link>
          </div>
        </section>

        <TierPageClient />

        <section className="border-t border-white/10 pt-6 text-sm leading-7 text-slate-400">
          <h3 className="font-semibold text-slate-200">등급 산정 기준</h3>
          <p>100경기 이상인 영웅을 대상으로 역할별 상대 순위를 계산합니다. 승률 70%, 픽률 20%, 밴율 10%를 반영</p>
          <p>이 통계는 Heroes Profile에 수집된 리플레이를 기반으로 합니다. 동호회 내전과 연관이 없습니다.</p>
        </section>
      </main>
    </div>
  );
}
