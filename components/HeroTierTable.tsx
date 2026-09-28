import type { ReactNode } from "react";
import Image from "next/image";
import type { Hero } from "@/domain/hots/models";
import { HERO_CATALOG } from "@/domain/hots/constants";
import { Position } from "./Position";

export interface HeroTierTableRow {
  readonly hero: Hero;
  readonly rank: number;
  readonly tier: ReactNode;
  readonly win: ReactNode;
  readonly pick: ReactNode;
  readonly ban: ReactNode;
  readonly score: ReactNode;
  readonly games?: ReactNode;
  readonly accessory?: ReactNode;
  readonly winRate?: number;
  readonly onSelect?: () => void;
}

export function HeroTierTable({ rows, showRole, showGames = false }: {
  readonly rows: ReadonlyArray<HeroTierTableRow>;
  readonly showRole: boolean;
  readonly showGames?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/15 bg-white/4">
      <table className="min-w-[750px] w-full text-base">
        <thead className="bg-white/6 text-sm text-gray-100">
          <tr>
            <th aria-label="순위" />
            <th aria-label="영웅" />
            <th className="px-3 py-2.5 text-center font-semibold">티어</th>
            {showRole && <th className="px-3 py-2.5 text-center font-semibold">포지션</th>}
            <th className="px-2 py-2.5 text-center font-semibold">승률</th>
            <th className="px-3 py-2.5 text-center font-semibold">픽률</th>
            <th className="px-3 py-2.5 text-center font-semibold">밴률</th>
            {showGames && <th className="px-3 py-2.5 text-center font-semibold">경기 수</th>}
            <th className="px-3 py-2.5 text-center font-semibold">티어 점수</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const hero = HERO_CATALOG[row.hero];
            return (
              <tr key={row.hero} className="border-t border-white/10 hover:bg-white/6">
                <td className="pl-4 py-2.5 font-semibold text-gray-100">{row.rank}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Image
                        src={hero.image}
                        alt={row.hero}
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-md border border-white/25 object-cover"
                      />
                      {row.accessory}
                    </div>
                    {row.onSelect ? (
                      <button type="button" onClick={row.onSelect} className="font-bold text-white hover:underline focus-visible:underline">
                        {hero.nameKo}
                      </button>
                    ) : (
                      <span className="font-bold text-white">{hero.nameKo}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5"><div className="flex items-center justify-center">{row.tier}</div></td>
                {showRole && <td className="px-3 py-2.5 text-center"><Position position={hero.role} large /></td>}
                <td className={`px-2 py-2.5 text-center font-bold ${row.winRate === undefined ? "text-white" : row.winRate >= 50 ? "text-emerald-200" : "text-rose-200"}`}>{row.win}</td>
                <td className="px-3 py-2.5 text-center text-base text-cyan-100">{row.pick}</td>
                <td className="px-3 py-2.5 text-center text-base text-red-100">{row.ban}</td>
                {showGames && <td className="px-3 py-2.5 text-center text-gray-100">{row.games}</td>}
                <td className="px-3 py-2.5 text-center font-bold text-white">{row.score}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
