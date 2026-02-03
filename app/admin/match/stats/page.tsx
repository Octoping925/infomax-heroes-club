"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { HeroPositionMap } from "@/domain/hots/constants";
import { Hero } from "@/domain/hots/models";
import type { MatchHistoryItem } from "@/app/api/matches/route";
import type { MatchStatsResponse } from "@/app/api/matches/[matchId]/stats/route";

type EditableStatValue = number | "";

type MemberStatInput = {
  readonly hero: Hero;
  readonly heroDamage: EditableStatValue;
  readonly siegeDamage: EditableStatValue;
  readonly damageTaken: EditableStatValue;
  readonly healingDone: EditableStatValue;
};

type SaveResult =
  | { readonly status: "idle" }
  | { readonly status: "saving" }
  | { readonly status: "success"; readonly message: string }
  | { readonly status: "error"; readonly message: string };

const DEFAULT_MEMBER_STATS: MemberStatInput = {
  hero: "Abathur",
  heroDamage: 0,
  siegeDamage: 0,
  damageTaken: 0,
  healingDone: 0,
};

function formatPlayedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMatchLabel(match: MatchHistoryItem): string {
  const typeLabel = match.type === "LUNCH" ? "점심" : "저녁";
  const winnerLabel =
    match.winnerTeamNumber === null
      ? "무승부"
      : `${match.winnerTeamNumber}팀 승`;
  return `${formatPlayedAt(match.playedAt)} · ${typeLabel} · ${match.games.length
    }경기 · ${winnerLabel}`;
}

function getHeroLabel(hero: Hero): string {
  return HeroPositionMap[hero] ? `${HeroPositionMap[hero]} (${hero})` : hero;
}

function getTeamMembersLabel(team: MatchStatsResponse["games"][number]["teams"][number]): string {
  const nicknames = team.members.map((m) => m.player.nickname).join(", ");
  return nicknames.length > 0 ? nicknames : "-";
}

function createStatMapFromResponse(
  response: MatchStatsResponse
): Record<string, MemberStatInput> {
  const result: Record<string, MemberStatInput> = {};
  for (const game of response.games) {
    for (const team of game.teams) {
      for (const member of team.members) {
        result[member.id] = {
          hero: member.hero,
          heroDamage: member.heroDamage ?? 0,
          siegeDamage: member.siegeDamage ?? 0,
          damageTaken: member.damageTaken ?? 0,
          healingDone: member.healingDone ?? 0,
        };
      }
    }
  }
  return result;
}

function parseStatValue(input: string): EditableStatValue {
  if (input === "") return "";
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return "";
  return Math.max(0, Math.floor(parsed));
}

function normalizeStatValue(input: EditableStatValue): number {
  if (input === "") return 0;
  return input;
}

export default function MatchStatsPage() {
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [selectedMatch, setSelectedMatch] = useState<MatchHistoryItem | null>(
    null
  );
  const [statsData, setStatsData] = useState<MatchStatsResponse | null>(null);
  const [statsByMemberId, setStatsByMemberId] = useState<
    Record<string, MemberStatInput>
  >({});
  const [saveResult, setSaveResult] = useState<SaveResult>({ status: "idle" });
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(false);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [matchSearchText, setMatchSearchText] = useState<string>("");

  const heroOptions = Object.keys(HeroPositionMap)
    .filter((hero): hero is Hero => hero in HeroPositionMap)
    .toSorted((a, b) => HeroPositionMap[a].localeCompare(HeroPositionMap[b], "ko"));

  const filteredMatches = (() => {
    const trimmed = matchSearchText.trim();
    if (!trimmed) return matches;
    return matches.filter((m) => getMatchLabel(m).includes(trimmed));
  })();

  useEffect(() => {
    const run = async (): Promise<void> => {
      setIsLoadingMatches(true);
      try {
        const response = await fetch("/api/matches?take=80", {
          cache: "no-store",
        });
        const data: MatchHistoryItem[] = await response.json();
        if (!response.ok) {
          throw new Error("내전 목록 조회에 실패했습니다.");
        }
        setMatches(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류";
        setSaveResult({ status: "error", message });
      } finally {
        setIsLoadingMatches(false);
      }
    };

    void run();
  }, []);

  useEffect(() => {
    if (!selectedMatchId) {
      setSelectedMatch(null);
      setStatsData(null);
      setStatsByMemberId({});
      return;
    }

    const match = matches.find((m) => m.id === selectedMatchId) ?? null;
    setSelectedMatch(match);

    const run = async () => {
      setIsLoadingStats(true);
      setSaveResult({ status: "idle" });
      try {
        const response = await fetch(`/api/matches/${selectedMatchId}/stats`, {
          cache: "no-store",
        });
        const data: MatchStatsResponse | { error: string } =
          await response.json();
        if (!response.ok) {
          const message =
            "error" in data ? data.error : "전적 조회에 실패했습니다.";
          throw new Error(message);
        }

        const typed = data as MatchStatsResponse;
        setStatsData(typed);
        setStatsByMemberId(createStatMapFromResponse(typed));
      } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류";
        setSaveResult({ status: "error", message });
      } finally {
        setIsLoadingStats(false);
      }
    };

    void run();
  }, [matches, selectedMatchId]);

  const handleStatChange = (
    memberId: string,
    field: keyof MemberStatInput,
    value: string
  ) => {
    setStatsByMemberId((prev) => {
      const current = prev[memberId] ?? DEFAULT_MEMBER_STATS;
      return {
        ...prev,
        [memberId]: {
          ...current,
          [field]: field === "hero" ? (value as Hero) : parseStatValue(value),
        },
      };
    });
  };

  const handleSave = async () => {
    if (!selectedMatch || !statsData) return;

    setSaveResult({ status: "saving" });

    try {
      const updates = statsData.games.flatMap((game) =>
        game.teams.flatMap((team) =>
          team.members.map((member) => {
            const stats = statsByMemberId[member.id] ?? DEFAULT_MEMBER_STATS;
            return {
              gameTeamMemberId: member.id,
              hero: stats.hero,
              heroDamage: normalizeStatValue(stats.heroDamage),
              siegeDamage: normalizeStatValue(stats.siegeDamage),
              damageTaken: normalizeStatValue(stats.damageTaken),
              healingDone: normalizeStatValue(stats.healingDone),
            };
          })
        )
      );

      const response = await fetch(`/api/matches/${selectedMatch.id}/stats`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      const data: { success: true } | { error: string } = await response.json();
      if (!response.ok) {
        const message = "error" in data ? data.error : "저장에 실패했습니다.";
        throw new Error(message);
      }

      setSaveResult({
        status: "success",
        message: "전적 정보가 저장되었습니다.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setSaveResult({ status: "error", message });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <TopBar title="📊 내전 전적 입력/수정" value="match-stats" />

      <main className="w-full px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 md:items-end md:justify-between">
              <div className="space-y-2 w-full">
                <label className="text-sm font-medium text-gray-400">
                  내전 선택
                </label>
                <select
                  value={selectedMatchId}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  disabled={isLoadingMatches}
                >
                  <option value="" className="bg-[#1a1a2e]">
                    {isLoadingMatches ? "불러오는 중..." : "내전을 선택하세요"}
                  </option>
                  {filteredMatches.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#1a1a2e]">
                      {getMatchLabel(m)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 w-full md:max-w-sm">
                <label className="text-sm font-medium text-gray-400">
                  검색(라벨)
                </label>
                <input
                  value={matchSearchText}
                  onChange={(e) => setMatchSearchText(e.target.value)}
                  placeholder="예) 2025-12-12 / 점심 / 3경기"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
              </div>
            </div>

            {selectedMatch && (
              <div className="text-sm text-gray-400">
                선택됨:{" "}
                <span className="text-gray-200">
                  {getMatchLabel(selectedMatch)}
                </span>{" "}
                <span className="text-gray-600">
                  (matchId: {selectedMatch.id})
                </span>
              </div>
            )}

            {(isLoadingStats || isLoadingMatches) && selectedMatchId && (
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                전적 정보를 불러오는 중...
              </div>
            )}
          </div>

          {statsData?.games.map((game) => (
            <div
              key={game.id}
              className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-6"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">
                    {game.gameNumber}번째 경기
                  </h2>
                  <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-sm">
                    {game.map}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  결과:{" "}
                  <span className="text-gray-200">
                    {game.teams[0]?.result === "DRAW"
                      ? "무승부"
                      : game.teams[0]?.result === "WIN"
                        ? "1팀 승리"
                        : "2팀 승리"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {game.teams.map((team) => (
                  <div
                    key={team.id}
                    className="bg-white/5 rounded-2xl border border-white/10 p-5 space-y-4"
                  >
                    <div className="space-y-1">
                      <div className="text-lg font-bold">
                        {team.teamNumber}팀 전적
                      </div>
                      <div className="text-xs text-gray-500">
                        gameTeamId: {team.id}
                      </div>
                    </div>

                    <div className="text-sm text-gray-400">
                      멤버:{" "}
                      <span className="text-gray-200">
                        {getTeamMembersLabel(team)}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[520px]">
                        <thead>
                          <tr className="text-xs text-gray-300 tracking-tight border-b border-white/5">
                            <th className="pb-2 text-left font-semibold">
                              플레이어
                            </th>
                            <th className="pb-2 text-left font-semibold">
                              영웅
                            </th>
                            <th className="pb-2 text-center font-semibold">
                              가한 피해량
                            </th>
                            <th className="pb-2 text-center font-semibold">
                              공성 피해량
                            </th>
                            <th className="pb-2 text-center font-semibold">
                              받은 피해량
                            </th>
                            <th className="pb-2 text-center font-semibold">
                              힐량
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {team.members.map((member) => {
                            const stats =
                              statsByMemberId[member.id] ?? DEFAULT_MEMBER_STATS;
                            return (
                              <tr key={member.id}>
                                <td className="py-2.5">
                                  <div className="font-semibold text-gray-200">
                                    {member.player.nickname}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {member.player.name}
                                  </div>
                                </td>
                                <td className="py-2.5">
                                  <select
                                    value={stats.hero}
                                    onChange={(e) =>
                                      handleStatChange(
                                        member.id,
                                        "hero",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                                  >
                                    {heroOptions.map((hero) => (
                                      <option
                                        key={hero}
                                        value={hero}
                                        className="bg-[#1a1a2e]"
                                      >
                                        {getHeroLabel(hero)}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-2.5">
                                  <input
                                    type="number"
                                    min={0}
                                    value={stats.heroDamage}
                                    onChange={(e) =>
                                      handleStatChange(
                                        member.id,
                                        "heroDamage",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                                  />
                                </td>
                                <td className="py-2.5">
                                  <input
                                    type="number"
                                    min={0}
                                    value={stats.siegeDamage}
                                    onChange={(e) =>
                                      handleStatChange(
                                        member.id,
                                        "siegeDamage",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                                  />
                                </td>
                                <td className="py-2.5">
                                  <input
                                    type="number"
                                    min={0}
                                    value={stats.damageTaken}
                                    onChange={(e) =>
                                      handleStatChange(
                                        member.id,
                                        "damageTaken",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                                  />
                                </td>
                                <td className="py-2.5">
                                  <input
                                    type="number"
                                    min={0}
                                    value={stats.healingDone}
                                    onChange={(e) =>
                                      handleStatChange(
                                        member.id,
                                        "healingDone",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {selectedMatch && (
            <div className="space-y-4">
              {saveResult.status !== "idle" &&
                saveResult.status !== "saving" && (
                  <div
                    className={`p-4 rounded-xl border ${saveResult.status === "success"
                      ? "bg-green-500/10 border-green-500/30 text-green-400"
                      : "bg-red-500/10 border-red-500/30 text-red-400"
                      }`}
                  >
                    <p className="font-medium">
                      {saveResult.status === "success" ? "✅ " : "❌ "}
                      {saveResult.message}
                    </p>
                  </div>
                )}

              <button
                onClick={handleSave}
                disabled={saveResult.status === "saving" || isLoadingStats}
                className={`w-full px-6 py-4 rounded-xl text-white font-bold text-lg transition-all shadow-lg ${saveResult.status === "saving" || isLoadingStats
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-linear-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 shadow-cyan-500/25"
                  }`}
                type="button"
              >
                {saveResult.status === "saving" ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    저장 중...
                  </span>
                ) : (
                  "전적 저장하기"
                )}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
