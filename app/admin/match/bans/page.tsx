"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HeroMap } from "@/domain/hots/constants/hero";
import { TopBar } from "@/components/TopBar";

type MatchType = "LUNCH" | "DINNER";

type MatchHistoryPlayer = {
  readonly id: string;
  readonly name: string;
  readonly nickname: string;
};

type MatchHistoryGameTeamMember = {
  readonly player: MatchHistoryPlayer;
  readonly hero: string;
  readonly kills: number | null;
  readonly deaths: number | null;
  readonly takedowns: number | null;
  readonly heroDamage: number | null;
  readonly damageTaken: number | null;
};

type MatchHistoryGameTeam = {
  readonly id: string; // gameTeamId
  readonly teamNumber: number;
  readonly result: string;
  readonly members: ReadonlyArray<MatchHistoryGameTeamMember>;
};

type MatchHistoryGame = {
  readonly id: string;
  readonly gameNumber: number;
  readonly map: string;
  readonly winnerTeamNumber: number | null;
  readonly teams: ReadonlyArray<MatchHistoryGameTeam>;
};

type MatchHistoryItem = {
  readonly id: string;
  readonly playedAt: string;
  readonly type: MatchType;
  readonly winnerTeamNumber: number | null;
  readonly games: ReadonlyArray<MatchHistoryGame>;
};

type HeroKey = keyof typeof HeroMap;

type MatchBansResponse = {
  readonly matchId: string;
  readonly games: ReadonlyArray<{
    readonly id: string;
    readonly gameNumber: number;
    readonly map: string;
    readonly teams: ReadonlyArray<{
      readonly id: string; // gameTeamId
      readonly teamNumber: number;
      readonly bans: ReadonlyArray<{
        readonly banOrder: number;
        readonly hero: HeroKey;
      }>;
    }>;
  }>;
};

type BanSlots = readonly [HeroKey | null, HeroKey | null, HeroKey | null];

type SaveResult =
  | { readonly status: "idle" }
  | { readonly status: "saving" }
  | { readonly status: "success"; readonly message: string }
  | { readonly status: "error"; readonly message: string };

const DEFAULT_BAN_SLOTS: BanSlots = [null, null, null] as const;

function createBanSlotsFromResponse(
  response: MatchBansResponse
): Record<string, BanSlots> {
  const result: Record<string, BanSlots> = {};

  for (const game of response.games) {
    for (const team of game.teams) {
      const slots: (HeroKey | null)[] = [null, null, null];
      for (const ban of team.bans) {
        const index = ban.banOrder - 1;
        if (index >= 0 && index < 3) {
          slots[index] = ban.hero;
        }
      }
      result[team.id] = [slots[0], slots[1], slots[2]] as BanSlots;
    }
  }

  return result;
}

function isValidHeroKey(input: string): input is HeroKey {
  return Object.prototype.hasOwnProperty.call(HeroMap, input);
}

function formatPlayedAt(iso: string): string {
  // ISO → YYYY-MM-DD
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
  return `${formatPlayedAt(match.playedAt)} · ${typeLabel} · ${
    match.games.length
  }경기 · ${winnerLabel}`;
}

function getTeamMembersLabel(team: MatchHistoryGameTeam): string {
  const nicknames = team.members.map((m) => m.player.nickname).join(", ");
  return nicknames.length > 0 ? nicknames : "-";
}

function validateTeamSlots(slots: BanSlots): string | null {
  const heroes = slots.filter((h): h is HeroKey => h !== null);
  const set = new Set(heroes);
  if (set.size !== heroes.length) {
    return "동일 팀에서 같은 영웅을 중복 밴할 수 없습니다.";
  }
  return null;
}

export default function MatchBansPage() {
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [selectedMatch, setSelectedMatch] = useState<MatchHistoryItem | null>(
    null
  );
  const [banSlotsByGameTeamId, setBanSlotsByGameTeamId] = useState<
    Record<string, BanSlots>
  >({});
  const [saveResult, setSaveResult] = useState<SaveResult>({ status: "idle" });
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(false);
  const [isLoadingBans, setIsLoadingBans] = useState<boolean>(false);
  const [matchSearchText, setMatchSearchText] = useState<string>("");

  const heroOptions = useMemo(() => {
    const heroes = Object.keys(HeroMap).filter(isValidHeroKey);
    heroes.sort((a, b) => HeroMap[a].localeCompare(HeroMap[b], "ko"));
    return heroes;
  }, []);

  const filteredMatches = useMemo(() => {
    const trimmed = matchSearchText.trim();
    if (!trimmed) return matches;
    return matches.filter((m) => getMatchLabel(m).includes(trimmed));
  }, [matches, matchSearchText]);

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
      setBanSlotsByGameTeamId({});
      return;
    }

    const match = matches.find((m) => m.id === selectedMatchId) ?? null;
    setSelectedMatch(match);

    const run = async (): Promise<void> => {
      setIsLoadingBans(true);
      setSaveResult({ status: "idle" });
      try {
        const response = await fetch(`/api/matches/${selectedMatchId}/bans`, {
          cache: "no-store",
        });
        const data: MatchBansResponse | { error: string } =
          await response.json();
        if (!response.ok) {
          const message =
            "error" in data ? data.error : "밴 조회에 실패했습니다.";
          throw new Error(message);
        }

        const nextMap = createBanSlotsFromResponse(data as MatchBansResponse);
        setBanSlotsByGameTeamId(nextMap);
      } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류";
        setSaveResult({ status: "error", message });
      } finally {
        setIsLoadingBans(false);
      }
    };

    void run();
  }, [matches, selectedMatchId]);

  const handleChangeBanSlot = (
    gameTeamId: string,
    index: 0 | 1 | 2,
    hero: HeroKey | null
  ): void => {
    setBanSlotsByGameTeamId((prev) => {
      const current = prev[gameTeamId] ?? DEFAULT_BAN_SLOTS;
      const next: [HeroKey | null, HeroKey | null, HeroKey | null] = [
        current[0],
        current[1],
        current[2],
      ];
      next[index] = hero;
      return { ...prev, [gameTeamId]: next };
    });
  };

  const handleClearTeamBans = (gameTeamId: string): void => {
    setBanSlotsByGameTeamId((prev) => ({
      ...prev,
      [gameTeamId]: DEFAULT_BAN_SLOTS,
    }));
  };

  const handleSave = async (): Promise<void> => {
    if (!selectedMatch) return;

    // 클라이언트 중복 밴 방지(서버에서도 검증함)
    for (const game of selectedMatch.games) {
      for (const team of game.teams) {
        const slots = banSlotsByGameTeamId[team.id] ?? DEFAULT_BAN_SLOTS;
        const error = validateTeamSlots(slots);
        if (error) {
          setSaveResult({
            status: "error",
            message: `${game.gameNumber}경기 ${team.teamNumber}팀: ${error}`,
          });
          return;
        }
      }
    }

    setSaveResult({ status: "saving" });

    try {
      const updates = selectedMatch.games.flatMap((game) =>
        game.teams.map((team) => {
          const slots = banSlotsByGameTeamId[team.id] ?? DEFAULT_BAN_SLOTS;
          return {
            gameTeamId: team.id,
            bans: [
              { banOrder: 1 as const, hero: slots[0] },
              { banOrder: 2 as const, hero: slots[1] },
              { banOrder: 3 as const, hero: slots[2] },
            ],
          };
        })
      );

      const response = await fetch(`/api/matches/${selectedMatch.id}/bans`, {
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
        message: "밴 정보가 저장되었습니다.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setSaveResult({ status: "error", message });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <TopBar title="🚫 내전 밴 입력/수정" value="bans" />

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

            {(isLoadingBans || isLoadingMatches) && selectedMatchId && (
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                밴 정보를 불러오는 중...
              </div>
            )}
          </div>

          {selectedMatch &&
            selectedMatch.games.map((game) => (
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
                    승리:{" "}
                    <span className="text-gray-200">
                      {game.winnerTeamNumber === null
                        ? "무승부"
                        : `${game.winnerTeamNumber}팀`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {game.teams.map((team) => {
                    const slots =
                      banSlotsByGameTeamId[team.id] ?? DEFAULT_BAN_SLOTS;
                    const teamError = validateTeamSlots(slots);

                    return (
                      <div
                        key={team.id}
                        className="bg-white/5 rounded-2xl border border-white/10 p-5 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="text-lg font-bold">
                              {team.teamNumber}팀 밴
                            </div>
                            <div className="text-xs text-gray-500">
                              gameTeamId: {team.id}
                            </div>
                          </div>
                          <button
                            onClick={() => handleClearTeamBans(team.id)}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-all"
                            type="button"
                          >
                            비우기
                          </button>
                        </div>

                        <div className="text-sm text-gray-400">
                          멤버:{" "}
                          <span className="text-gray-200">
                            {getTeamMembersLabel(team)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {[0, 1, 2].map((i) => {
                            const index = i as 0 | 1 | 2;
                            const value = slots[index];

                            return (
                              <div key={index} className="space-y-2">
                                <label className="text-xs text-gray-500">
                                  {index + 1}밴
                                </label>
                                <select
                                  value={value ?? ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    handleChangeBanSlot(
                                      team.id,
                                      index,
                                      v === "" ? null : (v as HeroKey)
                                    );
                                  }}
                                  className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                                >
                                  <option value="" className="bg-[#1a1a2e]">
                                    선택 안 함
                                  </option>
                                  {heroOptions.map((heroKey) => (
                                    <option
                                      key={heroKey}
                                      value={heroKey}
                                      className="bg-[#1a1a2e]"
                                    >
                                      {HeroMap[heroKey]} ({heroKey})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>

                        {teamError && (
                          <div className="p-3 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400 text-sm">
                            {teamError}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

          {selectedMatch && (
            <div className="space-y-4">
              {saveResult.status !== "idle" &&
                saveResult.status !== "saving" && (
                  <div
                    className={`p-4 rounded-xl border ${
                      saveResult.status === "success"
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
                onClick={() => void handleSave()}
                disabled={saveResult.status === "saving" || isLoadingBans}
                className={`w-full px-6 py-4 rounded-xl text-white font-bold text-lg transition-all shadow-lg ${
                  saveResult.status === "saving" || isLoadingBans
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 shadow-cyan-500/25"
                }`}
                type="button"
              >
                {saveResult.status === "saving" ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    저장 중...
                  </span>
                ) : (
                  "밴 저장하기"
                )}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
