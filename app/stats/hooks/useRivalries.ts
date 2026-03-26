import type { RivalryListResponse } from "@/app/api/stats/types";
import { statsQueryKeys, type RivalryParams } from "@/config/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { buildStatsUrl } from "../utils/build-stats-url";
import { useStatsYear } from "./useStatsYearFilter";

export function useRivalries(params: RivalryParams) {
  const { selectedYear } = useStatsYear();
  const queryParams = {
    ...params,
    year: selectedYear ?? undefined,
  };

  const { data, error } = useSuspenseQuery<RivalryListResponse>({
    queryKey: statsQueryKeys.stats.rivalries(queryParams),
    queryFn: async () => {
      const response = await fetch(buildStatsUrl("/api/stats/rivalries", queryParams));
      if (!response.ok) {
        throw new Error("라이벌리 데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as RivalryListResponse;
    },
  });

  return { data, error };
}
