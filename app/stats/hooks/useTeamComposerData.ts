import type { TeamComposerResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { buildStatsUrl } from "../utils/build-stats-url";
import { useStatsYear } from "./useStatsYearFilter";

export function useTeamComposerData() {
  const { selectedYear } = useStatsYear();
  const year = selectedYear ?? undefined;
  const { data, error } = useSuspenseQuery<TeamComposerResponse>({
    queryKey: statsQueryKeys.stats.teamComposer(year),
    queryFn: async () => {
      const response = await fetch(buildStatsUrl("/api/stats/team-composer", { year }));
      if (!response.ok) {
        throw new Error("팀 편성 도우미 데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as TeamComposerResponse;
    },
  });

  return { data, error };
}
