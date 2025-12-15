"use client";

import { useEffect, useMemo, useState } from "react";
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
import { PlayerAverageKillsDeathsResponse } from "@/app/api/stats/types";

type ChartData = {
  name: string;
  value: number;
  totalGames: number;
};

/**
 * 평균 킬/데스 랭킹 차트
 */
export function AvgKillsDeathsRankingChart() {
  const [data, setData] = useState<PlayerAverageKillsDeathsResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stats/rankings/avg-kills-deaths");
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result: PlayerAverageKillsDeathsResponse[] = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const avgKillsData = useMemo<ChartData[]>(() => {
    return [...data]
      .sort((a, b) => b.averageKills - a.averageKills)
      .slice(0, 20)
      .map((item) => ({
        name: item.playerNickname,
        value: item.averageKills,
        totalGames: item.totalGames,
      }));
  }, [data]);

  const avgDeathsData = useMemo<ChartData[]>(() => {
    return [...data]
      .sort((a, b) => b.averageDeaths - a.averageDeaths)
      .slice(0, 20)
      .map((item) => ({
        name: item.playerNickname,
        value: item.averageDeaths,
        totalGames: item.totalGames,
      }));
  }, [data]);

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

  if (error) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-red-400">❌ {error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-500">데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <p className="text-gray-400">
        플레이어의 <span className="text-white">게임 단위</span> 평균 킬/데스를
        비교합니다.
      </p>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          평균 킬 TOP 20
        </h3>
        <div style={{ width: "100%", height: Math.max(420, avgKillsData.length * 34) }}>
          <ResponsiveContainer>
            <BarChart data={avgKillsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" stroke="#888" />
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
                  return [`${value} (총 ${payload?.totalGames ?? 0}게임)`, "평균 킬"];
                }}
              />
              <Legend />
              <Bar dataKey="value" name="평균 킬" fill="#00d4ff" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          평균 데스 TOP 20
        </h3>
        <div style={{ width: "100%", height: Math.max(420, avgDeathsData.length * 34) }}>
          <ResponsiveContainer>
            <BarChart data={avgDeathsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" stroke="#888" />
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
                  return [`${value} (총 ${payload?.totalGames ?? 0}게임)`, "평균 데스"];
                }}
              />
              <Legend />
              <Bar dataKey="value" name="평균 데스" fill="#ff3d00" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}


