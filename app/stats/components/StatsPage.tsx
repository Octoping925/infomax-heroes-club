"use client";

import { createContext, Suspense, useState } from "react";
import { TeamSwitchChart } from "./team-switch-chart";
import { AvgStatsRankingChart } from "./avg-kills-deaths-ranking-chart";
import { FantasyDuoRankingChart } from "./fantasy-duo-ranking-chart";
import { HeroDuoRankingChart } from "./hero-duo-ranking-chart";
import type { PlayerListItem } from "../../api/players/route";
import { useHashSyncedTab } from "../hooks/use-tab-hash";
import { PersonalStatTab } from "./personal-stat/personal-stat-tab";
import { PlayerSidebar } from "./PlayerSidebar";
import { Loading } from "@/components/Loading";
import { ScrimStatTab } from "./scrim-stat/scrim-stat-tab";
import { RivalryTab } from "./rivalry-tab";
import { MapStatTab } from "./map-stat/map-stat-tab";
import { CounterPickTab } from "./counter-pick-tab";

type TabType =
  | "personalStats"
  | "scrimStats"
  | "rivalry"
  | "mapStats"
  | "teamSwitch"
  | "avgKillsDeathsRanking"
  | "fantasyDuo"
  | "heroDuo"
  | "counterPicks";

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: "personalStats", label: "개인 통계", icon: "👤" },
  { id: "scrimStats", label: "내전 통계", icon: "🥇" },
  { id: "mapStats", label: "맵 통계", icon: "🗺️" },
  { id: "rivalry", label: "라이벌리", icon: "🔥" },
  { id: "teamSwitch", label: "팀 변경 효과", icon: "🔄" },
  { id: "avgKillsDeathsRanking", label: "평균 킬/데스", icon: "💥" },
  { id: "fantasyDuo", label: "환상의 듀오", icon: "🤝" },
  { id: "heroDuo", label: "영웅 듀오", icon: "🧩" },
  { id: "counterPicks", label: "카운터픽", icon: "⚔️" },
];

const SHOW_PLAYER_SIDEBAR_TABS: Set<TabType> = new Set(["personalStats"]);

export const SelectedPlayerContext = createContext<PlayerListItem | null>(null);

interface Props {
  readonly players: PlayerListItem[];
}

/**
 * 통계 대시보드 페이지
 */
export function StatsPageLayout({ players }: Props) {
  const [activeTab, handleTabSelect] = useHashSyncedTab(
    "personalStats",
    TABS.map((tab) => tab.id),
  );

  const selectedTab = TABS.find((tab) => tab.id === activeTab)!;

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerListItem | null>(players[0] ?? null);

  const handleSelectPlayer = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    if (player) {
      setSelectedPlayer(player);
    }
  };

  return (
    <div className="w-full px-2">
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
      <main className="max-w-7xl mx-auto mt-5">
        <div className="flex max-lg:flex-col gap-6">
          {/* 플레이어 사이드바 */}
          {SHOW_PLAYER_SIDEBAR_TABS.has(activeTab) && (
            <PlayerSidebar players={players} setSelectedPlayerId={handleSelectPlayer} selectedPlayer={selectedPlayer} />
          )}

          {/* 차트 영역 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-lg">
                {selectedTab.icon}
              </span>
              <h2 className="text-xl font-bold text-white">{selectedTab.label}</h2>
            </div>

            <SelectedPlayerContext.Provider value={selectedPlayer}>
              <Suspense fallback={<Loading />}>
                {/* 각 탭별 차트 */}
                {activeTab === "personalStats" && <PersonalStatTab />}
                {activeTab === "scrimStats" && <ScrimStatTab />}
                {activeTab === "rivalry" && <RivalryTab />}
                {activeTab === "mapStats" && <MapStatTab />}
                {activeTab === "teamSwitch" && <TeamSwitchChart />}
                {activeTab === "avgKillsDeathsRanking" && <AvgStatsRankingChart />}
                {activeTab === "fantasyDuo" && <FantasyDuoRankingChart />}
                {activeTab === "heroDuo" && <HeroDuoRankingChart />}
                {activeTab === "counterPicks" && <CounterPickTab />}
              </Suspense>
            </SelectedPlayerContext.Provider>
          </div>
        </div>
      </main>
    </div>
  );
}
