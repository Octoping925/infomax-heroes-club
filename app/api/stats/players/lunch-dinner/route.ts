import { NextResponse } from "next/server";
import { PlayerLunchDinnerWinRateResponse } from "@/app/api/stats/types";
import { fetchPlayerLunchDinnerWinRate, parseLunchDinnerUnit } from "@/app/api/stats/utils/lunch-dinner";
import { parseYearParam } from "@/app/api/stats/utils/query";

/**
 * 플레이어별 점심/저녁 내전 승률 조회
 * GET /api/stats/players/lunch-dinner?unit=game|match
 */
export async function GET(request: Request): Promise<NextResponse<PlayerLunchDinnerWinRateResponse[]>> {
  const url = new URL(request.url);
  const unit = parseLunchDinnerUnit(url.searchParams.get("unit"));
  const year = parseYearParam(url.searchParams.get("year"));

  const response = await fetchPlayerLunchDinnerWinRate(unit, year);

  return NextResponse.json(
    response.toSorted(
      (a, b) =>
        b.lunchStats.totalGames + b.dinnerStats.totalGames - (a.lunchStats.totalGames + a.dinnerStats.totalGames),
    ),
  );
}
