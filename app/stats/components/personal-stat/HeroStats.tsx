import { usePlayerHeroWinRate } from "../../hooks/usePlayerHeroWinRate";
import { HeroMap, MAP_CATALOG } from "@/domain/hots/constants";
import { useState } from "react";
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
import type { GameMap } from "@/domain/hots/models";

interface Props {
  readonly nickname: string;
}

type MapFilter = "ALL" | GameMap;

export function HeroStats({ nickname }: Props) {
  const { data, error } = usePlayerHeroWinRate(nickname);
  const [selectedMap, setSelectedMap] = useState<MapFilter>("ALL");

  if (error) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-red-400">❌ {error.message}</p>
      </div>
    );
  }

  const mapOptions = data.heroStatsByMap.toSorted((a, b) =>
    MAP_CATALOG[a.map].nameKo.localeCompare(MAP_CATALOG[b.map].nameKo, "ko"),
  );
  const selectedHeroStats =
    selectedMap === "ALL" ? data.heroStats : (mapOptions.find((entry) => entry.map === selectedMap)?.heroStats ?? []);
  const chartData = selectedHeroStats.map((stat) => ({
    name: HeroMap[stat.hero] || stat.hero,
    totalGames: stat.totalGames,
    winRate: stat.winRate,
    wins: stat.wins,
    losses: stat.losses,
    draws: stat.draws,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-md font-semibold text-gray-400 uppercase tracking-wider">영웅별 통계</h3>
        <div className="flex items-center gap-3">
          <label htmlFor="personal-hero-map-select" className="text-sm font-medium text-gray-300">
            맵
          </label>
          <select
            id="personal-hero-map-select"
            value={selectedMap}
            onChange={(event) => setSelectedMap(event.target.value as MapFilter)}
            className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white shadow-sm outline-none transition hover:bg-white/20 focus:border-cyan-300"
          >
            <option value="ALL">전체</option>
            {mapOptions.map((option) => (
              <option key={option.map} value={option.map}>
                {MAP_CATALOG[option.map].nameKo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {chartData.length === 0 && (
        <div className="flex justify-center rounded-xl border border-dashed border-white/10 bg-white/5 py-10">
          <p className="text-gray-400">
            {selectedMap === "ALL" ? "전체" : MAP_CATALOG[selectedMap].nameKo} 기준 영웅 통계가 없습니다.
          </p>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="w-full flex gap-4">
          <div className="space-y-3 w-full">
            <h4 className="text-md font-semibold text-gray-400 uppercase tracking-wider">영웅별 경기 수</h4>
            <div
              style={{
                width: "100%",
                height: Math.max(300, chartData.length * 35),
              }}
            >
              <ResponsiveContainer minWidth={0} minHeight={0}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" stroke="#888" />
                  <YAxis type="category" dataKey="name" width={80} stroke="#888" tick={{ fontSize: 12 }} />
                  <Tooltip content={HeroRateTooltip} />
                  <Bar dataKey="totalGames" name="경기 수" fill="#7b2ff7" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-3 w-full">
            <h4 className="text-md font-semibold text-gray-400 uppercase tracking-wider">영웅별 승률</h4>
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
                  <YAxis type="category" dataKey="name" width={80} stroke="#888" tick={{ fontSize: 12 }} />
                  <Tooltip content={HeroRateTooltip} />
                  <Bar dataKey="winRate" name="승률" fill="#22c55e">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.winRate >= 50 ? "#22c55e" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeroRateTooltip({ active, payload, label }: TooltipContentProps<number, string>) {
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
