import { MapHeroWinRateResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { buildStatsUrl } from "../utils/build-stats-url";
import { useStatsYear } from "./useStatsYearFilter";

export function useMapHeroWinRate() {
  const { selectedYear } = useStatsYear();
  const year = selectedYear ?? undefined;
  const { data, error } = useSuspenseQuery<MapHeroWinRateResponse[]>({
    queryKey: statsQueryKeys.stats.mapsHero(year),
    queryFn: async () => {
      const response = await fetch(buildStatsUrl("/api/stats/maps/hero", { year }));
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as MapHeroWinRateResponse[];
    },
  });

  return { data, error };
}
