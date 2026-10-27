"use client";

import { createContext, lazy, Suspense, useState } from "react";
import type { PlayerListItem } from "../../api/players/route";
import { useHashSyncedTab } from "../hooks/use-tab-hash";
import { PersonalStatTab } from "./personal-stat/personal-stat-tab";
import { Loading } from "@/components/Loading";
import { StatsYearContext, useStatsYearFilter } from "../hooks/useStatsYearFilter";
import { StatsErrorBoundary } from "./StatsErrorBoundary";

const TeamSwitchChart = lazy(() => import("./team-switch-chart").then((module) => ({ default: module.TeamSwitchChart })));
const AvgStatsRankingChart = lazy(() => import("./avg-kills-deaths-ranking-chart").then((module) => ({ default: module.AvgStatsRankingChart })));
const FantasyDuoRankingChart = lazy(() => import("./fantasy-duo-ranking-chart").then((module) => ({ default: module.FantasyDuoRankingChart })));
const HeroDuoRankingChart = lazy(() => import("./hero-duo-ranking-chart").then((module) => ({ default: module.HeroDuoRankingChart })));
const ScrimStatTab = lazy(() => import("./scrim-stat/scrim-stat-tab").then((module) => ({ default: module.ScrimStatTab })));
const RivalryTab = lazy(() => import("../rivalry/rivalry-tab").then((module) => ({ default: module.RivalryTab })));
const MapStatTab = lazy(() => import("./map-stat/map-stat-tab").then((module) => ({ default: module.MapStatTab })));
const CounterPickTab = lazy(() => import("./counter-pick-tab").then((module) => ({ default: module.CounterPickTab })));
const TeamComposerTab = lazy(() => import("./team-composer/team-composer-tab").then((module) => ({ default: module.TeamComposerTab })));
const TeammateFrequencyTab = lazy(() => import("./teammate-frequency-tab").then((module) => ({ default: module.TeammateFrequencyTab })));

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
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 py-7 sm:py-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">내전 기록실</h1>
            <p className="mt-2 text-sm leading-6 text-gray-400">우리의 경기를 숫자로 돌아보세요.</p>
          </div>
          {statsYear.selectedYear && <p className="text-sm text-gray-400">현재 기록 <span className="ml-2 font-semibold tabular-nums text-white">{statsYear.selectedYear}년</span></p>}
        </div>
        <div className="grid gap-8 pt-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10 lg:pt-8">
          <nav aria-label="통계 탐색" className="min-w-0">
            <div className="flex gap-1 overflow-x-auto border-b border-white/10 lg:flex-col lg:overflow-visible lg:border-b-0">
              {GROUPS.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleTabSelect(TABS.find((tab) => tab.group === group.id)!.id)}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 lg:border-b-0 lg:px-3 ${
                    selectedTab.group === group.id
                      ? "border-cyan-400 text-white lg:bg-white/10"
                      : "border-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                  aria-pressed={selectedTab.group === group.id}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </nav>
          <main className="min-w-0">
            <div className="flex gap-6 overflow-x-auto border-b border-white/10">
              {TABS.filter((tab) => tab.group === selectedTab.group).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabSelect(tab.id)}
                  className={`min-h-11 shrink-0 whitespace-nowrap border-b-2 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
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
              <div className="flex flex-wrap items-end justify-between gap-4 pb-5 pt-7">
                <div>
                  <h2 className="text-xl font-bold text-white sm:text-2xl">{selectedTab.label}</h2>
                  <p className="mt-1.5 text-sm text-gray-400">{selectedTab.group === "player" ? "선수를 선택해 기록을 살펴보세요." : selectedTab.group === "scrim" ? "내전의 기록과 흐름을 확인하세요." : selectedTab.group === "ranking" ? "함께한 경기에서 발견한 순위입니다." : "다음 경기를 위한 기록을 살펴보세요."}</p>
                </div>
                {SHOW_PLAYER_SELECT_TABS.has(activeTab) && (
                  <select
                    value={selectedPlayer?.id ?? ""}
                    onChange={(event) => handleSelectPlayer(event.target.value)}
                    aria-label="플레이어 선택"
                    className="min-h-11 max-w-52 rounded-lg border border-white/15 bg-[#0a0a12] px-3 py-2.5 text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
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
                <div className="mb-7 border-y border-white/10 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-2 text-xs font-semibold text-gray-400">기준 연도</span>
                    {statsYear.availableYears.map((year) => (
                      <button
                        key={year}
                        onClick={() => statsYear.setSelectedYear(year)}
                        className={`min-h-11 min-w-11 rounded-md px-3 py-1.5 text-sm font-medium tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                          statsYear.selectedYear === year
                            ? "bg-cyan-500 text-black"
                            : "text-gray-400 hover:bg-white/10 hover:text-white"
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
                <StatsErrorBoundary key={`${activeTab}-${statsYear.selectedYear}`}>
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
                </StatsErrorBoundary>
              </SelectedPlayerContext.Provider>
          </main>
        </div>
      </div>
    </StatsYearContext.Provider>
  );
}
