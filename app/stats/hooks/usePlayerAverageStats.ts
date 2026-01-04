import { PlayerAverageStatsResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";
import { SITE_URL } from "@/config/url";
import { useSuspenseQuery } from "@tanstack/react-query";

export function usePlayerAverageStats() {
  const { data, error } = useSuspenseQuery<PlayerAverageStatsResponse[]>({
    queryKey: statsQueryKeys.stats.rankings.avgStats(),
    queryFn: async () => {
      const response = await fetch(`${SITE_URL}/api/stats/rankings/avg-stats`);
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as PlayerAverageStatsResponse[];
    },
  });

  return { data, error };
}
