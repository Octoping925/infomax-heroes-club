import { PlayerAverageStatsResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { buildStatsUrl } from "../utils/build-stats-url";
import { useStatsYear } from "./useStatsYearFilter";

export function usePlayerAverageStats() {
  const { selectedYear } = useStatsYear();
  const year = selectedYear ?? undefined;
  const { data, error } = useSuspenseQuery<PlayerAverageStatsResponse[]>({
    queryKey: statsQueryKeys.stats.rankings.avgStats(year),
    queryFn: async () => {
      const response = await fetch(buildStatsUrl("/api/stats/rankings/avg-stats", { year }));
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as PlayerAverageStatsResponse[];
    },
  });

  return { data, error };
}
