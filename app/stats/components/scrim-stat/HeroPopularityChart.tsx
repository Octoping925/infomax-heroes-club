import { useHeroPopularity } from "../../hooks/useHeroPopularity";
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
import { HeroMap } from "@/domain/hots/constants/hero";
import { Hero } from "@/generated/prisma/client";
import { Title } from "../Title";

export function HeroPopularityChart() {
  const { data } = useHeroPopularity();

  const chartData = data.slice(0, 15).map((item) => ({
    name: HeroMap[item.hero as Hero] || item.hero,
    pickCount: item.pickCount,
    banCount: item.banCount,
    pickWinRate: item.pickWinRate,
  }));

  return (
    <div className="space-y-8">
      <Title title="픽/밴 횟수 (상위 15개 영웅)" />
      <div className="w-full h-[400px]">
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
            />
            <Legend />
            <Bar dataKey="pickCount" name="픽 횟수" fill="#00d4ff" />
            <Bar dataKey="banCount" name="밴 횟수" fill="#ff3d00" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Title title="픽 승률" />
      <div className="w-full h-[400px]">
        <ResponsiveContainer>
          <BarChart
            data={chartData.toSorted((a, b) => b.pickWinRate - a.pickWinRate)}
            layout="vertical"
          >
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
              {chartData
                .toSorted((a, b) => b.pickWinRate - a.pickWinRate)
                .map((entry, index) => (
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
  );
}
