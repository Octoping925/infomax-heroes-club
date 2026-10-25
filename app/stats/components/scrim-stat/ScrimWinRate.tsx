"use client";
import { WinRateStats } from "@/app/api/stats/types";
import { useOverallWinRate } from "../../hooks/useOverallWinRate";
import { TIER_RULES, useScrimWinRateTier } from "../../hooks/useScrimWinRateTier";
import { useMemo } from "react";
import { round } from "es-toolkit";

const TIER_BADGE_CLASS =
  "inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 lg:px-2.5 lg:py-1 lg:text-sm";

interface ScrimWinRateProps {
  readonly onPlayerRowClick: (playerId: string) => void;
}

/**
 * 선수 순위 패널. 점수순으로 정렬하고, 행 왼쪽의 랭크 레일로 랭크 구간 경계를 보여준다.
 */
export function ScrimWinRate({ onPlayerRowClick }: ScrimWinRateProps) {
  const { data } = useOverallWinRate();
  const getTier = useScrimWinRateTier();

  const stats = useMemo(() => {
    return data
      .map((row) => {
        const tier = getTier(row.matchStats, row.gameStats);
        return { ...row, tier };
      })
      .toSorted((a, b) => b.tier.score - a.tier.score);
  }, [data, getTier]);

  return (
    <section className="rounded-[14px] border border-white/10 bg-white/3 px-2 py-3 sm:px-4">
      <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
        <h3 className="text-base lg:text-lg font-bold text-white">선수 순위</h3>
        <p className="text-xs lg:text-sm text-gray-400">점수순 · {stats.length}명</p>
      </div>

      <table className="w-full text-sm lg:text-base">
        <thead className="text-xs lg:text-sm text-gray-400">
          <tr>
            <th className="w-1.5 p-0" aria-label="랭크 구간" />
            <th className="w-6 px-1 py-2 text-right font-medium sm:w-8 sm:px-2">#</th>
            <th className="px-1 py-2 text-left font-medium sm:px-2">선수</th>
            <th className="px-1 py-2 text-left font-medium sm:px-2 max-sm:hidden">랭크</th>
            <th className="px-1 py-2 text-right font-medium sm:px-2">점수</th>
            <th className="px-1 py-2 text-right font-medium sm:px-2">내전 승률</th>
            <th className="px-1 py-2 text-right font-medium sm:px-2">경기 승률</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {/* 랭크 구간마다 머리 행을 둬서, 비어 있는 구간까지 사다리 전체가 보이게 한다. */}
          {TIER_RULES.flatMap((rule, ruleIndex) => {
            const bandRows = stats.filter((row) => row.tier.tier.key === rule.key);
            const range = rule.min > 0 ? `${rule.min}점 이상` : `${TIER_RULES[ruleIndex - 1].min}점 미만`;

            return [
              <tr key={rule.key}>
                <td className={`p-0 ${rule.railClassName}`}>
                  <div className="w-1.5" />
                </td>
                <td colSpan={6} className="px-1 pb-1 pt-3 text-[11px] text-gray-400 sm:px-2 lg:text-sm">
                  {rule.label} · {range}
                  {bandRows.length === 0 && " · 아직 없음"}
                </td>
              </tr>,
              ...bandRows.map((row) => renderRow(row, stats.indexOf(row))),
            ];
          })}
        </tbody>
      </table>

      <TierLegend />
    </section>
  );

  function renderRow(row: (typeof stats)[number], index: number) {
    const { tier } = row;
    const badge = <span className={`${TIER_BADGE_CLASS} ${tier.tier.className}`}>{tier.tier.label}</span>;

    return (
      <tr
        key={row.playerId}
        className="cursor-pointer transition-colors hover:bg-white/5 [&>td:not(:first-child)]:border-t [&>td:not(:first-child)]:border-white/6"
        onClick={() => onPlayerRowClick(row.playerId)}
      >
        <td className={`p-0 ${tier.tier.railClassName}`}>
          {/* 빈 셀은 자동 표 레이아웃에서 폭 0으로 줄어들므로 고정 폭 요소를 넣는다. */}
          <div className="w-1.5" />
        </td>
        <td className="px-1 py-2.5 sm:px-2 text-right text-gray-400">{index + 1}</td>
        <td className="max-w-0 px-1 py-2.5 sm:px-2 sm:w-[34%]">
          {/* 키보드 접근용 버튼. 클릭은 행(tr)의 onClick으로 버블링된다. */}
          <button
            type="button"
            aria-label={`${row.playerName} 개인 통계 보기`}
            className="block whitespace-nowrap rounded-sm text-left font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            {row.playerName}
          </button>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 sm:hidden">{badge}</span>
            <span className="truncate text-xs lg:text-sm text-gray-400 max-sm:hidden">{row.playerNickname}</span>
          </div>
        </td>
        <td className="px-1 py-2.5 sm:px-2 max-sm:hidden">{badge}</td>
        <td className="whitespace-nowrap px-1 py-2.5 sm:px-2 text-right">
          <span className="font-semibold text-gray-100">{formatScore(tier.score)}</span>
          <span className="ml-0.5 text-xs lg:text-sm text-gray-400">점</span>
        </td>
        <td className="px-1 py-2.5 sm:px-2 text-right">
          <WinRateCell stats={row.matchStats} unit="회" />
        </td>
        <td className="px-1 py-2.5 sm:px-2 text-right">
          <WinRateCell stats={row.gameStats} unit="경기" />
        </td>
      </tr>
    );
  }
}

/**
 * 점수 계산 안내. 계산식은 conservative-win-rate.ts를 따르고, 랭크 구간 기준은 순위표의 구간 머리 행이 보여준다.
 */
function TierLegend() {
  return (
    <p className="mt-3 border-t border-white/6 px-1 pt-3 text-xs lg:text-sm text-gray-400">
      순위는 점수순입니다. 점수는 내전 승률을 경기 승률보다 두 배 무겁게 반영하고, 판수가 적을수록 낮게 잡아서 한두 판
      결과만으로 순위가 튀지 않게 했습니다.
    </p>
  );
}

function WinRateCell({ stats, unit }: { readonly stats: WinRateStats; readonly unit: "회" | "경기" }) {
  return (
    <div className="whitespace-nowrap">
      <div className="font-semibold text-gray-100">{formatRate(stats.winRate ?? 0)}%</div>
      <div className="text-xs lg:text-sm text-gray-400">
        <span className="max-sm:hidden">{formatRecord(stats)} · </span>
        {stats.totalGames}
        {unit}
      </div>
    </div>
  );
}

function formatRecord(stats: WinRateStats): string {
  const record = `${stats.wins}승 ${stats.losses}패`;
  return stats.draws > 0 ? `${record} ${stats.draws}무` : record;
}

function formatRate(rate: number): string {
  return String(round(rate, 1));
}

function formatScore(score: number): string {
  return String(round(score, 1));
}
