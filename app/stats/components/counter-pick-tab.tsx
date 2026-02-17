"use client";

import Image from "next/image";
import { useState } from "react";
import { useHeroCounterPicks } from "../hooks/useHeroCounterPicks";
import { formatNumber } from "@/utils/format";
import { HERO_CATALOG } from "@/domain/hots/constants";

export function CounterPickTab() {
  const { data } = useHeroCounterPicks();
  const [minGames, setMinGames] = useState(5);

  const rows = data.filter((row) => row.totalGames >= minGames);

  return (
    <section className="rounded-xl border border-white/20 bg-black/35 p-5 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="text-xl font-bold text-white">카운터픽</h3>
        <label className="flex items-center gap-2 text-base text-gray-100">
          최소 경기 수
          <select
            value={minGames}
            onChange={(event) => setMinGames(Number(event.target.value))}
            className="rounded-md border border-white/30 bg-black/50 px-3 py-1.5 text-base text-white outline-none focus:border-cyan-300"
          >
            {[3, 5, 10, 20].map((count) => (
              <option key={count} value={count}>
                {count}경기 이상
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/15 bg-white/4">
        <div className="divide-y divide-white/10">
          {rows.map((hero) => {
            if (hero.counters.length === 0) return null;
            const heroEntry = HERO_CATALOG[hero.hero];

            return (
              <article key={hero.hero} className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <Image
                    src={heroEntry.image}
                    alt={hero.hero}
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-md border border-white/25 object-cover"
                  />
                  <span className="font-bold text-white">{heroEntry.nameKo}</span>
                  <span
                    className={`text-base font-bold ${hero.baseWinRate >= 50 ? "text-emerald-200" : "text-rose-200"}`}
                  >
                    기본 승률 {formatNumber(hero.baseWinRate)}%
                  </span>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  {hero.counters.map((counter) => {
                    const counterEntry = HERO_CATALOG[counter.opponentHero];
                    return (
                      <div
                        key={`${hero.hero}-${counter.opponentHero}`}
                        className="rounded-lg border border-rose-300/30 bg-rose-300/10 px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Image
                              src={counterEntry.image}
                              alt={counterEntry.nameKo}
                              width={36}
                              height={36}
                              className="rounded border border-white/25 object-cover"
                            />
                            <span className="font-semibold text-rose-100 w-12 sm:w-12 md:w-24 lg:w-28 text-ellipsis overflow-hidden whitespace-nowrap">
                              {counterEntry.nameKo}
                            </span>
                          </div>
                          <div className="text-right pr-2">
                            <p className="text-xs text-gray-200">
                              상대전적: {counter.wins}승 {counter.losses}패
                            </p>
                            <p className="text-sm font-bold text-rose-100">
                              승률 하락: -{formatNumber(counter.dropPercentPoint)}%p
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
