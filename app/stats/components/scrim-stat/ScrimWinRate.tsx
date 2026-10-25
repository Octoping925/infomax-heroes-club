"use client";
import { WinRateStats } from "@/app/api/stats/types";
import { useOverallWinRate } from "../../hooks/useOverallWinRate";
import { TIER_RULES, useScrimWinRateTier } from "../../hooks/useScrimWinRateTier";
import { useMemo } from "react";
import { round } from "es-toolkit";
import { Chip } from "@/components/Chip";

const TIER_BADGE_CLASS = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0";

interface ScrimWinRateProps {
  readonly onPlayerRowClick: (playerId: string) => void;
}

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
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-white/10 p-4 bg-black/20">
        <table className="min-w-full text-sm overflow-x-scroll">
          <thead className="bg-white/5 text-gray-300">
            <tr>
              <th className="px-4 py-3 text-left">플레이어</th>
              <th className="px-4 py-3 text-left">내전 승률</th>
              <th className="px-4 py-3 text-left max-md:hidden">내전 전적</th>
              <th className="px-4 py-3 text-left">경기 승률</th>
              <th className="px-4 py-3 text-left max-md:hidden">경기 전적</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((row) => {
              const { tier } = row;
              const tierScore = formatTierScore(tier.score);

              return (
                <tr
                  key={row.playerId}
                  className="border-t border-white/10 transition-colors hover:bg-white/6 cursor-pointer"
                  onClick={() => onPlayerRowClick(row.playerId)}
                >
                  <td className="px-4 py-2 font-medium text-white">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* 키보드 접근용 버튼. 클릭은 행(tr)의 onClick으로 버블링된다. */}
                      <button type="button" aria-label={`${row.playerName} 개인 통계 보기`} className="text-left">
                        {row.playerName}
                      </button>
                      <span className={`${TIER_BADGE_CLASS} ${tier.tier.className}`}>{tier.tier.label}</span>
                      <span className="text-[11px] font-semibold text-gray-300">{tierScore}</span>
                    </div>
                    <div className="text-xs text-gray-400">{row.playerNickname}</div>
                  </td>
                  <td className="px-4 py-2">
                    <WinRatePill stats={row.matchStats} unit="회" />
                  </td>
                  <td className="px-4 py-2 text-gray-300 max-md:hidden">{formatRecord(row.matchStats, "회")}</td>
                  <td className="px-4 py-2">
                    <WinRatePill stats={row.gameStats} unit="경기" accent="purple" />
                  </td>
                  <td className="px-4 py-2 text-gray-300 max-md:hidden">{formatRecord(row.gameStats, "경기")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TierLegend />
    </div>
  );
}

/**
 * 순위 기준 안내. 점수 계산식은 conservative-win-rate.ts, 랭크 구간은 TIER_RULES를 따른다.
 */
function TierLegend() {
  const bronzeUpperBound = TIER_RULES.at(-2)!.min;

  return (
    <div className="space-y-2 px-1 text-xs text-gray-400">
      <p>
        순위는 점수순입니다. 점수는 내전 승률을 경기 승률보다 두 배 무겁게 반영하고, 판수가 적을수록 낮게 잡아서 한두 판
        결과만으로 순위가 튀지 않게 했습니다.
      </p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1.5" aria-label="랭크 기준">
        {TIER_RULES.map((rule) => (
          <li key={rule.key} className="flex items-center gap-1.5">
            <span className={`${TIER_BADGE_CLASS} ${rule.className}`}>{rule.label}</span>
            <span>{rule.min > 0 ? `${rule.min}점 이상` : `${bronzeUpperBound}점 미만`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WinRatePill({
  stats,
  unit,
  accent = "cyan",
}: {
  readonly stats: WinRateStats;
  readonly unit: "회" | "경기";
  readonly accent?: "cyan" | "purple";
}) {
  const color = accent === "purple" ? "text-purple-300" : "text-cyan-300";
  const bgColor = accent === "purple" ? "bg-purple-500/10" : "bg-cyan-500/10";
  const borderColor = accent === "purple" ? "border-purple-500/30" : "border-cyan-500/30";

  // 전적 열이 숨겨지는 모바일에서도 표본 수가 보이도록 승률 옆에 붙인다. md 이상에선 전적 열이 대신한다.
  return (
    <span className="inline-flex flex-col items-start gap-1 whitespace-nowrap">
      <Chip
        className={`inline-flex items-center px-3 py-1 rounded-full font-semibold ${color} ${bgColor} ${borderColor} border`}
      >
        {stats.winRate ?? 0}%
      </Chip>
      <span className="text-xs text-gray-400 md:hidden">
        {stats.totalGames}
        {unit}
      </span>
    </span>
  );
}

function formatRecord(stats: WinRateStats, unit: "회" | "경기"): string {
  return `${stats.wins}승 ${stats.losses}패 ${stats.draws}무 (${stats.totalGames}${unit})`;
}

function formatTierScore(score: number): string {
  const normalized = round(score, 1);
  const display = Number.isInteger(normalized) ? normalized.toFixed(0) : normalized.toFixed(1);

  return `${display}점`;
}
