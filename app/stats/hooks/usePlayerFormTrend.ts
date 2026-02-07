import { PlayerFormTrendResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";
import { SITE_URL } from "@/config/url";
import { useSuspenseQuery } from "@tanstack/react-query";

export function usePlayerFormTrend(nickname: string, take = 20) {
  const { data, error } = useSuspenseQuery<PlayerFormTrendResponse>({
    queryKey: statsQueryKeys.stats.players.formTrend(nickname, take),
    queryFn: async () => {
      const response = await fetch(`${SITE_URL}/api/stats/players/${encodeURIComponent(nickname)}/form?take=${take}`);

      if (response.ok) return (await response.json()) as PlayerFormTrendResponse;

      if (response.status === 404) {
        throw new Error("플레이어를 찾을 수 없습니다.");
      }

      throw new Error("폼 그래프 데이터를 불러오는데 실패했습니다.");
    },
  });

  return { data, error };
}
