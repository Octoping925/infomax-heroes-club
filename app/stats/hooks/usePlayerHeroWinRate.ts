import { PlayerHeroWinRateResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";
import { SITE_URL } from "@/config/url";
import { useSuspenseQuery } from "@tanstack/react-query";

export function usePlayerHeroWinRate(nickname: string) {
  const { data, error } = useSuspenseQuery<PlayerHeroWinRateResponse>({
    queryKey: statsQueryKeys.stats.players.heroStats(nickname),
    queryFn: async () => {
      const response = await fetch(`${SITE_URL}/api/stats/players/${encodeURIComponent(nickname)}/heroes`);

      if (response.ok) return (await response.json()) as PlayerHeroWinRateResponse;

      if (response.status === 404) {
        throw new Error("플레이어를 찾을 수 없습니다.");
      }

      throw new Error("데이터를 불러오는데 실패했습니다.");
    },
  });

  return { data, error };
}
