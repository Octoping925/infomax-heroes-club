"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
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

type LunchDinnerUnit = "game" | "match";

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
export function LunchDinnerWinRateChart() {
  const [gameData, setGameData] = useState<ChartData[]>([]);
  const [matchData, setMatchData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gameError, setGameError] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  const fetchUnitData = useCallback(
    async (input: { readonly unit: LunchDinnerUnit }): Promise<ChartData[]> => {
      const response = await fetch(
        `/api/stats/players/lunch-dinner?unit=${input.unit}`
      );
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
    },
    []
  );

  const fetchAllData = useCallback(async (): Promise<void> => {
    // NOTE: setState를 useEffect 본문에서 "동기적으로" 호출하는 것을 피하기 위해
    // 1 tick 이후에 상태를 갱신합니다.
    await Promise.resolve();

    setIsLoading(true);
    setGameError(null);
    setMatchError(null);

    const [gameResult, matchResult] = await Promise.allSettled([
      fetchUnitData({ unit: "game" }),
      fetchUnitData({ unit: "match" }),
    ]);

    if (gameResult.status === "fulfilled") {
      setGameData(gameResult.value);
    } else {
      setGameData([]);
      setGameError(
        gameResult.reason instanceof Error
          ? gameResult.reason.message
          : "오류가 발생했습니다."
      );
    }

    if (matchResult.status === "fulfilled") {
      setMatchData(matchResult.value);
    } else {
      setMatchData([]);
      setMatchError(
        matchResult.reason instanceof Error
          ? matchResult.reason.message
          : "오류가 발생했습니다."
      );
    }

    setIsLoading(false);
  }, [fetchUnitData]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchAllData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchAllData]);

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
