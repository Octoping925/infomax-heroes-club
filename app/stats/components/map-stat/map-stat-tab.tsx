"use client";

import { Suspense, useState } from "react";
import { MapPlayerWinRateChart } from "./MapPlayerWinRateChart";
import { GameMap } from "@/domain/hots/models/map";
import { MAPS } from "@/domain/hots/constants/maps";
import { Loading } from "@/components/Loading";
import { MapHeroWinRateChart } from "./MapHeroWinRateChart";

/**
 * Stats 탭에서 보여주는 역대 match 전적
 */
export function MapStatTab() {
  const [selectedMap, setSelectedMap] = useState<GameMap>("AlteracPass");

  return (
    <div>
      <div className="flex flex-col gap-2 max-w-xs mb-8">
        <label className="text-sm font-semibold text-gray-400">
          <span>맵 선택</span>
          <select
            value={selectedMap}
            onChange={(e) => setSelectedMap(e.target.value as GameMap)}
            className=" ml-5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
          >
            {Object.entries(MAPS).map(([key, value]) => (
              <option key={key} value={key} className="bg-[#1a1a2e] text-white">
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
        플레이어별 승률
      </h3>
      <Suspense fallback={<Loading />}>
        <MapPlayerWinRateChart map={selectedMap} />
      </Suspense>
      <h3 className="mt-8 text-sm font-semibold text-gray-400 uppercase tracking-wider">
        영웅별 승률
      </h3>
      <Suspense fallback={<Loading />}>
        <MapHeroWinRateChart map={selectedMap} />
      </Suspense>
    </div>
  );
}
