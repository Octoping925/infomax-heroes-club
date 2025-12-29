import { PlayerLunchDinnerWinRateResponse } from "@/app/api/stats/types";
import { LunchDinnerUnit } from "@/app/api/stats/utils/lunch-dinner";
import { statsQueryKeys } from "@/config/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";

async function fetchUnitData(unit: LunchDinnerUnit) {
  const response = await fetch(`/api/stats/players/lunch-dinner?unit=${unit}`);
  if (!response.ok) {
    throw new Error("데이터를 불러오는데 실패했습니다.");
  }

  const result: PlayerLunchDinnerWinRateResponse[] = await response.json();
  return result;
}

/**
 * 플레이어별 점심/저녁 내전 승률 (게임/내전 단위 동시 표시)
 */
export function useLunchDinnerWinRate() {
  const { data: matchData } = useSuspenseQuery({
    queryKey: statsQueryKeys.stats.players.lunchDinner("match"),
    queryFn: () => fetchUnitData("match"),
  });

  const { data: gameData } = useSuspenseQuery({
    queryKey: statsQueryKeys.stats.players.lunchDinner("game"),
    queryFn: () => fetchUnitData("game"),
  });

  return { matchData, gameData };
}
