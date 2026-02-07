"use client";

import { Suspense, useContext } from "react";
import { SelectedPlayerContext } from "../StatsPage";
import { Loading } from "@/components/Loading";
import { ScrimWinRate } from "./ScrimWinRate";
import { Title } from "../Title";
import { HeroTierList } from "./HeroTierList";

interface ScrimStatTabProps {
  readonly onPlayerRowClick: (playerId: string) => void;
}

export function ScrimStatTab({ onPlayerRowClick }: ScrimStatTabProps) {
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
      <Title title="내전 상세" />
      <div className="w-full flex flex-col gap-12">
        <Suspense fallback={<Loading />}>
          <ScrimWinRate onPlayerRowClick={onPlayerRowClick} />
        </Suspense>
        <Suspense fallback={<Loading />}>
          <HeroTierList />
        </Suspense>
      </div>
    </section>
  );
}
