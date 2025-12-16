"use client";

import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { PlayerWinRateResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";

type Props = {
  nickname: string;
};

const COLORS = {
  wins: "#22c55e",
  losses: "#ef4444",
  draws: "#eab308",
};

/**
 * 플레이어 승률 차트
 */
export function PlayerWinRateChart({ nickname }: Props) {
  const { data, isPending, error } = useQuery<PlayerWinRateResponse>({
    queryKey: statsQueryKeys.stats.players.winRate(nickname),
    queryFn: async () => {
      const response = await fetch(
        `/api/stats/players/${encodeURIComponent(nickname)}`
      );
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("플레이어를 찾을 수 없습니다.");
        }
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as PlayerWinRateResponse;
    },
    enabled: Boolean(nickname),
  });

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

  if (!data || data.totalGames === 0) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-500">경기 데이터가 없습니다.</p>
      </div>
    );
  }

  const pieData = [
    { name: "승리", value: data.wins },
    { name: "패배", value: data.losses },
    { name: "무승부", value: data.draws },
  ].filter((item) => item.value > 0);

  const colorMap: Record<string, string> = {
    승리: COLORS.wins,
    패배: COLORS.losses,
    무승부: COLORS.draws,
  };

  return (
    <div className="space-y-6">
      {/* 플레이어 정보 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="플레이어"
          value={`${data.playerName} (${data.playerNickname})`}
        />
        <StatCard label="총 경기 수" value={`${data.totalGames}경기`} />
        <StatCard
          label="승률"
          value={`${data.winRate}%`}
          highlight={data.winRate >= 50}
        />
      </div>

      {/* 승패 파이 차트 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          승/패/무 비율
        </h3>
        <div className="w-full h-[300px]">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colorMap[entry.name]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a2e",
                  border: "1px solid #333",
                  borderRadius: 8,
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 상세 통계 */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="승리" value={`${data.wins}승`} color={COLORS.wins} />
        <StatCard
          label="패배"
          value={`${data.losses}패`}
          color={COLORS.losses}
        />
        <StatCard
          label="무승부"
          value={`${data.draws ?? 0}무`}
          color={COLORS.draws}
        />
      </div>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
};

function StatCard({ label, value, highlight, color }: StatCardProps) {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p
        className="text-lg font-bold"
        style={{ color: color || (highlight ? "#22c55e" : "white") }}
      >
        {value}
      </p>
    </div>
  );
}
