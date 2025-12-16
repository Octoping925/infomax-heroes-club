"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PlayerWinRateResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";

type ChartData = {
  name: string;
  winRate: number;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
};

/**
 * 플레이어별 내전(match) 총 승률(매치 단위) 랭킹 차트
 */
export function MatchWinRateRankingChart() {
  const { data, isPending, error } = useQuery<PlayerWinRateResponse[]>({
    queryKey: statsQueryKeys.stats.players.matchWinRate(),
    queryFn: async () => {
      const response = await fetch("/api/stats/players/match-win-rate");
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as PlayerWinRateResponse[];
    },
  });

  const chartData = useMemo<ChartData[]>(() => {
    if (!data) {
      return [];
    }
    return [...data]
      .sort((a, b) => b.winRate - a.winRate || b.totalGames - a.totalGames)
      .slice(0, 30)
      .map((item) => ({
        name: item.playerNickname,
        winRate: item.winRate,
        totalMatches: item.totalGames,
        wins: item.wins,
        losses: item.losses,
        draws: item.draws,
      }));
  }, [data]);

  if (isPending) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          로딩 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-red-400">❌ {error.message}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-500">데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-gray-400">
        <span className="text-white">매치 1건을 1경기</span>로 보고 계산한
        승률입니다. (game 승률 아님)
      </p>

      <div
        style={{ width: "100%", height: Math.max(420, chartData.length * 34) }}
      >
        <ResponsiveContainer>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis type="number" domain={[0, 100]} stroke="#888" unit="%" />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              stroke="#888"
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a2e",
                border: "1px solid #333",
                borderRadius: 8,
              }}
              formatter={(value: number, _key: string, ctx) => {
                const payload = ctx?.payload as ChartData | undefined;
                const details = payload
                  ? `${payload.wins}승 ${payload.losses}패 ${payload.draws}무 / ${payload.totalMatches}매치`
                  : "";
                return [`${value}% (${details})`, "승률"];
              }}
            />
            <Legend />
            <Bar dataKey="winRate" name="승률" fill="#22c55e">
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.winRate >= 50 ? "#22c55e" : "#ef4444"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
