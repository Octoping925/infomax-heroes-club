import { countBy } from "es-toolkit";
import { useMapWinRate } from "../../hooks/useMapWinRate";
import { Loading } from "@/components/Loading";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MAPS } from "@/domain/hots/constants/maps";
import { GameMap } from "@/domain/hots/models/map";

interface Props {
  nickname: string;
}

export function PersonalMapWinRateChart({ nickname }: Props) {
  const { data } = useMapWinRate();

  const winRates = data.reduce((acc, curr) => {
    const player = curr.playerStats.find((p) => p.playerNickname === nickname);
    if (player) {
      acc[curr.map] = player.winRate;
    }
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(winRates)
    .map(([map, winRate]) => ({
      name: MAPS[map as GameMap],
      winRate,
    }))
    .toSorted((a, b) => b.winRate - a.winRate);

  return (
    <div>
      <h3 className="text-md font-semibold text-gray-400 uppercase tracking-wider">
        맵별 승률
      </h3>
      <div
        style={{
          width: "100%",
          height: Math.max(300, data.length * 35),
        }}
      >
        <ResponsiveContainer>
          <BarChart data={chartData} layout="vertical">
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
  );
}
