import { PlayerCombinedWinRateResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";
import { useQuery } from "@tanstack/react-query";

export function useOverallWinRate() {
  const {
    data = [],
    isPending,
    error,
  } = useQuery<PlayerCombinedWinRateResponse[]>({
    queryKey: statsQueryKeys.stats.players.overallWinRate(),
    queryFn: async () => {
      const response = await fetch("/api/stats/players/overall-win-rate");
      if (!response.ok) {
        throw new Error("승률 데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as PlayerCombinedWinRateResponse[];
    },
  });

  return { data, isPending, error };
}
