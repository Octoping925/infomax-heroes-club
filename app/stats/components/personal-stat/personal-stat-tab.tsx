"use client";

import { Suspense, useContext, useRef, useState } from "react";
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
  const dialogRef = useRef<HTMLDialogElement>(null);

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
          onClick={() => {
            setIsCardModalOpen(true);
            dialogRef.current?.showModal();
          }}
          className="px-4 py-2 rounded-lg bg-cyan-500 text-black text-sm font-semibold hover:bg-cyan-400 transition"
        >
          전적 카드 생성
        </button>
      </div>
      {/* 네이티브 dialog: 포커스 가두기, Esc 닫기, 닫힌 뒤 포커스 복귀를 브라우저가 처리한다. */}
      <dialog
        ref={dialogRef}
        aria-labelledby="stat-card-dialog-title"
        onClose={() => setIsCardModalOpen(false)}
        onClick={(event) => {
          // 바깥(backdrop) 클릭 시 닫기
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-4xl rounded-2xl border border-white/10 bg-[#0b0f1c] p-0 text-white shadow-xl backdrop:bg-black/70"
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h3 id="stat-card-dialog-title" className="text-lg font-semibold text-white">
              전적 카드 생성
            </h3>
            <button
              onClick={() => dialogRef.current?.close()}
              className="rounded-lg border border-white/10 px-3 py-1 text-sm text-gray-300 hover:bg-white/10"
            >
              닫기
            </button>
          </div>
          {isCardModalOpen && (
            <div className="mt-4">
              <Suspense fallback={<Loading />}>
                <StatCardGenerator
                  playerId={selectedPlayer.id}
                  playerName={selectedPlayer.name}
                  playerNickname={selectedPlayer.nickname}
                />
              </Suspense>
            </div>
          )}
        </div>
      </dialog>
      <div className="w-full flex flex-col gap-12">
        <Suspense fallback={<Loading />}>
          <OverallStats playerId={selectedPlayer.id} />
        </Suspense>
        <Suspense fallback={<Loading />}>
          <PlayerFormTrendChart nickname={selectedPlayer.nickname} />
        </Suspense>
        <Suspense fallback={<Loading />}>
          <HeroStats key={selectedPlayer.id} nickname={selectedPlayer.nickname} />
        </Suspense>
        <Suspense fallback={<Loading />}>
          <PersonalMapWinRateChart nickname={selectedPlayer.nickname} />
        </Suspense>
      </div>
    </section>
  );
}
