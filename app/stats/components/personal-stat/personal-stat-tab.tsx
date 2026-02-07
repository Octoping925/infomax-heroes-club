"use client";

import { Suspense, useContext, useState } from "react";
import { SelectedPlayerContext } from "../StatsPage";
import { OverallStats } from "./OverallStats";
import { HeroStats } from "./HeroStats";
import { Loading } from "@/components/Loading";
import { PersonalMapWinRateChart } from "./PersonalMapWinRateChart";
import { StatCardGenerator } from "./StatCardGenerator";
import { PlayerFormTrendChart } from "./PlayerFormTrendChart";

/**
 * 플레이어 승률 차트
 */
export function PersonalStatTab() {
  const selectedPlayer = useContext(SelectedPlayerContext);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  if (!selectedPlayer) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-red-400">플레이어 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg text-white font-semibold">
          {selectedPlayer.name} ({selectedPlayer.nickname}) 상세
        </h2>
        <button
          onClick={() => setIsCardModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-400 transition"
        >
          전적 카드 생성
        </button>
      </div>
      <div className="w-full flex flex-col gap-12">
        {isCardModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/70" onClick={() => setIsCardModalOpen(false)} />
            <div
              className="relative w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0b0f1c] p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">전적 카드 생성</h3>
                <button
                  onClick={() => setIsCardModalOpen(false)}
                  className="rounded-lg border border-white/10 px-3 py-1 text-sm text-gray-300 hover:bg-white/10"
                >
                  닫기
                </button>
              </div>
              <div className="mt-4">
                <Suspense fallback={<Loading />}>
                  <StatCardGenerator
                    playerId={selectedPlayer.id}
                    playerName={selectedPlayer.name}
                    playerNickname={selectedPlayer.nickname}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        )}
        <Suspense fallback={<Loading />}>
          <OverallStats playerId={selectedPlayer.id} />
        </Suspense>
        <Suspense fallback={<Loading />}>
          <PlayerFormTrendChart nickname={selectedPlayer.nickname} />
        </Suspense>
        <Suspense fallback={<Loading />}>
          <HeroStats nickname={selectedPlayer.nickname} />
        </Suspense>
        <Suspense fallback={<Loading />}>
          <PersonalMapWinRateChart nickname={selectedPlayer.nickname} />
        </Suspense>
      </div>
    </section>
  );
}
