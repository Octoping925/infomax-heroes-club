"use client";

import { createContext, Suspense } from "react";
import { MapWinRateChart } from "./components/map-win-rate-chart";
import { TeamSwitchChart } from "./components/team-switch-chart";
import { LunchDinnerWinRateChart } from "./components/lunch-dinner-win-rate-chart";
import { LunchDinnerDiffRankingChart } from "./components/lunch-dinner-diff-ranking-chart";
import { AvgStatsRankingChart } from "./components/avg-kills-deaths-ranking-chart";
import { MatchHistoryTab } from "./components/match-history-tab";
import { FantasyDuoRankingChart } from "./components/fantasy-duo-ranking-chart";
import { HeroDuoRankingChart } from "./components/hero-duo-ranking-chart";
import type { PlayerListItem } from "../api/players/route";
import { useHashSyncedTab } from "./use-tab-hash";
import { PersonalStatTab } from "./components/personal-stat/personal-stat-tab";
import { usePlayerList } from "./hooks/usePlayerList";
import { PlayerSidebar } from "./components/PlayerSidebar";
import { Loading } from "@/components/Loading";
import { ScrimStatTab } from "./components/scrim-stat/scrim-stat-tab";
import { RivalryTab } from "./components/rivalry-tab";

type TabType =
  | "personalStats"
  | "scrimStats"
  | "rivalry"
  | "mapWinRate"
  | "teamSwitch"
  | "lunchDinnerWinRate"
  | "lunchDinnerDiffRanking"
  | "avgKillsDeathsRanking"
  | "fantasyDuo"
  | "heroDuo"
  | "matchHistory";

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: "personalStats", label: "개인 통계", icon: "👤" },
  { id: "scrimStats", label: "내전 통계", icon: "🥇" },
  { id: "rivalry", label: "라이벌리", icon: "🔥" },
  { id: "mapWinRate", label: "맵별 승률", icon: "🗺️" },
  { id: "teamSwitch", label: "팀 변경 효과", icon: "🔄" },
  { id: "lunchDinnerWinRate", label: "점심/저녁 승률", icon: "🍱" },
  { id: "lunchDinnerDiffRanking", label: "점심/저녁 차이", icon: "📈" },
  { id: "avgKillsDeathsRanking", label: "평균 킬/데스", icon: "💥" },
  { id: "fantasyDuo", label: "환상의 듀오", icon: "🤝" },
  { id: "heroDuo", label: "영웅 듀오", icon: "🧩" },
  { id: "matchHistory", label: "전적", icon: "📜" },
];

const SHOW_PLAYER_SIDEBAR_TABS: TabType[] = ["personalStats"];

export const SelectedPlayerContext = createContext<PlayerListItem | null>(null);

/**
 * 통계 대시보드 페이지
 */
export default function StatsPage() {
  const [activeTab, handleTabSelect] = useHashSyncedTab(
    "personalStats",
    TABS.map((tab) => tab.id)
  );

  const {
    players,
    selectedPlayer,
    setSelectedPlayerId,
    isLoadingPlayers,
    playersError,
  } = usePlayerList();

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
          <div className="flex max-lg:flex-col gap-6">
            {/* 플레이어 사이드바 */}
            {SHOW_PLAYER_SIDEBAR_TABS.includes(activeTab) && (
              <PlayerSidebar
                isLoading={isLoadingPlayers}
                error={playersError}
                players={players}
                setSelectedPlayerId={setSelectedPlayerId}
                selectedPlayer={selectedPlayer}
              />
            )}

            {/* 차트 영역 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-lg">
                  {TABS.find((t) => t.id === activeTab)?.icon}
                </span>
                <h2 className="text-xl font-bold text-white">
                  {TABS.find((t) => t.id === activeTab)?.label}
                </h2>
              </div>

              <SelectedPlayerContext.Provider value={selectedPlayer}>
                <Suspense fallback={<Loading />}>
                  {/* 각 탭별 차트 */}
                  {activeTab === "personalStats" && (
                    <PersonalStatTab
                      nickname={selectedPlayer?.nickname ?? ""}
                    />
                  )}
                  {activeTab === "scrimStats" && <ScrimStatTab />}
                  {activeTab === "rivalry" && <RivalryTab />}
                  {activeTab === "mapWinRate" && <MapWinRateChart />}
                  {activeTab === "teamSwitch" && <TeamSwitchChart />}
                  {activeTab === "lunchDinnerWinRate" && (
                    <LunchDinnerWinRateChart />
                  )}
                  {activeTab === "lunchDinnerDiffRanking" && (
                    <LunchDinnerDiffRankingChart />
                  )}
                  {activeTab === "avgKillsDeathsRanking" && (
                    <AvgStatsRankingChart />
                  )}
                  {activeTab === "fantasyDuo" && <FantasyDuoRankingChart />}
                  {activeTab === "heroDuo" && <HeroDuoRankingChart />}
                  {activeTab === "matchHistory" && <MatchHistoryTab />}
                </Suspense>
              </SelectedPlayerContext.Provider>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
