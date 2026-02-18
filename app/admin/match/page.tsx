"use client";

import { useEffect, useMemo, useState } from "react";
import { TopBar } from "@/components/TopBar";
import type { PlayerListItem } from "@/app/api/players/route";

type SaveResult =
  | { readonly status: "idle" }
  | { readonly status: "saving" }
  | { readonly status: "success"; readonly message: string }
  | { readonly status: "error"; readonly message: string };

type CreateMatchesFromJsonResponse = {
  readonly matchesCreated: number;
  readonly gamesCreated: number;
  readonly matchIds: ReadonlyArray<string>;
};

type ApiErrorResponse = {
  readonly error: string;
};

/**
 * 내전 경기 입력 페이지
 */
export default function MatchJsonInputPage() {
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [team1LeaderId, setTeam1LeaderId] = useState<string>("");
  const [team2LeaderId, setTeam2LeaderId] = useState<string>("");
  const [jsonText, setJsonText] = useState<string>("");
  const [isLoadingPlayers, setIsLoadingPlayers] = useState<boolean>(false);
  const [saveResult, setSaveResult] = useState<SaveResult>({ status: "idle" });

  const sortedPlayers = useMemo(() => {
    return players.toSorted((a, b) => a.nickname.localeCompare(b.nickname, "ko"));
  }, [players]);

  useEffect(() => {
    const run = async (): Promise<void> => {
      setIsLoadingPlayers(true);
      try {
        const response = await fetch("/api/players", { cache: "no-store" });
        const data: PlayerListItem[] | ApiErrorResponse = await response.json();
        if (!response.ok) {
          const message = "error" in data ? data.error : "플레이어 목록 조회에 실패했습니다.";
          throw new Error(message);
        }
        setPlayers(data as PlayerListItem[]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류";
        setSaveResult({ status: "error", message });
      } finally {
        setIsLoadingPlayers(false);
      }
    };

    run();
  }, []);

  const handleSubmit = async (): Promise<void> => {
    if (!team1LeaderId || !team2LeaderId) {
      setSaveResult({ status: "error", message: "팀 리더를 모두 선택해주세요." });
      return;
    }
    if (team1LeaderId === team2LeaderId) {
      setSaveResult({ status: "error", message: "서로 다른 리더를 선택해주세요." });
      return;
    }
    if (!jsonText.trim()) {
      setSaveResult({ status: "error", message: "JSON 데이터를 입력해주세요." });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setSaveResult({ status: "error", message: "JSON 파싱에 실패했습니다. 문법을 확인해주세요." });
      return;
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      setSaveResult({ status: "error", message: "JSON 루트는 객체여야 합니다." });
      return;
    }

    setSaveResult({ status: "saving" });

    try {
      const response = await fetch("/api/matches/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team1LeaderId,
          team2LeaderId,
          data: parsed,
        }),
      });

      const data: CreateMatchesFromJsonResponse | ApiErrorResponse = await response.json();
      if (!response.ok) {
        const message = "error" in data ? data.error : "저장에 실패했습니다.";
        throw new Error(message);
      }

      const typed = data as CreateMatchesFromJsonResponse;
      setSaveResult({
        status: "success",
        message: `저장 완료: ${typed.matchesCreated}개 매치, ${typed.gamesCreated}개 경기`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setSaveResult({ status: "error", message });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <TopBar title="📝 내전 경기 입력" value="match" />

      <main className="w-full px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* 기본 정보 카드 */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-bold mb-6">기본 정보</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">팀 1 리더 ID</label>
                <select
                  value={team1LeaderId}
                  onChange={(e) => setTeam1LeaderId(e.target.value)}
                  disabled={isLoadingPlayers}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                >
                  <option value="" className="bg-[#1a1a2e]">
                    리더 선택
                  </option>
                  {sortedPlayers.map((player) => (
                    <option key={player.id} value={player.id} className="bg-[#1a1a2e]">
                      {player.nickname} ({player.name})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 break-all">
                  {team1LeaderId ? `선택된 ID: ${team1LeaderId}` : "리더를 선택하면 ID가 표시됩니다."}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">팀 2 리더 ID</label>
                <select
                  value={team2LeaderId}
                  onChange={(e) => setTeam2LeaderId(e.target.value)}
                  disabled={isLoadingPlayers}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                >
                  <option value="" className="bg-[#1a1a2e]">
                    리더 선택
                  </option>
                  {sortedPlayers.map((player) => (
                    <option key={player.id} value={player.id} className="bg-[#1a1a2e]">
                      {player.nickname} ({player.name})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 break-all">
                  {team2LeaderId ? `선택된 ID: ${team2LeaderId}` : "리더를 선택하면 ID가 표시됩니다."}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">매치 JSON 데이터</h2>
              <span className="text-xs text-gray-500">/api/matches/json</span>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={`{\n  "20260213": [\n    {\n      "date": "20260213",\n      "idx": 1,\n      "gameLength": 1266.125,\n      "map": "하나무라 사원",\n      "team1": { ... },\n      "team2": { ... }\n    }\n  ]\n}`}
              className="w-full h-[520px] px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all font-mono text-sm resize-y"
            />
            <p className="text-xs text-gray-500">
              루트는 날짜 키(`YYYYMMDD`)를 가진 객체여야 하며, 값은 게임 배열입니다.
            </p>
          </div>

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
            onClick={handleSubmit}
            disabled={saveResult.status === "saving"}
            className={`w-full px-6 py-4 rounded-xl text-white font-bold text-lg transition-all shadow-lg ${
              saveResult.status === "saving"
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 shadow-cyan-500/25"
            }`}
          >
            {saveResult.status === "saving" ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                저장 중...
              </span>
            ) : (
              "내전 저장하기"
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
