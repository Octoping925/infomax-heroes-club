"use client";

import { useMemo } from "react";
import { usePlayerFormTrend } from "../../hooks/usePlayerFormTrend";
import dayjs from "dayjs";
import { HERO_CATALOG, MAP_CATALOG } from "@/domain/hots/constants";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import { round } from "es-toolkit";
import { formatStatsYear, useStatsYear } from "../../hooks/useStatsYearFilter";

interface Props {
  readonly nickname: string;
}

type ChartPoint = {
  readonly gameLabel: string;
  readonly dateLabel: string;
  readonly mapLabel: string;
  readonly heroLabel: string;
  readonly result: "WIN" | "LOSE" | "DRAW";
  readonly score: number;
  readonly winRateScore: number;
  readonly kdaScore: number;
  readonly dpmScore: number;
  readonly rollingKda: number;
  readonly rollingDpm: number;
};

const TAKE_GAMES = 30;
const ROLLING_WINDOW = 5;
const SCORE_WEIGHT = {
  winRate: 0.5,
  kda: 0.3,
  dpm: 0.2,
} as const;

export function PlayerFormTrendChart({ nickname }: Props) {
  const { data, error } = usePlayerFormTrend(nickname, TAKE_GAMES);
  const { selectedYear } = useStatsYear();
  const yearLabel = formatStatsYear(selectedYear);

  const chartData = useMemo<ChartPoint[]>(() => {
    const sortedPoints = data.points.toSorted(
      (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime() || a.gameNumber - b.gameNumber,
    );

    const base = sortedPoints.map((point, index) => {
      const from = Math.max(0, index - ROLLING_WINDOW + 1);
      const windowPoints = sortedPoints.slice(from, index + 1);
      const wins = windowPoints.filter((item) => item.result === "WIN").length;
      const rollingKda = round(
        windowPoints.reduce((sum, item) => sum + (item.kills + item.takedowns) / Math.max(item.deaths, 1), 0) /
          windowPoints.length,
        2,
      );
      const rollingDpm = round(windowPoints.reduce((sum, item) => sum + item.dpm, 0) / windowPoints.length, 0);

      return {
        point,
        gameLabel: `G${index + 1}`,
        dateLabel: dayjs(point.playedAt).format("MM/DD"),
        mapLabel: MAP_CATALOG[point.map].nameKo,
        heroLabel: HERO_CATALOG[point.hero]?.nameKo ?? point.hero,
        winRateScore: round((wins / windowPoints.length) * 100, 1),
        rollingKda,
        rollingDpm,
      };
    });

    const kdaValues = base.map((row) => row.rollingKda);
    const dpmValues = base.map((row) => row.rollingDpm);
    const kdaMin = Math.min(...kdaValues);
    const kdaMax = Math.max(...kdaValues);
    const dpmMin = Math.min(...dpmValues);
    const dpmMax = Math.max(...dpmValues);

    return base.map((row) => {
      const kdaScore = normalizeTo100(row.rollingKda, kdaMin, kdaMax);
      const dpmScore = normalizeTo100(row.rollingDpm, dpmMin, dpmMax);
      const score = round(
        row.winRateScore * SCORE_WEIGHT.winRate + kdaScore * SCORE_WEIGHT.kda + dpmScore * SCORE_WEIGHT.dpm,
        1,
      );

      return {
        gameLabel: row.gameLabel,
        dateLabel: row.dateLabel,
        mapLabel: row.mapLabel,
        heroLabel: row.heroLabel,
        result: row.point.result,
        score,
        winRateScore: row.winRateScore,
        kdaScore,
        dpmScore,
        rollingKda: row.rollingKda,
        rollingDpm: row.rollingDpm,
      };
    });
  }, [data.points]);

  if (error) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-red-400">❌ {error.message}</p>
      </div>
    );
  }

  const latest = chartData.at(-1);

  if (!latest) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 p-6">
        <h3 className="text-md font-semibold text-gray-400 uppercase tracking-wider">폼 점수</h3>
        <p className="mt-3 text-gray-400">{yearLabel} 기준 표시할 경기 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-md font-bold uppercase tracking-wider">
            폼 점수 ({yearLabel} 최근 {TAKE_GAMES}경기)
          </h3>
          <p className="text-sm text-gray-400 mt-1">승률 50% + KDA 30% + DPM 20%</p>
        </div>
        <div className="rounded-md border border-white/15 bg-white/5 px-3 py-2">
          <p className="text-xs text-gray-400">최신 점수</p>
          <p className="text-xl font-semibold text-cyan-300">{latest.score}</p>
        </div>
      </div>

      <p className="text-sm font-bold text-gray-400">
        최신 경기: {latest.dateLabel} · {latest.mapLabel} · {latest.heroLabel} · {toResultText(latest.result)}
      </p>

      <div className="overflow-x-auto">
        <div className="w-full h-60">
          <ResponsiveContainer minWidth={0} minHeight={0}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="gameLabel" stroke="#888" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} stroke="#06b6d4" tick={{ fontSize: 12 }} />
              <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="4 4" />
              <Tooltip content={FormTooltip} />
              <Line type="monotone" dataKey="score" name="폼 점수" stroke="#06b6d4" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function FormTooltip({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload || !payload.length || !payload[0].payload) {
    return null;
  }

  const point = payload[0].payload as ChartPoint;

  return (
    <div
      style={{
        backgroundColor: "#1a1a2e",
        border: "1px solid #333",
        borderRadius: 8,
        padding: "10px",
        color: "#e0e0e0",
        fontSize: 13,
        minWidth: 220,
        lineHeight: 1.6,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        {point.dateLabel} · {toResultText(point.result)}
      </div>
      <div>
        {point.mapLabel} - {point.heroLabel}
      </div>
      <div style={{ marginTop: 6, color: "#67e8f9" }}>폼 점수: {point.score}</div>
      <div>승률 점수: {point.winRateScore}</div>
      <div>KDA 점수: {point.kdaScore}</div>
      <div>DPM 점수: {point.dpmScore}</div>
      <div style={{ marginTop: 4, color: "#94a3b8" }}>
        이동 평균: KDA {point.rollingKda.toFixed(2)} / DPM {point.rollingDpm.toLocaleString()}
      </div>
    </div>
  );
}

function toResultText(result: "WIN" | "LOSE" | "DRAW"): string {
  if (result === "WIN") return "승";
  if (result === "LOSE") return "패";
  return "무";
}

function normalizeTo100(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return round(((value - min) / (max - min)) * 100, 1);
}
