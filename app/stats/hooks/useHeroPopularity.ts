import { HeroPopularityResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useHeroPopularity() {
  const { data, isPending, error } = useSuspenseQuery<HeroPopularityResponse[]>({
    queryKey: statsQueryKeys.stats.heroes.popular(),
    queryFn: async () => {
      const response = await fetch("/api/stats/heroes/popular");
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as HeroPopularityResponse[];
    },
  });

  return { data, isPending, error };
}
