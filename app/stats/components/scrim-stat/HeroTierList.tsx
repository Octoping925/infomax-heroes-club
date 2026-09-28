"use client";

import { useMemo, useState } from "react";
import { HeroTierLabel } from "@/app/api/stats/types";
import { HeroRole } from "@/domain/hots/models";
import { useHeroPopularity } from "../../hooks/useHeroPopularity";
import { OpTier } from "./tier/OpTier";
import { Tier1 } from "./tier/Tier1";
import { Tier2 } from "./tier/Tier2";
import { Tier3 } from "./tier/Tier3";
import { Tier4 } from "./tier/Tier4";
import { HeroTierTable } from "@/components/HeroTierTable";
import { HERO_CATALOG } from "@/domain/hots/constants";
import { HoneyIcon } from "./tier/HoneyIcon";
import { Tier5 } from "./tier/Tier5";
import { formatNumber } from "@/utils/format";

export function HeroTierList() {
  const { data } = useHeroPopularity();
  const [minPickCount, setMinPickCount] = useState(5);
  const [positionFilter, setPositionFilter] = useState<"ALL" | HeroRole>("ALL");
  const tierRows = useMemo(() => {
    return data
      .filter((row) => row.pickCount >= minPickCount)
      .filter((row) => positionFilter === "ALL" || HERO_CATALOG[row.hero].role === positionFilter)
      .map((row, index) => ({
        ...row,
        rank: index + 1,
      }));
  }, [data, minPickCount, positionFilter]);

  return (
    <section className="rounded-xl border border-white/20 bg-black/35 p-4 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="text-xl font-bold text-white">영웅 티어리스트</h3>

        <label className="flex items-center gap-2 text-base text-gray-100">
          최소 픽 횟수
          <select
            value={minPickCount}
            onChange={(event) => setMinPickCount(Number(event.target.value))}
            className="rounded-md border border-white/30 bg-black/50 px-3 py-1.5 text-base text-white outline-none focus:border-cyan-300"
          >
            {[1, 3, 5, 10].map((count) => (
              <option key={count} value={count}>
                {count}회 이상
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {POSITION_FILTER_TABS.map((tab) => {
          const active = tab.value === positionFilter;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setPositionFilter(tab.value)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-cyan-300/80 bg-cyan-300/20 text-cyan-100"
                  : "border-white/20 bg-white/5 text-gray-200 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <HeroTierTable
        showRole={positionFilter === "ALL"}
        rows={tierRows.map((hero) => ({
          hero: hero.hero,
          rank: hero.rank,
          tier: <TierIcon tier={hero.tier} />,
          accessory: hero.isHoneyPick ? <HoneyIcon /> : undefined,
          winRate: hero.pickWinRate,
          win: `${formatNumber(hero.pickWinRate)}% (${hero.wins}승 ${hero.losses}패)`,
          pick: `${Math.floor(hero.pickRate)}%`,
          ban: hero.banCount > 0 ? `${Math.floor(hero.banRate)}% (${hero.banCount}회)` : "-",
          score: hero.tierScore.toFixed(1),
        }))}
      />
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
