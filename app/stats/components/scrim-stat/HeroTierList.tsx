"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { HeroTierLabel } from "@/app/api/stats/types";
import { HeroRole, HeroRoleLabelMap } from "@/domain/hots/models";
import { useHeroPopularity } from "../../hooks/useHeroPopularity";
import { HERO_CATALOG } from "@/domain/hots/constants";
import { formatNumber } from "@/utils/format";
import { Tier1, Tier2, Tier3, Tier4, Tier5, OpTier, HoneyIcon } from "@/components/tier";

/**
 * 동호회 메타 패널. 순위표 옆 좁은 칸에 맞춘 압축 영웅 티어 목록.
 */
export function HeroTierList() {
  const { data } = useHeroPopularity();
  const [minPickCount, setMinPickCount] = useState(5);
  const [positionFilter, setPositionFilter] = useState<"ALL" | HeroRole>("ALL");
  const tierRows = useMemo(() => {
    return data
      .filter((row) => row.pickCount >= minPickCount)
      .filter((row) => positionFilter === "ALL" || HERO_CATALOG[row.hero].role === positionFilter);
  }, [data, minPickCount, positionFilter]);

  return (
    <section className="rounded-[14px] border border-white/10 bg-white/3 px-3 py-3 sm:px-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <h3 className="text-base font-bold text-white">동호회 메타</h3>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          최소 픽
          <select
            value={minPickCount}
            onChange={(event) => setMinPickCount(Number(event.target.value))}
            className="rounded-md border border-white/15 bg-[#0a0a12] px-2 py-1 text-sm text-white outline-none focus:border-cyan-300"
          >
            {[1, 3, 5, 10].map((count) => (
              <option key={count} value={count}>
                {count}회 이상
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="scrollbar-hide mb-2 flex gap-1 overflow-x-auto px-1">
        {POSITION_FILTER_TABS.map((tab) => {
          const active = tab.value === positionFilter;

          return (
            <button
              key={tab.value}
              type="button"
              aria-pressed={active}
              onClick={() => setPositionFilter(tab.value)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                active
                  ? "border-cyan-300/80 bg-cyan-300/15 text-cyan-100"
                  : "border-white/15 text-gray-300 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tierRows.length === 0 ? (
        <p className="px-1 py-10 text-center text-sm text-gray-400">
          조건에 맞는 영웅이 없습니다. 최소 픽 횟수를 낮추거나 포지션을 바꿔 보세요.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-400">
            <tr>
              <th className="w-9 px-1 py-2 text-center font-medium">티어</th>
              <th className="px-2 py-2 text-left font-medium">영웅</th>
              <th className="px-2 py-2 text-right font-medium">승률</th>
              <th className="px-2 py-2 text-right font-medium">픽률</th>
              <th className="px-2 py-2 text-right font-medium">밴률</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {tierRows.map((row) => {
              const hero = HERO_CATALOG[row.hero];

              return (
                <tr key={row.hero} className="border-t border-white/6">
                  <td className="px-1 py-2">
                    <div className="flex justify-center">
                      <TierIcon tier={row.tier} />
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <Image
                          src={hero.image}
                          alt=""
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-md border border-white/20 object-cover"
                        />
                        {row.isHoneyPick && (
                          <span aria-hidden="true">
                            <HoneyIcon />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-white">
                          {hero.nameKo}
                          {row.isHoneyPick && <span className="sr-only"> (꿀픽)</span>}
                        </div>
                        <div className="text-xs text-gray-400">{HeroRoleLabelMap[hero.role]}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">
                    <div className={`font-semibold ${row.pickWinRate >= 50 ? "text-emerald-200" : "text-rose-200"}`}>
                      {formatNumber(row.pickWinRate)}%
                    </div>
                    <div className="text-xs text-gray-400">
                      {row.wins}승 {row.losses}패
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right text-gray-200">{Math.floor(row.pickRate)}%</td>
                  <td className="px-2 py-2 text-right text-gray-200">
                    {row.banCount > 0 ? `${Math.floor(row.banRate)}%` : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p className="mt-3 border-t border-white/6 px-1 pt-3 text-xs text-gray-400">
        🐝 꿀픽: 승률 60% 이상인데 밴은 잘 안 당하는 영웅
      </p>
    </section>
  );
}

function TierIcon({ tier }: { readonly tier: HeroTierLabel }) {
  if (tier === "OP") return <OpTier />;
  if (tier === "1티어") return <Tier1 />;
  if (tier === "2티어") return <Tier2 />;
  if (tier === "3티어") return <Tier3 />;
  if (tier === "4티어") return <Tier4 />;

  return <Tier5 />;
}

const POSITION_FILTER_TABS: ReadonlyArray<{ value: "ALL" | HeroRole; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "TANKER", label: "탱커" },
  { value: "OFFLANER", label: "투사" },
  { value: "MAIN_DEALER", label: "메인딜러" },
  { value: "SUB_DEALER", label: "서브딜러" },
  { value: "HEALER", label: "힐러" },
];
