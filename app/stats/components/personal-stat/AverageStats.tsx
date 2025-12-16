import { Loading } from "@/components/Loading";
import { usePlayerAverageStats } from "../../hooks/usePlayerAverageStats";

interface Props {
  readonly playerId: string;
}

export function AverageStats({ playerId }: Props) {
  const { data, isPending, error } = usePlayerAverageStats();

  if (isPending || !data) {
    return <Loading />;
  }

  if (error) {
    return <p className="text-red-400">❌ {error.message}</p>;
  }

  const playerStat = data.find((stat) => stat.playerId === playerId);

  if (!playerStat) {
    return <p className="text-red-400">플레이어 정보를 찾을 수 없습니다.</p>;
  }

  //   const avgKillsData = [...data]
  //     .sort((a, b) => b.averageKills - a.averageKills)
  //     .slice(0, 20)
  //     .map((item) => ({
  //       name: item.playerNickname,
  //       value: item.averageKills,
  //       totalGames: item.totalGames,
  //     }));

  //   const avgDeathsData = [...data]
  //     .sort((a, b) => b.averageDeaths - a.averageDeaths)
  //     .slice(0, 20)
  //     .map((item) => ({
  //       name: item.playerNickname,
  //       value: item.averageDeaths,
  //       totalGames: item.totalGames,
  //     }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          평균 킬
        </h3>
        <p className="text-sm text-gray-400">{playerStat.averageKills}</p>
      </div>
    </div>
  );
}
