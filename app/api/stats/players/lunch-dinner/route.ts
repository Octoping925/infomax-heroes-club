import { NextResponse } from "next/server";
import { PlayerLunchDinnerWinRateResponse } from "@/app/api/stats/types";
import {
  fetchPlayerLunchDinnerWinRate,
  parseLunchDinnerUnit,
} from "@/app/api/stats/utils/lunch-dinner";

/**
 * 플레이어별 점심/저녁 내전 승률 조회
 * GET /api/stats/players/lunch-dinner?unit=game|match
 */
export async function GET(request: Request): Promise<
  NextResponse<PlayerLunchDinnerWinRateResponse[]>
> {
  const url = new URL(request.url);
  const unit = parseLunchDinnerUnit(url.searchParams.get("unit"));

  const response: PlayerLunchDinnerWinRateResponse[] =
    await fetchPlayerLunchDinnerWinRate({ unit });

  response.sort(
    (a, b) =>
      b.lunchStats.totalGames +
      b.dinnerStats.totalGames -
      (a.lunchStats.totalGames + a.dinnerStats.totalGames)
  );

  return NextResponse.json(response);
}
