"use client";

import { Suspense, useContext } from "react";
import { SelectedPlayerContext } from "../../page";
import { OverallStats } from "./OverallStats";
import { HeroStats } from "./HeroStats";
import { Loading } from "@/components/Loading";
import { PersonalMapWinRateChart } from "./PersonalMapWinRateChart";

type Props = {
  nickname: string;
};

/**
 * 플레이어 승률 차트
 */
export function PersonalStatTab({ nickname }: Props) {
  const selectedPlayer = useContext(SelectedPlayerContext);

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
          {selectedPlayer.name} ({nickname}) 상세
        </h2>
      </div>
      <div className="w-full flex flex-col gap-12">
        <Suspense fallback={<Loading />}>
          <OverallStats playerId={selectedPlayer.id} />
        </Suspense>
        <Suspense fallback={<Loading />}>
          <HeroStats nickname={nickname} />
        </Suspense>
        <Suspense fallback={<Loading />}>
          <PersonalMapWinRateChart nickname={nickname} />
        </Suspense>
      </div>
    </section>
  );
}
