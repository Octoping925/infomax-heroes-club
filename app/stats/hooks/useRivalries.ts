import type { RivalryListResponse } from "@/app/api/stats/types";
import { statsQueryKeys, type RivalryParams } from "@/config/query-keys";
import { SITE_URL } from "@/config/url";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useRivalries(params: RivalryParams) {
  const { data, error } = useSuspenseQuery<RivalryListResponse>({
    queryKey: statsQueryKeys.stats.rivalries(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        minMatches: String(params.minMatches),
        limit: String(params.limit),
        takeMatches: String(params.takeMatches),
        includeInsufficientSample: String(params.includeInsufficientSample),
      });
      const response = await fetch(
        `${SITE_URL}/api/stats/rivalries?${searchParams.toString()}`
      );
      if (!response.ok) {
        throw new Error("라이벌리 데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as RivalryListResponse;
    },
  });

  return { data, error };
}
