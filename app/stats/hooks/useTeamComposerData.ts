import type { TeamComposerResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";
import { SITE_URL } from "@/config/url";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useTeamComposerData() {
  const { data, error } = useSuspenseQuery<TeamComposerResponse>({
    queryKey: statsQueryKeys.stats.teamComposer(),
    queryFn: async () => {
      const response = await fetch(`${SITE_URL}/api/stats/team-composer`);
      if (!response.ok) {
        throw new Error("팀 편성 도우미 데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as TeamComposerResponse;
    },
  });

  return { data, error };
}
