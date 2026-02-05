"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePlayerAverageStats } from "../hooks/usePlayerAverageStats";

type ChartData = {
  name: string;
  value: number;
  totalGames: number;
};

/**
 * 평균 킬/데스 랭킹 차트
 */
export function AvgStatsRankingChart() {
  const { data, error } = usePlayerAverageStats();

  const avgKillsData: ChartData[] = data
    .toSorted((a, b) => b.averageKills - a.averageKills)
    .slice(0, 20)
    .map((item) => ({
      name: item.playerNickname,
      value: item.averageKills,
      totalGames: item.totalGames,
    }));

  const avgDeathsData: ChartData[] = data
    .toSorted((a, b) => b.averageDeaths - a.averageDeaths)
    .slice(0, 20)
    .map((item) => ({
      name: item.playerNickname,
      value: item.averageDeaths,
      totalGames: item.totalGames,
    }));

  if (error) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-red-400">❌ {error.message}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-500">데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <p className="text-gray-400">
        플레이어의 <span className="text-white">게임 단위</span> 평균 킬/데스를 비교합니다.
      </p>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">평균 킬 TOP 20</h3>
        <div className="w-full max-h-[420px]" style={{ height: avgKillsData.length * 34 }}>
          <ResponsiveContainer>
            <BarChart data={avgKillsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" stroke="#888" />
              <YAxis type="category" dataKey="name" width={110} stroke="#888" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a2e",
                  border: "1px solid #333",
                  borderRadius: 8,
                }}
                formatter={(value, _key, ctx) => {
                  const payload = ctx.payload as ChartData | undefined;
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
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">평균 데스 TOP 20</h3>
        <div className="w-full max-h-[420px]" style={{ height: avgDeathsData.length * 34 }}>
          <ResponsiveContainer>
            <BarChart data={avgDeathsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" stroke="#888" />
              <YAxis type="category" dataKey="name" width={110} stroke="#888" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a2e",
                  border: "1px solid #333",
                  borderRadius: 8,
                }}
                formatter={(value, _key, ctx) => {
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
