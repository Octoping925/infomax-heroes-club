import {
  PlayerCombinedWinRateResponse,
  PlayerLunchDinnerWinRateResponse,
} from "@/app/api/stats/types";
import { LunchDinnerUnit } from "@/app/api/stats/utils/lunch-dinner";
import { statsQueryKeys } from "@/config/query-keys";
import { useSuspenseQueries } from "@tanstack/react-query";

async function fetchOverallWinRate() {
  const response = await fetch("/api/stats/players/overall-win-rate");
  if (!response.ok) {
    throw new Error("승률 데이터를 불러오는데 실패했습니다.");
  }
  return (await response.json()) as PlayerCombinedWinRateResponse[];
}

async function fetchLunchDinnerWinRate(unit: LunchDinnerUnit) {
  const response = await fetch(`/api/stats/players/lunch-dinner?unit=${unit}`);
  if (!response.ok) {
    throw new Error("데이터를 불러오는데 실패했습니다.");
  }
  return (await response.json()) as PlayerLunchDinnerWinRateResponse[];
}

export function usePlayerCombinedWinRate() {
  const [{ data: overallData }, { data: matchData }, { data: gameData }] =
    useSuspenseQueries({
      queries: [
        {
          queryKey: statsQueryKeys.stats.players.overallWinRate(),
          queryFn: fetchOverallWinRate,
        },
        {
          queryKey: statsQueryKeys.stats.players.lunchDinner("match"),
          queryFn: () => fetchLunchDinnerWinRate("match"),
        },
        {
          queryKey: statsQueryKeys.stats.players.lunchDinner("game"),
          queryFn: () => fetchLunchDinnerWinRate("game"),
        },
      ],
    });

  return { overallData, matchData, gameData };
}
