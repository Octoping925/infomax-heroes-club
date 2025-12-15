"use client";

import { useEffect, useState, useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { HeroPopularityResponse } from "@/app/api/stats/types";
import { HeroMap } from "@/domain/hots/constants/hero";
import { Hero } from "@/generated/prisma/client";

type ChartData = {
  name: string;
  pickCount: number;
  banCount: number;
  pickWinRate: number;
};

/**
 * 영웅 픽/밴 통계 차트
 */
export function HeroPopularityChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch("/api/stats/heroes/popular");
        if (!response.ok) {
          throw new Error("데이터를 불러오는데 실패했습니다.");
        }

        const result: HeroPopularityResponse[] = await response.json();

        const chartData: ChartData[] = result.slice(0, 15).map((item) => ({
          name: HeroMap[item.hero as Hero] || item.hero,
          pickCount: item.pickCount,
          banCount: item.banCount,
          pickWinRate: item.pickWinRate,
        }));

        setData(chartData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      }
    });
  };

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
    <div className="space-y-8">
      {/* 픽/밴 횟수 차트 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          픽/밴 횟수 (상위 15개 영웅)
        </h3>
        <div className="w-full h-[400px]">
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical">
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
              />
              <Legend />
              <Bar dataKey="pickCount" name="픽 횟수" fill="#00d4ff" />
              <Bar dataKey="banCount" name="밴 횟수" fill="#ff3d00" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 픽 승률 차트 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          픽 승률
        </h3>
        <div className="w-full h-[400px]">
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical">
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
              <Bar dataKey="pickWinRate" name="승률" fill="#22c55e">
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.pickWinRate >= 50 ? "#22c55e" : "#ef4444"}
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
