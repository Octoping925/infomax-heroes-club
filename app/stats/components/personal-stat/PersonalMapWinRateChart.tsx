import { useMapPlayerWinRate } from "../../hooks/useMapPlayerWinRate";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  TooltipContentProps,
} from "recharts";
import { MAP_CATALOG } from "@/domain/hots/constants";
import { formatStatsYear, useStatsYear } from "../../hooks/useStatsYearFilter";
interface Props {
  nickname: string;
}

type ChartData = {
  name: string;
  winRate: number;
  totalGames: number;
  wins: number;
  draws: number;
  losses: number;
};

export function PersonalMapWinRateChart({ nickname }: Props) {
  const { data } = useMapPlayerWinRate();
  const { selectedYear } = useStatsYear();

  const chartData: ChartData[] = data
    .map<ChartData | null>((curr) => {
      const player = curr.playerStats.find((p) => p.playerNickname === nickname);
      if (!player) {
        return null;
      }

      return {
        name: MAP_CATALOG[curr.map].nameKo,
        winRate: player.winRate,
        totalGames: player.totalGames,
        wins: player.wins,
        draws: player.draws,
        losses: player.losses,
      };
    })
    .filter((item): item is ChartData => item !== null)
    .toSorted((a, b) => b.winRate - a.winRate);

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 p-6">
        <h3 className="text-md font-semibold text-gray-400 uppercase tracking-wider">맵별 승률</h3>
        <p className="mt-3 text-gray-400">{formatStatsYear(selectedYear)} 맵별 전적이 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-md font-semibold text-gray-400 uppercase tracking-wider">맵별 승률</h3>
      <div
        style={{
          width: "100%",
          height: Math.max(300, chartData.length * 35),
        }}
      >
        <ResponsiveContainer minWidth={0} minHeight={0}>
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
    </div>
  );
}

function WinRateTooltip({ active, payload, label }: TooltipContentProps<number, string>) {
  if (!active || !payload || !payload.length || !payload[0].payload) {
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
