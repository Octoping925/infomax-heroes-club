"use client";

import { createContext, Suspense, useState } from "react";
import { TeamSwitchChart } from "./team-switch-chart";
import { AvgStatsRankingChart } from "./avg-kills-deaths-ranking-chart";
import { FantasyDuoRankingChart } from "./fantasy-duo-ranking-chart";
import { HeroDuoRankingChart } from "./hero-duo-ranking-chart";
import type { PlayerListItem } from "../../api/players/route";
import { useHashSyncedTab } from "../hooks/use-tab-hash";
import { PersonalStatTab } from "./personal-stat/personal-stat-tab";
import { Loading } from "@/components/Loading";
import { ScrimStatTab } from "./scrim-stat/scrim-stat-tab";
import { RivalryTab } from "../rivalry/rivalry-tab";
import { MapStatTab } from "./map-stat/map-stat-tab";
import { CounterPickTab } from "./counter-pick-tab";
import { TeamComposerTab } from "./team-composer/team-composer-tab";
import { TeammateFrequencyTab } from "./teammate-frequency-tab";
import { StatsYearContext, useStatsYearFilter } from "../hooks/useStatsYearFilter";

type TabType =
  | "personalStats"
  | "scrimStats"
  | "rivalry"
  | "mapStats"
  | "teamSwitch"
  | "avgKillsDeathsRanking"
  | "fantasyDuo"
  | "teammateFrequency"
  | "heroDuo"
  | "counterPicks"
  | "teamComposer";

const GROUPS = [
  { id: "player", label: "플레이어" },
  { id: "scrim", label: "내전" },
  { id: "ranking", label: "랭킹" },
  { id: "tools", label: "도구" },
] as const;

type GroupType = (typeof GROUPS)[number]["id"];

// 그룹 버튼은 해당 그룹의 첫 번째 탭으로 이동한다.
const TABS: { id: TabType; group: GroupType; label: string; icon: string }[] = [
  { id: "personalStats", group: "player", label: "개인 통계", icon: "👤" },
  { id: "teammateFrequency", group: "player", label: "팀 동료", icon: "👥" },
  { id: "scrimStats", group: "scrim", label: "내전 통계", icon: "🥇" },
  { id: "mapStats", group: "scrim", label: "맵 통계", icon: "🗺️" },
  { id: "teamSwitch", group: "scrim", label: "팀 변경 효과", icon: "🔄" },
  { id: "avgKillsDeathsRanking", group: "ranking", label: "평균 킬/데스", icon: "💥" },
  { id: "fantasyDuo", group: "ranking", label: "환상의 듀오", icon: "🤝" },
  { id: "heroDuo", group: "ranking", label: "영웅 듀오", icon: "🧩" },
  { id: "rivalry", group: "ranking", label: "라이벌리", icon: "🔥" },
  { id: "counterPicks", group: "tools", label: "카운터픽", icon: "⚔️" },
  { id: "teamComposer", group: "tools", label: "팀 편성 도우미", icon: "🧠" },
];

const SHOW_PLAYER_SELECT_TABS: Set<TabType> = new Set(["personalStats", "teammateFrequency"]);

export const SelectedPlayerContext = createContext<PlayerListItem | null>(null);

interface Props {
  readonly players: PlayerListItem[];
  readonly availableYears: ReadonlyArray<number>;
}

/**
 * 통계 대시보드 페이지
 */
export function StatsPageLayout({ players, availableYears }: Props) {
  const statsYear = useStatsYearFilter(availableYears);

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
    <StatsYearContext.Provider value={statsYear}>
      <div className="w-full px-2">
        <nav className="w-full px-3 md:px-6 pt-3 border-b border-white/10">
          <div className="max-w-7xl mx-auto flex flex-col gap-2">
            <div className="flex w-max max-w-full gap-1 rounded-xl bg-white/5 p-1">
              {GROUPS.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleTabSelect(TABS.find((tab) => tab.group === group.id)!.id)}
                  className={`whitespace-nowrap px-4 md:px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedTab.group === group.id
                      ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                  aria-pressed={selectedTab.group === group.id}
                >
                  {group.label}
                </button>
              ))}
            </div>
            <div className="flex gap-5 overflow-x-auto scrollbar-hide">
              {TABS.filter((tab) => tab.group === selectedTab.group).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabSelect(tab.id)}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-0.5 py-2.5 text-sm transition-all ${
                    activeTab === tab.id
                      ? "border-cyan-400 font-semibold text-white"
                      : "border-transparent text-gray-400 hover:text-white"
                  }`}
                  aria-pressed={activeTab === tab.id}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* 메인 컨텐츠 */}
        <main className="max-w-7xl mx-auto mt-5">
          <div className="flex max-lg:flex-col gap-6">
            {/* 차트 영역 */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-lg">
                  {selectedTab.icon}
                </span>
                <h2 className="text-xl font-bold text-white">{selectedTab.label}</h2>
                {SHOW_PLAYER_SELECT_TABS.has(activeTab) && (
                  <select
                    value={selectedPlayer?.id ?? ""}
                    onChange={(event) => handleSelectPlayer(event.target.value)}
                    aria-label="플레이어 선택"
                    className="ml-auto rounded-lg border border-white/10 bg-[#0b0f1c] px-3 py-2 text-sm text-white"
                  >
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name} ({player.nickname})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {availableYears.length > 0 && (
                <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">기준 연도</span>
                    {statsYear.availableYears.map((year) => (
                      <button
                        key={year}
                        onClick={() => statsYear.setSelectedYear(year)}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                          statsYear.selectedYear === year
                            ? "border-cyan-400 bg-cyan-500/20 text-white"
                            : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                        }`}
                        aria-pressed={statsYear.selectedYear === year}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <SelectedPlayerContext.Provider value={selectedPlayer}>
                <Suspense fallback={<Loading />}>
                  {/* 각 탭별 차트 */}
                  {activeTab === "personalStats" && <PersonalStatTab />}
                  {activeTab === "scrimStats" && (
                    <ScrimStatTab
                      onPlayerRowClick={(playerId) => {
                        handleSelectPlayer(playerId);
                        handleTabSelect("personalStats");
                      }}
                    />
                  )}
                  {activeTab === "rivalry" && <RivalryTab />}
                  {activeTab === "mapStats" && <MapStatTab />}
                  {activeTab === "teamSwitch" && <TeamSwitchChart />}
                  {activeTab === "avgKillsDeathsRanking" && <AvgStatsRankingChart />}
                  {activeTab === "fantasyDuo" && <FantasyDuoRankingChart />}
                  {activeTab === "teammateFrequency" && <TeammateFrequencyTab />}
                  {activeTab === "heroDuo" && <HeroDuoRankingChart />}
                  {activeTab === "counterPicks" && <CounterPickTab />}
                  {activeTab === "teamComposer" && <TeamComposerTab />}
                </Suspense>
              </SelectedPlayerContext.Provider>
            </div>
          </div>
        </main>
      </div>
    </StatsYearContext.Provider>
  );
}
