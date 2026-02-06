import { HeroCounterPickResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useHeroCounterPicks() {
  const { data, isPending, error } = useSuspenseQuery<HeroCounterPickResponse[]>({
    queryKey: statsQueryKeys.stats.heroes.counterPicks(),
    queryFn: async () => {
      const response = await fetch("/api/stats/heroes/counter-picks");
      if (!response.ok) {
        throw new Error("카운터픽 데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as HeroCounterPickResponse[];
    },
  });

  return { data, isPending, error };
}
