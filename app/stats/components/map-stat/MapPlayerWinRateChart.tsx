"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  TooltipContentProps,
} from "recharts";
import { useMapPlayerWinRate } from "../../hooks/useMapPlayerWinRate";

type ChartData = {
  name: string;
  totalGames: number;
  winRate: number;
  wins: number;
  draws: number;
  losses: number;
};

/**
 * 맵별 플레이어 승률 차트
 */
export function MapPlayerWinRateChart({ map }: { map: string }) {
  const { data, error } = useMapPlayerWinRate();

  if (error) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-red-400">❌ {error.message}</p>
      </div>
    );
  }

  const selectedMapData = data.find((item) => item.map === map);

  const chartData: ChartData[] =
    selectedMapData?.playerStats.map((stat) => ({
      name: stat.playerNickname,
      totalGames: stat.totalGames,
      winRate: stat.winRate,
      wins: stat.wins,
      draws: stat.draws,
      losses: stat.losses,
    })) || [];

  if (chartData.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-500">선택한 맵에 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
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
          <YAxis type="category" dataKey="name" width={100} stroke="#888" tick={{ fontSize: 12 }} />
          <Tooltip content={WinRateTooltip} />
          <Bar dataKey="winRate" name="승률" fill="#22c55e">
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.winRate >= 50 ? "#22c55e" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function WinRateTooltip({ active, payload, label }: TooltipContentProps<number, string>) {
  if (!active || !payload?.[0]?.payload) {
    return null;
  }

  const data: ChartData = payload[0].payload as ChartData;

  return (
    <div
      style={{
        backgroundColor: "#1a1a2e",
        border: "1px solid #333",
        borderRadius: 8,
        padding: "10px",
        color: "#e0e0e0",
        fontSize: 14,
        minWidth: 150,
        lineHeight: 1.7,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div>
        승률: <b>{data.winRate}%</b>
      </div>
      <div>경기 수: {data.totalGames}경기</div>
      <div>
        승: {data.wins} / 무: {data.draws} / 패: {data.losses}
      </div>
    </div>
  );
}
