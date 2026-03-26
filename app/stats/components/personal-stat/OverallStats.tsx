import { WinRateStats } from "@/app/api/stats/types";
import { useOverallWinRate } from "../../hooks/useOverallWinRate";
import { usePlayerAverageStats } from "../../hooks/usePlayerAverageStats";
import { commarize } from "@/utils/commarize";
import { round } from "es-toolkit";
import { formatStatsYear, useStatsYear } from "../../hooks/useStatsYearFilter";

type Props = {
  readonly playerId: string;
};

export function OverallStats({ playerId }: Props) {
  const { data: overallData, error } = useOverallWinRate();
  const { data: kdaData } = usePlayerAverageStats();
  const { selectedYear } = useStatsYear();

  const selectedPlayerStat = overallData.find((stat) => stat.playerId === playerId);
  const selectedPlayerKda = kdaData.find((stat) => stat.playerId === playerId);

  if (error) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-red-400">❌ {error.message}</p>
      </div>
    );
  }

  if (!selectedPlayerStat || !selectedPlayerKda) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-400">{formatStatsYear(selectedYear)} 개인 통계 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <WinRateSummary
        title="내전 승률"
        stats={selectedPlayerStat.matchStats}
        accent="from-cyan-500/30 to-cyan-700/20"
      />
      <WinRateSummary
        title="경기 승률"
        stats={selectedPlayerStat.gameStats}
        accent="from-purple-500/30 to-purple-700/20"
      />
      <AverageStatsSummary title="평균 스탯" stats={selectedPlayerKda} accent="from-blue-500/30 to-blue-700/20" />
    </div>
  );
}

function WinRateSummary({
  title,
  stats,
  accent,
}: {
  readonly title: string;
  readonly stats: WinRateStats;
  readonly accent: string;
}) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-linear-to-br ${accent} p-4 w-full`}>
      <h4 className="text-sm font-semibold text-gray-300">{title}</h4>
      <p className="text-3xl font-bold text-white mt-3">
        {stats.winRate}%<span className="text-sm text-gray-300 ml-2">({stats.totalGames}경기)</span>
      </p>
      <p className="text-md text-gray-400 mt-3">
        {stats.wins}승 {stats.losses}패 {stats.draws}무
      </p>
    </div>
  );
}

interface AverageStatsSummaryProps {
  title: string;
  stats: {
    playerId: string;
    playerName: string;
    playerNickname: string;
    totalGames: number;
    averageKills: number;
    averageDeaths: number;
    averageTakedowns: number;
    averageHeroDamage: number;
    averageDamageTaken: number;
  };
  accent: string;
}

function AverageStatsSummary({ title, stats, accent }: AverageStatsSummaryProps) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-linear-to-br ${accent} p-4 w-full`}>
      <h4 className="text-sm font-semibold text-gray-300">{title}</h4>
      <p className="text-3xl font-bold text-white mt-3">
        {round(stats.averageKills, 1)} / {round(stats.averageDeaths, 1)} / {round(stats.averageTakedowns, 1)}
      </p>
      <p className="text-md text-gray-400 mt-3">평균 딜량: {commarize(Math.floor(stats.averageHeroDamage))}</p>
    </div>
  );
}
