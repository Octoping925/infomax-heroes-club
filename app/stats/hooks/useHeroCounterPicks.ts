import { HeroCounterPickResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { buildStatsUrl } from "../utils/build-stats-url";
import { useStatsYear } from "./useStatsYearFilter";

export function useHeroCounterPicks() {
  const { selectedYear } = useStatsYear();
  const year = selectedYear ?? undefined;
  const { data, isPending, error } = useSuspenseQuery<HeroCounterPickResponse[]>({
    queryKey: statsQueryKeys.stats.heroes.counterPicks(year),
    queryFn: async () => {
      const response = await fetch(buildStatsUrl("/api/stats/heroes/counter-picks", { year }));
      if (!response.ok) {
        throw new Error("카운터픽 데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as HeroCounterPickResponse[];
    },
  });

  return { data, isPending, error };
}
