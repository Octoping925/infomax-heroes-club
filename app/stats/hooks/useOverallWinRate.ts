import { PlayerCombinedWinRateResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { buildStatsUrl } from "../utils/build-stats-url";
import { useStatsYear } from "./useStatsYearFilter";

export function useOverallWinRate() {
  const { selectedYear } = useStatsYear();
  const year = selectedYear ?? undefined;
  const { data = [], error } = useSuspenseQuery<PlayerCombinedWinRateResponse[]>({
    queryKey: statsQueryKeys.stats.players.overallWinRate(year),
    queryFn: async () => {
      const response = await fetch(buildStatsUrl("/api/stats/players/overall-win-rate", { year }));
      if (!response.ok) {
        throw new Error("승률 데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as PlayerCombinedWinRateResponse[];
    },
  });

  return { data, error };
}
