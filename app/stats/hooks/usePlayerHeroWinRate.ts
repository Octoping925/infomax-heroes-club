import { PlayerHeroWinRateResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { buildStatsUrl } from "../utils/build-stats-url";
import { useStatsYear } from "./useStatsYearFilter";

export function usePlayerHeroWinRate(nickname: string) {
  const { selectedYear } = useStatsYear();
  const year = selectedYear ?? undefined;
  const { data, error } = useSuspenseQuery<PlayerHeroWinRateResponse>({
    queryKey: statsQueryKeys.stats.players.heroStats(nickname, year),
    queryFn: async () => {
      const response = await fetch(buildStatsUrl(`/api/stats/players/${encodeURIComponent(nickname)}/heroes`, { year }));

      if (response.ok) return (await response.json()) as PlayerHeroWinRateResponse;

      if (response.status === 404) {
        throw new Error("플레이어를 찾을 수 없습니다.");
      }

      throw new Error("데이터를 불러오는데 실패했습니다.");
    },
  });

  return { data, error };
}
