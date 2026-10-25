"use client";

import { Suspense, useState } from "react";
import { Loading } from "@/components/Loading";
import { ScrimWinRate } from "./ScrimWinRate";
import { HeroTierList } from "./HeroTierList";

interface ScrimStatTabProps {
  readonly onPlayerRowClick: (playerId: string) => void;
}

type MobilePanel = "players" | "heroes";

const MOBILE_PANELS: ReadonlyArray<{ value: MobilePanel; label: string }> = [
  { value: "players", label: "선수 순위" },
  { value: "heroes", label: "동호회 메타" },
];

/**
 * 내전 판도 탭. 데스크톱은 선수 순위와 동호회 메타를 나란히, 모바일은 둘 중 하나를 전환해서 보여준다.
 */
export function ScrimStatTab({ onPlayerRowClick }: ScrimStatTabProps) {
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("players");

  return (
    <section className="space-y-3">
      <div className="flex gap-1 rounded-xl bg-white/5 p-1 lg:hidden">
        {MOBILE_PANELS.map((panel) => (
          <button
            key={panel.value}
            type="button"
            aria-pressed={mobilePanel === panel.value}
            onClick={() => setMobilePanel(panel.value)}
            className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
              mobilePanel === panel.value
                ? "border-cyan-400 bg-cyan-500/20 text-white"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            {panel.label}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        {/* 순위표가 화면보다 길어서 아래쪽 기준으로 붙인다. 바닥이 화면 하단에 닿으면 메타 목록이 끝날 때까지 그 자리에 머문다. */}
        <div className={`lg:sticky lg:bottom-4 lg:self-end ${mobilePanel === "players" ? "" : "max-lg:hidden"}`}>
          <Suspense fallback={<Loading />}>
            <ScrimWinRate onPlayerRowClick={onPlayerRowClick} />
          </Suspense>
        </div>
        <div className={mobilePanel === "heroes" ? "" : "max-lg:hidden"}>
          <Suspense fallback={<Loading />}>
            <HeroTierList />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
