"use client";

import { useEffect, useMemo, useState } from "react";
import { TopBar } from "@/components/TopBar";
import type { PlayerListItem } from "@/app/api/players/route";

type SaveResult =
  | { readonly status: "idle" }
  | { readonly status: "saving" }
  | { readonly status: "success"; readonly message: string }
  | { readonly status: "error"; readonly message: string };

type UpdateMatchTalentsFromJsonResponse = {
  readonly matchesUpdated: number;
  readonly gamesUpdated: number;
  readonly playersUpdated: number;
  readonly skippedReasons: ReadonlyArray<string>;
};

type ApiErrorResponse = {
  readonly error: string;
};

export default function MatchTalentJsonPage() {
  const [jsonText, setJsonText] = useState<string>("");
  const [saveResult, setSaveResult] = useState<SaveResult>({ status: "idle" });
  const [lastResponse, setLastResponse] = useState<UpdateMatchTalentsFromJsonResponse | null>(null);

  const handleSubmit = async (): Promise<void> => {
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
    setLastResponse(null);

    try {
      const response = await fetch("/api/matches/json/talents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: parsed,
        }),
      });

      const data: UpdateMatchTalentsFromJsonResponse | ApiErrorResponse = await response.json();
      if (!response.ok) {
        const message = "error" in data ? data.error : "특성 저장에 실패했습니다.";
        throw new Error(message);
      }

      const typed = data as UpdateMatchTalentsFromJsonResponse;
      setLastResponse(typed);
      setSaveResult({
        status: "success",
        message: `적용 완료: ${typed.matchesUpdated}개 매치 / ${typed.gamesUpdated}개 경기 / ${typed.playersUpdated}명`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setSaveResult({ status: "error", message });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <TopBar title="✨ 내전 특성 JSON 입력" value="match-talents" />

      <main className="w-full px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">특성 JSON 데이터</h2>
              <span className="text-xs text-gray-500">/api/matches/json/talents</span>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={`{\n  "20260318": [\n    {\n      "date": "20260318",\n      "idx": 1,\n      "team1": {\n        "players": [\n          {\n            "name": "봉차장님왼팔",\n            "talents": {\n              "1": "MuradinThirdWindThirdWind",\n              "4": "MuradinMasteryDwarfTossHeavyImpact"\n            }\n          }\n        ]\n      },\n      "team2": { "players": [] }\n    }\n  ]\n}`}
              className="w-full h-[520px] px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all font-mono text-sm resize-y"
            />
            <p className="text-xs text-gray-500">
              <code>create-from-json</code>과 같은 날짜/게임/팀/플레이어 구조를 사용합니다. 각 플레이어는{" "}
              <code>talents</code>만 추가하면 되고, <code>talents</code>가 없는 플레이어는 건드리지 않습니다.
            </p>
            <p className="text-xs text-gray-500">
              <code>talents</code>는 배열(<code>{'["...", null, "..."]'}</code>) 또는 티어 객체(
              <code>{'{ "1": "...", "4": "..." }'}</code>) 모두 가능합니다.
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

          {lastResponse && lastResponse.skippedReasons.length > 0 && (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-3">
              <h3 className="text-lg font-bold">스킵 내역</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                {lastResponse.skippedReasons.map((reason) => (
                  <li key={reason} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    {reason}
                  </li>
                ))}
              </ul>
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
            {saveResult.status === "saving" ? "특성 저장 중..." : "특성 JSON 적용하기"}
          </button>
        </div>
      </main>
    </div>
  );
}
