"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { statsQueryKeys } from "@/config/query-keys";
import type {
  PlayerCombinedWinRateResponse,
  WinRateStats,
} from "@/app/api/stats/types";
import { PlayerWinRateChart } from "./player-win-rate-chart";

type Props = {
  readonly selectedPlayerId: string | null;
  readonly onSelectPlayer: (playerId: string) => void;
};

export function ScrimWinRateTab({ selectedPlayerId, onSelectPlayer }: Props) {
  const {
    data,
    isPending,
    error,
  } = useQuery<PlayerCombinedWinRateResponse[]>({
    queryKey: statsQueryKeys.stats.players.overallWinRate(),
    queryFn: async () => {
      const response = await fetch("/api/stats/players/overall-win-rate");
      if (!response.ok) {
        throw new Error("승률 데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as PlayerCombinedWinRateResponse[];
    },
  });

  const rows = useMemo(() => data ?? [], [data]);
  const selectedRow = useMemo(() => {
    if (!rows.length) {
      return null;
    }
    return rows.find((row) => row.playerId === selectedPlayerId) ?? rows[0];
  }, [rows, selectedPlayerId]);

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

  if (rows.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-500">승률 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            전체 플레이어 내전 승률
          </h3>
          <p className="text-xs text-gray-500">
            매치/게임 단위 승률과 경기 수를 한 눈에 비교할 수 있습니다.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left">플레이어</th>
                <th className="px-4 py-3 text-left">매치 승률</th>
                <th className="px-4 py-3 text-left">매치 전적</th>
                <th className="px-4 py-3 text-left">게임 승률</th>
                <th className="px-4 py-3 text-left">게임 전적</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSelected = row.playerId === selectedRow?.playerId;
                return (
                  <tr
                    key={row.playerId}
                    onClick={() => onSelectPlayer(row.playerId)}
                    className={`border-t border-white/10 cursor-pointer transition-colors ${
                      isSelected ? "bg-cyan-500/10" : "hover:bg-white/[0.06]"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      <div>{row.playerName}</div>
                      <div className="text-xs text-gray-400">{row.playerNickname}</div>
                    </td>
                    <td className="px-4 py-3">
                      <WinRatePill stats={row.matchStats} />
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {formatRecord(row.matchStats)}
                    </td>
                    <td className="px-4 py-3">
                      <WinRatePill stats={row.gameStats} accent="purple" />
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {formatRecord(row.gameStats)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selectedRow && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-white font-semibold">
              {selectedRow.playerName} ({selectedRow.playerNickname}) 상세
            </h3>
            <p className="text-xs text-gray-500">
              표에서 플레이어를 클릭하면 상세 정보가 갱신됩니다.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WinRateSummary
              title="매치 승률"
              stats={selectedRow.matchStats}
              accent="from-cyan-500/30 to-cyan-700/20"
            />
            <WinRateSummary
              title="게임 승률"
              stats={selectedRow.gameStats}
              accent="from-purple-500/30 to-purple-700/20"
            />
          </div>
          <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
            <PlayerWinRateChart nickname={selectedRow.playerNickname} />
          </div>
        </section>
      )}
    </div>
  );
}

function WinRateSummary({
  title,
  stats,
  accent,
}: {
  readonly title: string;
  readonly stats: WinRateStats;
  readonly accent: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-gradient-to-br ${accent} p-4`}
    >
      <h4 className="text-sm font-semibold text-gray-300">{title}</h4>
      <p className="text-3xl font-bold text-white mt-3">
        {stats.winRate}%
        <span className="text-sm text-gray-300 ml-2">
          ({stats.totalGames}경기)
        </span>
      </p>
      <p className="text-xs text-gray-400 mt-3">
        {stats.wins}승 {stats.losses}패 {stats.draws}무
      </p>
    </div>
  );
}

function WinRatePill({
  stats,
  accent = "cyan",
}: {
  readonly stats: WinRateStats;
  readonly accent?: "cyan" | "purple";
}) {
  const color = accent === "purple" ? "text-purple-300" : "text-cyan-300";
  const bgColor = accent === "purple" ? "bg-purple-500/10" : "bg-cyan-500/10";
  const borderColor = accent === "purple" ? "border-purple-500/30" : "border-cyan-500/30";

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${color} ${bgColor} ${borderColor} border`}
    >
      {stats.winRate}%
    </span>
  );
}

function formatRecord(stats: WinRateStats): string {
  return `${stats.wins}승 ${stats.losses}패 ${stats.draws}무 (${stats.totalGames}경기)`;
}
