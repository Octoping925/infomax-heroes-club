"use client";

import { useState } from "react";
import type { PlayerListItem } from "@/app/api/players/route";
import { fetchWithTimeout } from "./fetch-with-timeout";
import { SelectField, isRecord, readApiMessage, toSelectOption } from "./form-shared";

type ManualSaveState =
  | { readonly status: "idle" }
  | { readonly status: "saving" }
  | { readonly status: "success" | "error"; readonly message: string };

export default function ManualJsonForm({ players }: { readonly players: ReadonlyArray<PlayerListItem> }) {
  const [team1LeaderId, setTeam1LeaderId] = useState("");
  const [team2LeaderId, setTeam2LeaderId] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [result, setResult] = useState<ManualSaveState>({ status: "idle" });
  const leaderOptions = players.map(toSelectOption);

  const save = async (): Promise<void> => {
    if (!team1LeaderId || !team2LeaderId || team1LeaderId === team2LeaderId) {
      setResult({ status: "error", message: "서로 다른 두 팀 리더를 선택해 주세요." });
      return;
    }
    let data: unknown;
    try {
      data = JSON.parse(jsonText);
    } catch {
      setResult({ status: "error", message: "JSON 문법을 확인해 주세요." });
      return;
    }
    if (!isRecord(data)) {
      setResult({ status: "error", message: "JSON 루트는 객체여야 합니다." });
      return;
    }
    setResult({ status: "saving" });
    try {
      const response = await fetchWithTimeout("/api/matches/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team1LeaderId, team2LeaderId, data }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(readApiMessage(body, "JSON 저장에 실패했습니다."));
      const gamesCreated = isRecord(body) && typeof body.gamesCreated === "number" ? body.gamesCreated : 0;
      setResult({ status: "success", message: `${gamesCreated}개 경기를 저장했습니다.` });
    } catch (error) {
      setResult({ status: "error", message: error instanceof Error ? error.message : "JSON 저장에 실패했습니다." });
    }
  };

  return (
    <details className="border-t border-white/10 pt-6">
      <summary className="cursor-pointer text-sm font-semibold text-gray-400 hover:text-white">
        고급 기능 · 기존 JSON 직접 입력
      </summary>
      <div className="mt-5 space-y-4 rounded-2xl bg-white/3 p-4 sm:p-6">
        <p className="text-sm text-gray-400">리플레이 파싱을 사용할 수 없을 때만 기존 JSON 입력 방식을 사용하세요.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            id="json-team1-leader"
            label="팀 1 리더"
            value={team1LeaderId}
            onChange={setTeam1LeaderId}
            options={leaderOptions}
          />
          <SelectField
            id="json-team2-leader"
            label="팀 2 리더"
            value={team2LeaderId}
            onChange={setTeam2LeaderId}
            options={leaderOptions}
          />
        </div>
        <label className="block space-y-2 text-sm font-medium text-gray-300">
          <span>매치 JSON 데이터</span>
          <textarea
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            placeholder={'{\n  "20260213": [ ... ]\n}'}
            className="h-72 w-full resize-y rounded-xl border border-white/10 bg-[#10101b] px-4 py-3 font-mono text-sm text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
          />
        </label>
        {result.status === "success" || result.status === "error" ? (
          <p
            role="status"
            className={result.status === "success" ? "text-sm text-emerald-300" : "text-sm text-red-300"}
          >
            {result.message}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void save()}
          disabled={result.status === "saving"}
          className="rounded-xl bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15 disabled:opacity-50"
        >
          {result.status === "saving" ? "저장 중…" : "JSON으로 저장"}
        </button>
      </div>
    </details>
  );
}
