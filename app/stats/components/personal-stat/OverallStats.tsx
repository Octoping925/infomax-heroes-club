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
      <WinRateSummary title="내전 승률" stats={selectedPlayerStat.matchStats} />
      <WinRateSummary title="경기 승률" stats={selectedPlayerStat.gameStats} />
      <AverageStatsSummary title="평균 스탯" stats={selectedPlayerKda} />
    </div>
  );
}

function WinRateSummary({
  title,
  stats,
}: {
  readonly title: string;
  readonly stats: WinRateStats;
}) {
  return (
    <div className="w-full rounded-xl border border-white/10 bg-white/3 p-5">
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
}

function AverageStatsSummary({ title, stats }: AverageStatsSummaryProps) {
  return (
    <div className="w-full rounded-xl border border-white/10 bg-white/3 p-5">
      <h4 className="text-sm font-semibold text-gray-300">{title}</h4>
      <p className="text-3xl font-bold text-white mt-3">
        {round(stats.averageKills, 1)} / {round(stats.averageDeaths, 1)} / {round(stats.averageTakedowns, 1)}
      </p>
      <p className="text-md text-gray-400 mt-3">평균 딜량: {commarize(Math.floor(stats.averageHeroDamage))}</p>
    </div>
  );
}
