"use client";

import { useEffect, useState } from "react";
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
import { MapPlayerWinRateResponse } from "@/app/api/stats/types";
import { MAPS } from "@/domain/hots/constants/maps";
import { GameMap } from "@/generated/prisma/client";

type ChartData = {
  name: string;
  totalGames: number;
  winRate: number;
  wins: number;
  losses: number;
};

/**
 * 맵별 플레이어 승률 차트
 */
export function MapWinRateChart() {
  const [data, setData] = useState<MapPlayerWinRateResponse[]>([]);
  const [selectedMap, setSelectedMap] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stats/maps");
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result: MapPlayerWinRateResponse[] = await response.json();
      setData(result);

      if (result.length > 0 && !selectedMap) {
        setSelectedMap(result[0].map);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

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

  const selectedMapData = data.find((item) => item.map === selectedMap);

  const chartData: ChartData[] =
    selectedMapData?.playerStats.map((stat) => ({
      name: stat.playerNickname,
      totalGames: stat.totalGames,
      winRate: stat.winRate,
      wins: stat.wins,
      losses: stat.losses,
    })) || [];

  return (
    <div className="space-y-6">
      {/* 맵 선택 */}
      <div className="flex flex-col gap-2 max-w-xs">
        <label className="text-sm font-semibold text-gray-400">맵 선택</label>
        <select
          value={selectedMap}
          onChange={(e) => setSelectedMap(e.target.value)}
          className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
        >
          {data.map((item) => (
            <option
              key={item.map}
              value={item.map}
              className="bg-[#1a1a2e] text-white"
            >
              {MAPS[item.map as GameMap] || item.map}
            </option>
          ))}
        </select>
      </div>

      {chartData.length > 0 ? (
        <>
          {/* 승률 차트 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              {MAPS[selectedMap as GameMap]} - 플레이어별 승률
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
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="#888"
                    unit="%"
                  />
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
        </>
      ) : (
        <div className="flex justify-center py-12">
          <p className="text-gray-500">선택한 맵에 데이터가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
