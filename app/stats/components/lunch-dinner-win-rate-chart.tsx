"use client";

import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PlayerLunchDinnerWinRateResponse } from "@/app/api/stats/types";
import { type LunchDinnerUnit, statsQueryKeys } from "@/config/query-keys";

type ChartData = {
  name: string;
  lunchWinRate: number;
  dinnerWinRate: number;
  lunchCount: number;
  dinnerCount: number;
};

/**
 * 플레이어별 점심/저녁 내전 승률 차트 (게임/매치 단위 동시 표시)
 */
async function fetchUnitData(unit: LunchDinnerUnit): Promise<ChartData[]> {
  const response = await fetch(`/api/stats/players/lunch-dinner?unit=${unit}`);
  if (!response.ok) {
    throw new Error("데이터를 불러오는데 실패했습니다.");
  }

  const result: PlayerLunchDinnerWinRateResponse[] = await response.json();
  return result
    .filter(
      (item) =>
        item.lunchStats.totalGames > 0 || item.dinnerStats.totalGames > 0
    )
    .map((item) => ({
      name: item.playerNickname,
      lunchWinRate: item.lunchStats.winRate,
      dinnerWinRate: item.dinnerStats.winRate,
      lunchCount: item.lunchStats.totalGames,
      dinnerCount: item.dinnerStats.totalGames,
    }));
}

export function LunchDinnerWinRateChart() {
  const matchQuery = useQuery<ChartData[]>({
    queryKey: statsQueryKeys.stats.players.lunchDinner("match"),
    queryFn: () => fetchUnitData("match"),
  });
  const gameQuery = useQuery<ChartData[]>({
    queryKey: statsQueryKeys.stats.players.lunchDinner("game"),
    queryFn: () => fetchUnitData("game"),
  });

  const isLoading = matchQuery.isPending || gameQuery.isPending;
  const gameData = gameQuery.data ?? [];
  const matchData = matchQuery.data ?? [];
  const gameError = gameQuery.error ? gameQuery.error.message : null;
  const matchError = matchQuery.error ? matchQuery.error.message : null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          로딩 중...
        </div>
      </div>
    );
  }

  if (gameData.length === 0 && matchData.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-500">
          {gameError ?? matchError ?? "데이터가 없습니다."}
        </p>
      </div>
    );
  }

  const renderChart = (input: {
    readonly title: string;
    readonly unitLabel: string;
    readonly data: ChartData[];
    readonly error: string | null;
  }): ReactElement => {
    if (input.error) {
      return (
        <div className="rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-3">
          <p className="text-sm text-red-300">
            {input.title}: {input.error}
          </p>
        </div>
      );
    }

    if (input.data.length === 0) {
      return (
        <div className="rounded-lg border border-gray-800 bg-gray-950/30 px-4 py-10 text-center">
          <p className="text-gray-500">{input.title}: 데이터가 없습니다.</p>
        </div>
      );
    }

    return (
      <div
        style={{ width: "100%", height: Math.max(420, input.data.length * 36) }}
      >
        <ResponsiveContainer>
          <BarChart data={input.data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis type="number" domain={[0, 100]} stroke="#888" unit="%" />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              stroke="#888"
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a2e",
                border: "1px solid #333",
                borderRadius: 8,
              }}
              formatter={(value: number, key: string, ctx) => {
                const payload = ctx?.payload as ChartData | undefined;
                const label =
                  key === "lunchWinRate" ? "점심 승률" : "저녁 승률";
                const count =
                  key === "lunchWinRate"
                    ? payload?.lunchCount ?? 0
                    : payload?.dinnerCount ?? 0;
                return [`${value}% (${count}${input.unitLabel})`, label];
              }}
            />
            <Legend
              formatter={(value) =>
                value === "lunchWinRate" ? "점심" : "저녁"
              }
            />
            <Bar dataKey="lunchWinRate" name="lunchWinRate" fill="#00d4ff" />
            <Bar dataKey="dinnerWinRate" name="dinnerWinRate" fill="#7b2ff7" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-gray-400">
          점심/저녁 내전 승률을 <span className="text-white">게임 단위</span>와{" "}
          <span className="text-white">매치 단위</span>로 함께 비교합니다.
        </p>
      </div>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">매치 단위</h3>
          <span className="text-xs text-gray-500">1 match = 1내전</span>
        </div>
        {renderChart({
          title: "매치 단위",
          unitLabel: "매치",
          data: matchData,
          error: matchError,
        })}
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">게임 단위</h3>
          <span className="text-xs text-gray-500">1 game = 1경기</span>
        </div>
        {renderChart({
          title: "게임 단위",
          unitLabel: "게임",
          data: gameData,
          error: gameError,
        })}
      </section>
    </div>
  );
}
