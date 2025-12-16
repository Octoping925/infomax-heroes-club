import { PlayerAverageStatsResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";
import { useQuery } from "@tanstack/react-query";

export function usePlayerAverageStats() {
  const { data, isPending, error } = useQuery<PlayerAverageStatsResponse[]>({
    queryKey: statsQueryKeys.stats.rankings.avgStats(),
    queryFn: async () => {
      const response = await fetch("/api/stats/rankings/avg-stats");
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as PlayerAverageStatsResponse[];
    },
  });

  return { data, isPending, error };
}
