import { NextResponse } from "next/server";
import { PlayerLunchDinnerWinRateResponse } from "@/app/api/stats/types";
import {
  fetchPlayerLunchDinnerWinRate,
  parseLunchDinnerUnit,
} from "@/app/api/stats/utils/lunch-dinner";

/**
 * 점심/저녁 승률 차이가 많이 나는 사람 순위
 * GET /api/stats/rankings/lunch-dinner-diff?unit=game|match
 */
export async function GET(request: Request): Promise<
  NextResponse<PlayerLunchDinnerWinRateResponse[]>
> {
  const url = new URL(request.url);
  const unit = parseLunchDinnerUnit(url.searchParams.get("unit"));

  const response: PlayerLunchDinnerWinRateResponse[] =
    await fetchPlayerLunchDinnerWinRate({ unit });

  // 양쪽(점심/저녁)에 최소 1경기(유닛 기준) 이상 있는 사람만 비교 대상으로 포함
  const filtered = response.filter(
    (item) => item.lunchStats.totalGames > 0 && item.dinnerStats.totalGames > 0
  );

  filtered.sort((a, b) => b.absWinRateDiff - a.absWinRateDiff);

  return NextResponse.json(filtered);
}
