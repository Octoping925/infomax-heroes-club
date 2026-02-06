import { HeroTierResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useHeroPopularity() {
  const { data, isPending, error } = useSuspenseQuery<HeroTierResponse[]>({
    queryKey: statsQueryKeys.stats.heroes.tier(),
    queryFn: async () => {
      const response = await fetch("/api/stats/heroes/popular");
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as HeroTierResponse[];
    },
  });

  return { data, isPending, error };
}
