"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HeroPopularityChart } from "./components/hero-popularity-chart";
import { PlayerWinRateChart } from "./components/player-win-rate-chart";
import { PlayerHeroChart } from "./components/player-hero-chart";
import { MapWinRateChart } from "./components/map-win-rate-chart";
import { TeamSwitchChart } from "./components/team-switch-chart";
import { LunchDinnerWinRateChart } from "./components/lunch-dinner-win-rate-chart";
import { LunchDinnerDiffRankingChart } from "./components/lunch-dinner-diff-ranking-chart";
import { AvgKillsDeathsRankingChart } from "./components/avg-kills-deaths-ranking-chart";
import { MatchWinRateRankingChart } from "./components/match-win-rate-ranking-chart";
import { MatchHistoryTab } from "./components/match-history-tab";
import { FantasyDuoRankingChart } from "./components/fantasy-duo-ranking-chart";
import { HeroDuoRankingChart } from "./components/hero-duo-ranking-chart";
import type { PlayerListItem } from "../api/players/route";
import { statsQueryKeys } from "@/config/query-keys";
import { useHashSyncedTab } from "./use-tab-hash";

type TabType =
  | "heroPopularity"
  | "playerWinRate"
  | "playerHero"
  | "mapWinRate"
  | "teamSwitch"
  | "lunchDinnerWinRate"
  | "lunchDinnerDiffRanking"
  | "avgKillsDeathsRanking"
  | "matchWinRateRanking"
  | "fantasyDuo"
  | "heroDuo"
  | "matchHistory";

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: "heroPopularity", label: "영웅 픽/밴", icon: "🎯" },
  { id: "playerWinRate", label: "플레이어 승률", icon: "👤" },
  { id: "playerHero", label: "플레이어별 영웅", icon: "⚔️" },
  { id: "mapWinRate", label: "맵별 승률", icon: "🗺️" },
  { id: "teamSwitch", label: "팀 변경 효과", icon: "🔄" },
  { id: "lunchDinnerWinRate", label: "점심/저녁 승률", icon: "🍱" },
  { id: "lunchDinnerDiffRanking", label: "점심/저녁 차이", icon: "📈" },
  { id: "avgKillsDeathsRanking", label: "평균 킬/데스", icon: "💥" },
  { id: "matchWinRateRanking", label: "매치 승률", icon: "🏆" },
  { id: "fantasyDuo", label: "환상의 듀오", icon: "🤝" },
  { id: "heroDuo", label: "영웅 듀오", icon: "🧩" },
  { id: "matchHistory", label: "전적", icon: "📜" },
];

/**
 * 통계 대시보드 페이지
 */
export default function StatsPage() {
  const [activeTab, handleTabSelect] = useHashSyncedTab(
    "heroPopularity",
    TABS.map((tab) => tab.id)
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const {
    data: players = [],
    isPending: isLoadingPlayers,
    error: playersError,
  } = useQuery<PlayerListItem[]>({
    queryKey: statsQueryKeys.players(),
    queryFn: async () => {
      const response = await fetch("/api/players");
      if (!response.ok) {
        throw new Error("플레이어 목록을 불러오는 중 오류가 발생했습니다.");
      }
      return (await response.json()) as PlayerListItem[];
    },
  });

  const selectedPlayer = useMemo(() => {
    if (!players.length) {
      return null;
    }
    const hasSelected =
      selectedPlayerId &&
      players.some((player) => player.id === selectedPlayerId);
    const playerIdToUse = hasSelected
      ? selectedPlayerId
      : players[0]?.id ?? null;
    return (
      players.find((player) => player.id === playerIdToUse) ??
      players[0] ??
      null
    );
  }, [players, selectedPlayerId]);

  const showPlayerSidebar =
    activeTab === "playerWinRate" || activeTab === "playerHero";

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      {/* 헤더 */}
      <header className="w-full px-6 py-4 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold bg-linear-to-r from-cyan-400 via-purple-500 to-orange-500 bg-clip-text text-transparent">
            📊 내전 통계 대시보드
          </h1>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <nav className="w-full px-6 py-3 border-b border-white/10 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-2 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabSelect(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                  : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* 메인 컨텐츠 */}
      <main className="w-full px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-6">
            {/* 플레이어 사이드바 */}
            {showPlayerSidebar && (
              <aside className="w-64 shrink-0">
                <div className="sticky top-24 bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    플레이어 목록
                  </h3>

                  {isLoadingPlayers ? (
                    <div className="flex justify-center py-8">
                      <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : playersError ? (
                    <div className="flex justify-center py-8">
                      <p className="text-red-400 text-sm">
                        {playersError.message}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-[calc(100vh-250px)] overflow-y-auto">
                      {players.map((player) => (
                        <button
                          key={player.id}
                          onClick={() => setSelectedPlayerId(player.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                            selectedPlayer?.id === player.id
                              ? "bg-cyan-500 text-white"
                              : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs opacity-75">
                            {player.nickname}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            )}

            {/* 차트 영역 */}
            <div className="flex-1 min-w-0">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-lg">
                    {TABS.find((t) => t.id === activeTab)?.icon}
                  </span>
                  <h2 className="text-xl font-bold text-white">
                    {TABS.find((t) => t.id === activeTab)?.label}
                  </h2>
                </div>

                {/* 각 탭별 차트 */}
                {activeTab === "heroPopularity" && <HeroPopularityChart />}
                {activeTab === "playerWinRate" && selectedPlayer && (
                  <PlayerWinRateChart nickname={selectedPlayer.nickname} />
                )}
                {activeTab === "playerHero" && selectedPlayer && (
                  <PlayerHeroChart nickname={selectedPlayer.nickname} />
                )}
                {activeTab === "mapWinRate" && <MapWinRateChart />}
                {activeTab === "teamSwitch" && <TeamSwitchChart />}
                {activeTab === "lunchDinnerWinRate" && (
                  <LunchDinnerWinRateChart />
                )}
                {activeTab === "lunchDinnerDiffRanking" && (
                  <LunchDinnerDiffRankingChart />
                )}
                {activeTab === "avgKillsDeathsRanking" && (
                  <AvgKillsDeathsRankingChart />
                )}
                {activeTab === "matchWinRateRanking" && (
                  <MatchWinRateRankingChart />
                )}
                {activeTab === "fantasyDuo" && <FantasyDuoRankingChart />}
                {activeTab === "heroDuo" && <HeroDuoRankingChart />}
                {activeTab === "matchHistory" && <MatchHistoryTab />}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
