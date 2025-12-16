import { Loading } from "@/components/Loading";
import { usePlayerHeroWinRate } from "../../hooks/usePlayerHeroWinRate";
import { HeroMap } from "@/domain/hots/constants/hero";
import { Hero } from "@/domain/hots/models/hero";
import { Suspense } from "react";
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

interface Props {
  readonly nickname: string;
}

export function HeroStats({ nickname }: Props) {
  const { data, error } = usePlayerHeroWinRate(nickname);

  if (error) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-red-400">❌ {error.message}</p>
      </div>
    );
  }

  const chartData =
    data?.heroStats.map((stat) => ({
      name: HeroMap[stat.hero as Hero] || stat.hero,
      totalGames: stat.totalGames,
      winRate: stat.winRate,
      wins: stat.wins,
      losses: stat.losses,
      draws: stat.draws,
    })) ?? [];

  return (
    <div className="w-full flex gap-4">
      <Suspense fallback={<Loading />}>
        {/* 경기 수 차트 */}
        <div className="space-y-3 w-full">
          <h3 className="text-md font-semibold text-gray-400 uppercase tracking-wider">
            영웅별 경기 수
          </h3>
          <div
            style={{
              width: "100%",
              height: Math.max(300, (chartData?.length ?? 0) * 35),
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
                <Tooltip content={HeroRateTooltip} />
                <Bar dataKey="totalGames" name="경기 수" fill="#7b2ff7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 승률 차트 */}
        <div className="space-y-3 w-full">
          <h3 className="text-md font-semibold text-gray-400 uppercase tracking-wider">
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
                <Tooltip content={HeroRateTooltip} />
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
      </Suspense>
    </div>
  );
}

function HeroRateTooltip({
  active,
  payload,
  label,
}: TooltipContentProps<number, string>) {
  if (!active || !payload || !payload.length || !payload[0].payload) {
    return null;
  }

  const d = payload[0].payload;

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
        승률: <b>{d.winRate}%</b>
      </div>
      <div>경기 수: {d.totalGames}경기</div>
      <div>
        승: {d.wins} / 무: {d.draws} / 패: {d.losses}
      </div>
    </div>
  );
}
