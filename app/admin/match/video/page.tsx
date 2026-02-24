"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { TopBar } from "@/components/TopBar";
import type { MatchHistoryItem } from "@/domain/hots/types/match-contract";

type SaveResult =
  | { readonly status: "idle" }
  | { readonly status: "saving" }
  | { readonly status: "success"; readonly message: string }
  | { readonly status: "error"; readonly message: string };

type UpdateMatchMetaResponse = {
  readonly success: true;
  readonly matchId: string;
  readonly youtubeUrl: string | null;
};

type ApiErrorResponse = {
  readonly error: string;
};

function getMatchLabel(match: MatchHistoryItem): string {
  const playedAt = dayjs(match.playedAt).format("YYYY-MM-DD");
  const typeLabel = match.type === "LUNCH" ? "점심" : "저녁";
  const winnerLabel = match.winnerTeamNumber === null ? "무승부" : `${match.winnerTeamNumber}팀 승`;
  return `${playedAt} · ${typeLabel} · ${match.games.length}경기 · ${winnerLabel}`;
}

export default function MatchVideoPage() {
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [youtubeUrlInput, setYoutubeUrlInput] = useState<string>("");
  const [matchSearchText, setMatchSearchText] = useState<string>("");
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(false);
  const [saveResult, setSaveResult] = useState<SaveResult>({ status: "idle" });

  const filteredMatches = useMemo(() => {
    const trimmed = matchSearchText.trim();
    if (!trimmed) {
      return matches;
    }
    return matches.filter((match) => getMatchLabel(match).includes(trimmed));
  }, [matchSearchText, matches]);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) ?? null,
    [matches, selectedMatchId],
  );

  useEffect(() => {
    const run = async (): Promise<void> => {
      setIsLoadingMatches(true);
      try {
        const response = await fetch("/api/matches?take=80", { cache: "no-store" });
        const data: MatchHistoryItem[] | ApiErrorResponse = await response.json();
        if (!response.ok) {
          const message = "error" in data ? data.error : "내전 목록 조회에 실패했습니다.";
          throw new Error(message);
        }
        setMatches(data as MatchHistoryItem[]);
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
    setYoutubeUrlInput(selectedMatch?.youtubeUrl ?? "");
    setSaveResult({ status: "idle" });
  }, [selectedMatch?.youtubeUrl]);

  const handleSave = async (): Promise<void> => {
    if (!selectedMatch) {
      return;
    }

    setSaveResult({ status: "saving" });

    try {
      const response = await fetch(`/api/matches/${selectedMatch.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          youtubeUrl: youtubeUrlInput.trim().length > 0 ? youtubeUrlInput : null,
        }),
      });

      const data: UpdateMatchMetaResponse | ApiErrorResponse = await response.json();
      if (!response.ok) {
        const message = "error" in data ? data.error : "유튜브 링크 저장에 실패했습니다.";
        throw new Error(message);
      }

      const typed = data as UpdateMatchMetaResponse;
      setMatches((prev) =>
        prev.map((match) => (match.id === typed.matchId ? { ...match, youtubeUrl: typed.youtubeUrl } : match)),
      );
      setYoutubeUrlInput(typed.youtubeUrl ?? "");
      setSaveResult({ status: "success", message: "풀영상 유튜브 링크가 저장되었습니다." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setSaveResult({ status: "error", message });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <TopBar title="🎬 내전 풀영상 링크 관리" value="match-video" />

      <main className="w-full px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 md:items-end md:justify-between">
              <div className="space-y-2 w-full">
                <label className="text-sm font-medium text-gray-400">내전 선택</label>
                <select
                  value={selectedMatchId}
                  onChange={(event) => setSelectedMatchId(event.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  disabled={isLoadingMatches}
                >
                  <option value="" className="bg-[#1a1a2e]">
                    {isLoadingMatches ? "불러오는 중..." : "내전을 선택하세요"}
                  </option>
                  {filteredMatches.map((match) => (
                    <option key={match.id} value={match.id} className="bg-[#1a1a2e]">
                      {getMatchLabel(match)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 w-full md:max-w-sm">
                <label className="text-sm font-medium text-gray-400">검색(라벨)</label>
                <input
                  value={matchSearchText}
                  onChange={(event) => setMatchSearchText(event.target.value)}
                  placeholder="예) 2026-02-24 / 저녁 / 3경기"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
              </div>
            </div>

            {selectedMatch && (
              <div className="text-sm text-gray-400">
                선택됨: <span className="text-gray-200">{getMatchLabel(selectedMatch)}</span>{" "}
                <span className="text-gray-600">(matchId: {selectedMatch.id})</span>
              </div>
            )}
          </div>

          {selectedMatch && (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">유튜브 풀영상 링크</label>
                <input
                  value={youtubeUrlInput}
                  onChange={(event) => setYoutubeUrlInput(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
                <p className="text-xs text-gray-500">
                  비워서 저장하면 링크가 제거됩니다. youtu.be, shorts, watch 링크 모두 등록 가능합니다.
                </p>
              </div>

              {youtubeUrlInput.trim().length > 0 && (
                <a
                  href={youtubeUrlInput}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"
                >
                  입력 링크 열기 ↗
                </a>
              )}

              {saveResult.status !== "idle" && (
                <div
                  className={`p-4 rounded-xl border ${
                    saveResult.status === "success"
                      ? "bg-green-500/10 border-green-500/30 text-green-400"
                      : saveResult.status === "saving"
                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                        : "bg-red-500/10 border-red-500/30 text-red-400"
                  }`}
                >
                  <p className="font-medium">
                    {saveResult.status === "success"
                      ? `✅ ${saveResult.message}`
                      : saveResult.status === "saving"
                        ? "저장 중..."
                        : `❌ ${saveResult.message}`}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={saveResult.status === "saving"}
                className={`w-full px-6 py-4 rounded-xl text-white font-bold text-lg transition-all shadow-lg ${
                  saveResult.status === "saving"
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 shadow-cyan-500/25"
                }`}
              >
                {saveResult.status === "saving" ? "저장 중..." : "유튜브 링크 저장하기"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
