"use client";

import { useContext } from "react";
import { useTeamComposerData } from "../hooks/useTeamComposerData";
import { SelectedPlayerContext } from "./StatsPage";
import { buildTeammateRows } from "./teammate-frequency";

export function TeammateFrequencyTab() {
  const selectedPlayer = useContext(SelectedPlayerContext);
  const { data, error } = useTeamComposerData();
  const rows = selectedPlayer ? buildTeammateRows(selectedPlayer.id, data.players, data.pairs) : [];

  if (error) {
    return <p className="py-12 text-center text-red-400">❌ {error.message}</p>;
  }

  if (!selectedPlayer || rows.length === 0) {
    return <p className="py-12 text-center text-gray-500">함께 참가한 멤버 데이터가 없습니다.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">두 사람이 함께 참가한 매치 중 같은 팀이었던 비율입니다.</p>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-white/5 text-gray-300">
            <tr>
              <th scope="col" className="px-4 py-3 text-left">
                다른 멤버
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                같은 팀
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                함께 참가
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                같은 팀 비율
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.player.playerId} className="border-t border-white/10 transition-colors hover:bg-white/[0.06]">
                <td className="px-4 py-3 text-white">
                  <span className="font-medium">{row.player.playerName}</span>
                  <span className="ml-2 text-xs text-gray-400">{row.player.playerNickname}</span>
                </td>
                <td className="px-4 py-3 text-right text-gray-200">{row.sameTeamMatches}</td>
                <td className="px-4 py-3 text-right text-gray-200">{row.encounterMatches}</td>
                <td className="px-4 py-3 text-right font-medium text-cyan-300">{row.sameTeamRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
