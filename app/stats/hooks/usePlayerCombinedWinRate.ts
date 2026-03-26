import { PlayerCombinedWinRateResponse, PlayerLunchDinnerWinRateResponse } from "@/app/api/stats/types";
import { LunchDinnerUnit } from "@/app/api/stats/utils/lunch-dinner";
import { statsQueryKeys } from "@/config/query-keys";
import { useSuspenseQueries } from "@tanstack/react-query";
import { buildStatsUrl } from "../utils/build-stats-url";
import { useStatsYear } from "./useStatsYearFilter";

async function fetchOverallWinRate(year: number | undefined) {
  const response = await fetch(buildStatsUrl("/api/stats/players/overall-win-rate", { year }));
  if (!response.ok) {
    throw new Error("승률 데이터를 불러오는데 실패했습니다.");
  }
  return (await response.json()) as PlayerCombinedWinRateResponse[];
}

async function fetchLunchDinnerWinRate(unit: LunchDinnerUnit, year: number | undefined) {
  const response = await fetch(buildStatsUrl("/api/stats/players/lunch-dinner", { unit, year }));
  if (!response.ok) {
    throw new Error("데이터를 불러오는데 실패했습니다.");
  }
  return (await response.json()) as PlayerLunchDinnerWinRateResponse[];
}

export function usePlayerCombinedWinRate() {
  const { selectedYear } = useStatsYear();
  const year = selectedYear ?? undefined;
  const [{ data: overallData }, { data: matchData }, { data: gameData }] = useSuspenseQueries({
    queries: [
      {
        queryKey: statsQueryKeys.stats.players.overallWinRate(year),
        queryFn: () => fetchOverallWinRate(year),
      },
      {
        queryKey: statsQueryKeys.stats.players.lunchDinner("match", year),
        queryFn: () => fetchLunchDinnerWinRate("match", year),
      },
      {
        queryKey: statsQueryKeys.stats.players.lunchDinner("game", year),
        queryFn: () => fetchLunchDinnerWinRate("game", year),
      },
    ],
  });

  return { overallData, matchData, gameData };
}
