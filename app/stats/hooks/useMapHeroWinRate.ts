import { MapHeroWinRateResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useMapHeroWinRate() {
  const { data, error } = useSuspenseQuery<MapHeroWinRateResponse[]>({
    queryKey: statsQueryKeys.stats.mapsHero(),
    queryFn: async () => {
      const response = await fetch("/api/stats/maps/hero");
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as MapHeroWinRateResponse[];
    },
  });

  return { data, error };
}


