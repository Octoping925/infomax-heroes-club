import { WinRateStats } from "@/app/api/stats/types";
import { useOverallWinRate } from "../../hooks/useOverallWinRate";

type Props = {
  readonly playerId: string;
};

export function OverallStats({ playerId }: Props) {
  const { data, isPending, error } = useOverallWinRate();
  const selectedPlayerStat = data?.find((stat) => stat.playerId === playerId);

  if (isPending) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          로딩 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-red-400">❌ {error.message}</p>
      </div>
    );
  }

  if (!selectedPlayerStat) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-red-400">플레이어 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <WinRateSummary
        title="매치 승률"
        stats={selectedPlayerStat.matchStats}
        accent="from-cyan-500/30 to-cyan-700/20"
      />
      <WinRateSummary
        title="게임 승률"
        stats={selectedPlayerStat.gameStats}
        accent="from-purple-500/30 to-purple-700/20"
      />
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
    <div
      className={`rounded-2xl border border-white/10 bg-gradient-to-br ${accent} p-4 w-full`}
    >
      <h4 className="text-sm font-semibold text-gray-300">{title}</h4>
      <p className="text-3xl font-bold text-white mt-3">
        {stats.winRate}%
        <span className="text-sm text-gray-300 ml-2">
          ({stats.totalGames}경기)
        </span>
      </p>
      <p className="text-md text-gray-400 mt-3">
        {stats.wins}승 {stats.losses}패 {stats.draws}무
      </p>
    </div>
  );
}
