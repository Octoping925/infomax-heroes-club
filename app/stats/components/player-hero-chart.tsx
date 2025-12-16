"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { PlayerHeroWinRateResponse } from "@/app/api/stats/types";
import { HeroMap } from "@/domain/hots/constants/hero";
import { Hero } from "@/generated/prisma/client";
import { statsQueryKeys } from "@/config/query-keys";

type Props = {
  nickname: string;
};

type ChartData = {
  name: string;
  totalGames: number;
  winRate: number;
  wins: number;
  losses: number;
};

/**
 * 플레이어별 영웅 승률 차트
 */
export function PlayerHeroChart({ nickname }: Props) {
  const { data, isPending, error } = useQuery<PlayerHeroWinRateResponse>({
    queryKey: statsQueryKeys.stats.players.heroStats(nickname),
    queryFn: async () => {
      const response = await fetch(
        `/api/stats/players/${encodeURIComponent(nickname)}/heroes`
      );
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("플레이어를 찾을 수 없습니다.");
        }
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as PlayerHeroWinRateResponse;
    },
    enabled: Boolean(nickname),
  });

  const chartData = useMemo<ChartData[]>(() => {
    if (!data) {
      return [];
    }
    return data.heroStats.map((stat) => ({
      name: HeroMap[stat.hero as Hero] || stat.hero,
      totalGames: stat.totalGames,
      winRate: stat.winRate,
      wins: stat.wins,
      losses: stat.losses,
    }));
  }, [data]);

  const playerInfo = data
    ? { name: data.playerName, nickname: data.playerNickname }
    : null;

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
        <p className="text-gray-500">경기 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {playerInfo && (
        <p className="text-gray-400">
          <span className="text-white font-medium">{playerInfo.name}</span> (
          {playerInfo.nickname})님의 영웅별 통계
        </p>
      )}

      {/* 경기 수 차트 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          영웅별 경기 수
        </h3>
        <div
          style={{
            width: "100%",
            height: Math.max(300, chartData.length * 35),
          }}
        >
          <ResponsiveContainer>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" stroke="#888" />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                stroke="#888"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a2e",
                  border: "1px solid #333",
                  borderRadius: 8,
                }}
                formatter={(value: number) => [`${value}경기`, "경기 수"]}
              />
              <Bar dataKey="totalGames" name="경기 수" fill="#7b2ff7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 승률 차트 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          영웅별 승률
        </h3>
        <div
          style={{
            width: "100%",
            height: Math.max(300, chartData.length * 35),
          }}
        >
          <ResponsiveContainer>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" domain={[0, 100]} stroke="#888" unit="%" />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                stroke="#888"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a2e",
                  border: "1px solid #333",
                  borderRadius: 8,
                }}
                formatter={(value: number) => [`${value}%`, "승률"]}
              />
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
    </div>
  );
}
