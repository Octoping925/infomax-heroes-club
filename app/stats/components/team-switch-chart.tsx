"use client";

import { useEffect, useState } from "react";
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
  ReferenceLine,
} from "recharts";
import { TeamSwitchWinRateResponse } from "@/app/api/stats/types";

type ChartData = {
  name: string;
  originalWinRate: number;
  switchedWinRate: number;
  diff: number;
  originalGames: number;
  switchedGames: number;
};

/**
 * 팀 변경 효과 차트
 */
export function TeamSwitchChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stats/team-switch");
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result: TeamSwitchWinRateResponse[] = await response.json();

      const chartData: ChartData[] = result
        .filter(
          (item) =>
            item.originalTeamStats.totalGames > 0 &&
            item.switchedTeamStats.totalGames > 0
        )
        .map((item) => ({
          name: item.playerNickname,
          originalWinRate: item.originalTeamStats.winRate,
          switchedWinRate: item.switchedTeamStats.winRate,
          diff: item.switchedWinRateDiff,
          originalGames: item.originalTeamStats.totalGames,
          switchedGames: item.switchedTeamStats.totalGames,
        }));

      setData(chartData);
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

  // 팀 변경으로 승률이 오른 플레이어
  const improvedPlayers = data.filter((d) => d.diff > 0 && d.switchedGames > 0);
  const worsenedPlayers = data.filter((d) => d.diff < 0 && d.switchedGames > 0);

  return (
    <div className="space-y-8">
      <p className="text-gray-400">
        초기 팀 편성과 다른 팀으로 이동했을 때의 승률 변화를 보여줍니다.
      </p>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-xl p-4 border border-green-500/30">
          <p className="text-xs text-gray-500 mb-1">팀 변경 시 승률 상승</p>
          <p className="text-2xl font-bold text-green-400">
            {improvedPlayers.length}명
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-red-500/30">
          <p className="text-xs text-gray-500 mb-1">팀 변경 시 승률 하락</p>
          <p className="text-2xl font-bold text-red-400">
            {worsenedPlayers.length}명
          </p>
        </div>
      </div>

      {/* 원본 팀 vs 변경 팀 승률 비교 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          원본 팀 vs 변경 팀 승률 비교
        </h3>
        <div style={{ width: "100%", height: Math.max(400, data.length * 40) }}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical">
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
                formatter={(value: number, name: string) => {
                  const label =
                    name === "originalWinRate"
                      ? "원본 팀 승률"
                      : "변경 팀 승률";
                  return [`${value}%`, label];
                }}
              />
              <Legend
                formatter={(value) =>
                  value === "originalWinRate" ? "원본 팀" : "변경 팀"
                }
              />
              <Bar
                dataKey="originalWinRate"
                name="originalWinRate"
                fill="#00d4ff"
              />
              <Bar
                dataKey="switchedWinRate"
                name="switchedWinRate"
                fill="#7b2ff7"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 승률 변화량 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          팀 변경 시 승률 변화량
        </h3>
        <div style={{ width: "100%", height: Math.max(400, data.length * 40) }}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                type="number"
                domain={[-100, 100]}
                stroke="#888"
                unit="%p"
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
                formatter={(value: number) => [
                  `${value > 0 ? "+" : ""}${value}%p`,
                  "승률 변화",
                ]}
              />
              <ReferenceLine x={0} stroke="#666" />
              <Bar dataKey="diff" name="승률 변화" fill="#22c55e">
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.diff >= 0 ? "#22c55e" : "#ef4444"}
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
