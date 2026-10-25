import type { ReactNode } from "react";
import Image from "next/image";
import type { Hero } from "@/domain/hots/models";
import { HeroRoleLabelMap } from "@/domain/hots/models";
import { HERO_CATALOG } from "@/domain/hots/constants";
import { HoneyIcon } from "./tier";

export interface HeroTierTableRow {
  readonly hero: Hero;
  readonly rank: number;
  readonly tier: ReactNode;
  readonly win: ReactNode;
  readonly pick: ReactNode;
  readonly ban: ReactNode;
  readonly score: ReactNode;
  /** 승률 아래에 표본으로 붙는 경기 수 */
  readonly games?: ReactNode;
  readonly isHoneyPick?: boolean;
  readonly winRate?: number;
}

/**
 * 영웅 티어 표. 내전 통계 탭의 동호회 메타 패널과 같은 문법(이름 아래 포지션, 승률 아래 표본)을 쓴다.
 */
export function HeroTierTable({ rows }: { readonly rows: ReadonlyArray<HeroTierTableRow> }) {
  return (
    <div className="rounded-[14px] border border-white/10 bg-white/3 px-2 py-3 sm:px-4">
      <table className="w-full text-sm lg:text-base">
        <thead className="text-xs text-gray-400 lg:text-sm">
          <tr>
            <th className="w-8 px-1 py-2 text-right font-medium sm:px-2">#</th>
            <th className="w-12 px-1 py-2 text-center font-medium">티어</th>
            <th className="px-1 py-2 sm:px-2 text-left font-medium">영웅</th>
            <th className="px-1 py-2 sm:px-2 text-right font-medium">승률</th>
            <th className="px-1 py-2 sm:px-2 text-right font-medium">픽률</th>
            <th className="px-1 py-2 sm:px-2 text-right font-medium">밴률</th>
            <th className="px-1 py-2 sm:px-2 text-right font-medium max-sm:hidden">티어 점수</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((row) => {
            const hero = HERO_CATALOG[row.hero];

            return (
              <tr key={row.hero} className="border-t border-white/6">
                <td className="px-1 py-2 text-right text-gray-400 sm:px-2">{row.rank}</td>
                <td className="px-1 py-2">
                  <div className="flex justify-center whitespace-nowrap text-xs text-gray-400">{row.tier}</div>
                </td>
                <td className="px-1 py-2 sm:px-2">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="relative shrink-0">
                      <Image
                        src={hero.image}
                        alt=""
                        width={36}
                        height={36}
                        className="h-8 w-8 rounded-md border border-white/20 object-cover lg:h-9 lg:w-9"
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
                      <div className="text-xs text-gray-400 lg:text-sm">{HeroRoleLabelMap[hero.role]}</div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-1 py-2 text-right sm:px-2">
                  <div
                    className={`font-semibold ${row.winRate === undefined ? "text-white" : row.winRate >= 50 ? "text-emerald-200" : "text-rose-200"}`}
                  >
                    {row.win}
                  </div>
                  {row.games !== undefined && <div className="text-xs text-gray-400 lg:text-sm">{row.games}경기</div>}
                </td>
                <td className="px-1 py-2 sm:px-2 text-right text-gray-200">{row.pick}</td>
                <td className="px-1 py-2 sm:px-2 text-right text-gray-200">{row.ban}</td>
                <td className="px-1 py-2 sm:px-2 text-right text-gray-200 max-sm:hidden">{row.score}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
