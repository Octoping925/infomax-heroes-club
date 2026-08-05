"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import type { PlayerListItem } from "@/app/api/players/route";
import type { ReplayImportPlayer } from "@/domain/hots/replay/contracts";
import {
  buildConfirmRequest,
  createInitialReplayImportState,
  getBlockingReasons,
  isDraftExpired,
  replayImportReducer,
  toDomId,
  validateReplayFiles,
  type ParsedReplay,
  type ReplayQueueItem,
} from "./replay-import-state";

type ParseResponse = ParsedReplay & {
  readonly duplicatePreflight: { readonly status: "unknown" };
};

type ConfirmResponse = {
  readonly matchId: string;
  readonly gamesCreated: number;
  readonly alreadyImported: boolean;
};

type ManualSaveState =
  | { readonly status: "idle" }
  | { readonly status: "saving" }
  | { readonly status: "success" | "error"; readonly message: string };

export function ReplayImportForm() {
  const [state, dispatch] = useReducer(replayImportReducer, undefined, createInitialReplayImportState);
  const [announcement, setAnnouncement] = useState("리플레이 파일을 선택해 주세요.");
  const [isDragging, setIsDragging] = useState(false);
  const filesRef = useRef(new Map<string, File>());
  const uploadingRef = useRef(new Set<string>());
  const fileSequenceRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedPlayers = useMemo(() => state.playerDirectory.status === "ready"
    ? state.playerDirectory.players.toSorted((a, b) => a.nickname.localeCompare(b.nickname, "ko"))
    : [], [state.playerDirectory]);
  const readyItems = useMemo(() => state.queue.filter(isReadyItem), [state.queue]);
  const blockingReasons = useMemo(() => getBlockingReasons(state), [state]);
  const canConfirm = blockingReasons.length === 0 && state.confirm.status !== "saving";
  const rawPlayers = useMemo(() => uniqueReplayPlayers(readyItems), [readyItems]);
  const firstTeams = useMemo(() => originalTeamOptions(readyItems[0], state.playerMappings, sortedPlayers), [readyItems, state.playerMappings, sortedPlayers]);

  const loadPlayers = useCallback(async (): Promise<void> => {
    dispatch({ type: "PLAYER_DIRECTORY_LOADING" });
    try {
      const response = await fetch("/api/players", { cache: "no-store" });
      const data: unknown = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error(readApiMessage(data, "선수 목록을 불러오지 못했습니다."));
      const players = data.filter(isPlayerListItem);
      if (players.length !== data.length) throw new Error("선수 목록 응답이 올바르지 않습니다.");
      dispatch({ type: "PLAYER_DIRECTORY_LOADED", players });
      setAnnouncement(`${players.length}명의 등록 선수 목록을 불러왔습니다.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "선수 목록을 불러오지 못했습니다.";
      dispatch({ type: "PLAYER_DIRECTORY_FAILED", message });
      setAnnouncement(message);
    }
  }, []);

  useEffect(() => {
    void loadPlayers();
  }, [loadPlayers]);

  useEffect(() => {
    const uploading = state.queue.find((item) => item.status === "uploading");
    if (!uploading) {
      if (state.queue.some((item) => item.status === "queued")) dispatch({ type: "NEXT_UPLOAD_STARTED" });
      return;
    }
    if (uploadingRef.current.has(uploading.id)) return;
    uploadingRef.current.add(uploading.id);

    const run = async (): Promise<void> => {
      const source = filesRef.current.get(uploading.id);
      if (!source) {
        dispatch({ type: "UPLOAD_FAILED", id: uploading.id, failure: "network", message: "원본 파일을 찾지 못했습니다. 다시 선택해 주세요." });
        return;
      }
      setAnnouncement(`${uploading.file.name} 분석을 시작했습니다.`);
      try {
        const response = await fetch("/api/matches/replays/parse", {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: source,
        });
        const data: unknown = await response.json();
        if (!response.ok || !isParseResponse(data)) {
          const message = readApiMessage(data, "리플레이를 처리하지 못했습니다.");
          dispatch({ type: "UPLOAD_FAILED", id: uploading.id, failure: response.status >= 500 ? "network" : "parse", message });
          setAnnouncement(`${uploading.file.name}: ${message}`);
          return;
        }
        dispatch({ type: "UPLOAD_SUCCEEDED", id: uploading.id, parsed: data });
        setAnnouncement(`${uploading.file.name} 분석이 완료되었습니다.`);
      } catch {
        const message = "네트워크 오류로 리플레이를 처리하지 못했습니다.";
        dispatch({ type: "UPLOAD_FAILED", id: uploading.id, failure: "network", message });
        setAnnouncement(`${uploading.file.name}: ${message}`);
      } finally {
        uploadingRef.current.delete(uploading.id);
      }
    };
    void run();
  }, [state.queue]);

  const addFiles = (files: ReadonlyArray<File>): void => {
    const descriptors = files.map((file) => {
      fileSequenceRef.current += 1;
      const id = `replay-${Date.now()}-${fileSequenceRef.current}`;
      filesRef.current.set(id, file);
      return { id, name: file.name, size: file.size, lastModified: file.lastModified };
    });
    const acceptedCount = state.queue.filter((item) => item.status !== "error" || item.failure !== "preflight").length;
    const result = validateReplayFiles(descriptors, acceptedCount);
    dispatch({ type: "FILES_ADDED", files: result.accepted });
    result.rejected.forEach((entry) => {
      filesRef.current.delete(entry.file.id);
      dispatch({ type: "FILE_REJECTED", file: entry.file, message: entry.message });
    });
    const message = result.rejected.length === 0
      ? `${result.accepted.length}개 파일을 업로드 대기열에 추가했습니다.`
      : `${result.accepted.length}개 추가, ${result.rejected.length}개는 선택 단계에서 제외했습니다.`;
    setAnnouncement(message);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>): void => {
    addFiles(Array.from(event.target.files ?? []));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const retryFile = (item: ReplayQueueItem): void => {
    if (!filesRef.current.has(item.id)) {
      setAnnouncement(`${item.file.name} 원본이 없어 다시 선택해야 합니다.`);
      return;
    }
    dispatch({ type: "FILE_RETRY_REQUESTED", id: item.id });
    setAnnouncement(`${item.file.name} 재시도를 대기열에 추가했습니다.`);
  };

  const removeFile = (item: ReplayQueueItem): void => {
    filesRef.current.delete(item.id);
    dispatch({ type: "FILE_REMOVED", id: item.id });
    setAnnouncement(`${item.file.name}을 대기열에서 제거했습니다.`);
  };

  const focusFirstProblem = (): void => {
    const targetId = getBlockingReasons(state)[0]?.targetId ?? "confirm-error";
    window.setTimeout(() => document.getElementById(targetId)?.focus(), 0);
  };

  const reparseExpiredDrafts = (): boolean => {
    const expired = readyItems.filter((item) => isDraftExpired(item.parsed.draft));
    if (expired.length === 0) return false;
    expired.forEach((item) => dispatch({ type: "FILE_RETRY_REQUESTED", id: item.id }));
    setAnnouncement(`서명이 만료된 ${expired.length}개 리플레이를 다시 분석합니다. 같은 파일의 선택값은 유지됩니다.`);
    return true;
  };

  const confirmImport = async (): Promise<void> => {
    if (!canConfirm) {
      focusFirstProblem();
      return;
    }
    if (reparseExpiredDrafts()) return;
    dispatch({ type: "CONFIRM_STARTED" });
    setAnnouncement("검토한 매치를 저장하고 있습니다.");
    try {
      const response = await fetch("/api/matches/replays/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildConfirmRequest(state)),
      });
      const data: unknown = await response.json();
      if (!response.ok || !isConfirmResponse(data)) {
        const code = readApiCode(data, "MATCH_CONFIRM_FAILED");
        const message = readApiMessage(data, "매치 저장에 실패했습니다.");
        dispatch({ type: "CONFIRM_FAILED", code, message });
        setAnnouncement(message);
        if (message.includes("초안") || message.includes("만료")) {
          readyItems.forEach((item) => dispatch({ type: "FILE_RETRY_REQUESTED", id: item.id }));
          setAnnouncement("리플레이 초안이 만료되어 원본 파일을 다시 분석합니다.");
        }
        focusFirstProblem();
        return;
      }
      dispatch({ type: "CONFIRM_SUCCEEDED", ...data });
      setAnnouncement(data.alreadyImported ? "이미 저장된 동일 매치를 확인했습니다." : `${data.gamesCreated}개 경기를 저장했습니다.`);
    } catch {
      const message = "응답을 확인하지 못했습니다. 같은 내용으로 다시 저장하면 기존 매치를 안전하게 확인합니다.";
      dispatch({ type: "CONFIRM_FAILED", code: "NETWORK_ERROR", message });
      setAnnouncement(message);
      focusFirstProblem();
    }
  };

  return (
    <div className="space-y-10">
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>

      <section aria-labelledby="upload-heading" className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Replay import</p>
            <h2 id="upload-heading" className="mt-1 text-2xl font-bold">리플레이 업로드</h2>
          </div>
          <p className="text-sm text-gray-400">최대 10개 · 파일당 4MB · 한 번에 하나씩 분석</p>
        </div>

        <div
          className={`rounded-2xl border border-dashed px-6 py-9 text-center transition-colors ${isDragging ? "border-cyan-400 bg-cyan-400/10" : "border-white/20 bg-white/[0.03] hover:border-white/35"}`}
          onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            id="replay-files"
            type="file"
            accept=".StormReplay,application/x-blizzard-replay"
            multiple
            onChange={handleFileInput}
            className="sr-only"
            aria-describedby="replay-file-help"
          />
          <p className="text-base font-semibold">여기에 .StormReplay 파일을 놓으세요</p>
          <p id="replay-file-help" className="mt-1 text-sm text-gray-400">파일은 브라우저에서 바로 Vercel 파서로 전송되며 원본은 저장하지 않습니다.</p>
          <label htmlFor="replay-files" className="mt-5 inline-flex cursor-pointer rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-cyan-300 focus-within:ring-2 focus-within:ring-cyan-300">
            파일 선택
          </label>
        </div>

        <ReplayQueue
          queue={state.queue}
          onRetry={retryFile}
          onRemove={removeFile}
          onMove={(id, direction) => dispatch({ type: "FILE_MOVED", id, direction })}
        />
      </section>

      {readyItems.length > 0 && (
        <>
          <section id="blocking-summary" tabIndex={-1} aria-labelledby="review-status-heading" className="border-y border-white/10 py-5 outline-none focus:ring-2 focus:ring-cyan-400">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 id="review-status-heading" className="text-lg font-bold">검토 상태</h2>
                <p className="mt-1 text-sm text-gray-400">파싱 경고는 저장을 막지 않으며, 아래 해결할 항목만 확인하면 됩니다.</p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${blockingReasons.length === 0 ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>
                {blockingReasons.length === 0 ? "저장 준비 완료" : `${blockingReasons.length}개 항목 확인 필요`}
              </span>
            </div>
            {blockingReasons.length > 0 && (
              <ul className="mt-4 grid gap-2 text-sm text-amber-200 md:grid-cols-2">
                {blockingReasons.map((reason) => <li key={reason.code}>• {reason.message}</li>)}
              </ul>
            )}
          </section>

          <section aria-labelledby="games-heading" className="space-y-4">
            <div>
              <h2 id="games-heading" className="text-xl font-bold">경기 순서와 팀 방향</h2>
              <p className="mt-1 text-sm text-gray-400">첫 경기를 기준으로 팀을 추론합니다. 애매한 경기는 직접 선택해 주세요.</p>
            </div>
            <div className="divide-y divide-white/10 border-y border-white/10">
              {readyItems.map((item, index) => (
                <ReplayGameReview
                  key={item.id}
                  item={item}
                  index={index}
                  count={readyItems.length}
                  orientation={state.orientations[item.parsed.sourceReplayHash]}
                  onOrientation={(orientation) => dispatch({ type: "ORIENTATION_SELECTED", sourceReplayHash: item.parsed.sourceReplayHash, orientation })}
                  onMove={(direction) => dispatch({ type: "FILE_MOVED", id: item.id, direction })}
                />
              ))}
            </div>
          </section>

          <section id="player-mappings" aria-labelledby="mapping-heading" className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="mapping-heading" className="text-xl font-bold">선수 연결</h2>
                <p className="mt-1 text-sm text-gray-400">리플레이 닉네임을 등록된 선수 한 명과 연결합니다.</p>
              </div>
              <PlayerDirectoryStatus state={state.playerDirectory} onRetry={() => void loadPlayers()} />
            </div>
            <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
              {rawPlayers.map((player) => (
                <label key={player.rawName} className="grid gap-1 border-b border-white/8 pb-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] sm:items-center">
                  <span>
                    <span className="block truncate text-sm font-semibold">{player.rawName}</span>
                    <span className="text-xs text-gray-500">{player.hero}{player.suggestedNickname ? ` · 추천 ${player.suggestedNickname}` : ""}</span>
                  </span>
                  <select
                    id={`mapping-${toDomId(player.rawName)}`}
                    value={state.playerMappings[player.rawName] ?? ""}
                    onChange={(event) => dispatch({ type: "PLAYER_MAPPED", rawName: player.rawName, playerId: event.target.value })}
                    disabled={state.playerDirectory.status !== "ready" || sortedPlayers.length === 0}
                    aria-invalid={!state.playerMappings[player.rawName]}
                    className="rounded-lg border border-white/10 bg-[#141421] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">선수 선택</option>
                    {sortedPlayers.map((registered) => <option key={registered.id} value={registered.id}>{registered.nickname} ({registered.name})</option>)}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <section aria-labelledby="match-settings-heading" className="space-y-4">
            <div>
              <h2 id="match-settings-heading" className="text-xl font-bold">매치 정보</h2>
              <p className="mt-1 text-sm text-gray-400">첫 경기의 원래 팀을 기준으로 리더를 정합니다.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <SelectField id="team1-leader" label="원래 1팀 리더" value={state.team1LeaderId} disabled={firstTeams.team1.length === 0} onChange={(value) => dispatch({ type: "LEADER_SELECTED", team: 1, playerId: value })} options={firstTeams.team1} />
              <SelectField id="team2-leader" label="원래 2팀 리더" value={state.team2LeaderId} disabled={firstTeams.team2.length === 0} onChange={(value) => dispatch({ type: "LEADER_SELECTED", team: 2, playerId: value })} options={firstTeams.team2} />
              <SelectField id="match-type" label="시간대" value={state.matchType} onChange={(value) => dispatch({ type: "MATCH_TYPE_SELECTED", matchType: value as "LUNCH" | "DINNER" })} options={[{ id: "LUNCH", label: "점심" }, { id: "DINNER", label: "저녁" }]} />
            </div>
          </section>

          <section aria-labelledby="confirm-heading" className="space-y-4 border-t border-white/10 pt-6">
            <div>
              <h2 id="confirm-heading" className="text-xl font-bold">저장</h2>
              <p className="mt-1 text-sm text-gray-400">준비된 경기 {readyItems.length}개를 하나의 매치로 저장합니다.</p>
            </div>
            {state.confirm.status === "error" && (
              <div id="confirm-error" tabIndex={-1} role="alert" className={`rounded-xl border px-4 py-3 outline-none focus:ring-2 ${state.confirm.code === "MATCH_CONFIRM_CONFLICT" ? "border-amber-400/30 bg-amber-400/10 text-amber-200 focus:ring-amber-400" : "border-red-400/30 bg-red-400/10 text-red-200 focus:ring-red-400"}`}>
                <p className="font-semibold">저장하지 못했습니다</p>
                <p className="mt-1 text-sm">{state.confirm.message}</p>
              </div>
            )}
            {state.confirm.status === "success" && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-4 text-emerald-100">
                <p className="font-bold">{state.confirm.alreadyImported ? "기존 매치를 확인했습니다." : "매치를 저장했습니다."}</p>
                <p className="mt-1 text-sm">{state.confirm.gamesCreated}개 경기 · ID {state.confirm.matchId}</p>
                <Link href="/match-history" className="mt-3 inline-flex text-sm font-semibold text-cyan-300 underline underline-offset-4 hover:text-cyan-100">저장된 전적 보기 →</Link>
              </div>
            )}
            <button
              type="button"
              onClick={() => void confirmImport()}
              disabled={!canConfirm}
              aria-describedby={blockingReasons.length > 0 ? "review-status-heading" : undefined}
              className="w-full rounded-xl bg-cyan-500 px-6 py-4 text-base font-bold text-black transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-500"
            >
              {state.confirm.status === "saving" ? "저장 중…" : `${readyItems.length}개 경기 저장`}
            </button>
          </section>
        </>
      )}

      <ManualJsonFallback players={sortedPlayers} isPlayerDirectoryReady={state.playerDirectory.status === "ready"} />
    </div>
  );
}

function ReplayQueue({
  queue,
  onRetry,
  onRemove,
  onMove,
}: {
  readonly queue: ReadonlyArray<ReplayQueueItem>;
  readonly onRetry: (item: ReplayQueueItem) => void;
  readonly onRemove: (item: ReplayQueueItem) => void;
  readonly onMove: (id: string, direction: "up" | "down") => void;
}) {
  if (queue.length === 0) return null;
  return (
    <div id="replay-queue" tabIndex={-1} className="divide-y divide-white/10 border-y border-white/10 outline-none focus:ring-2 focus:ring-cyan-400">
      {queue.map((item, index) => (
        <div key={item.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
          <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${item.status === "ready" ? "bg-emerald-400" : item.status === "error" ? item.failure === "network" ? "bg-amber-400" : "bg-red-400" : "bg-cyan-400 animate-pulse"}`} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{item.file.name}</p>
            <p className="text-xs text-gray-500">{formatBytes(item.file.size)} · {queueStatus(item)}</p>
            {item.status === "error" && <p id={`file-error-${item.id}`} className={`mt-1 text-xs ${item.failure === "network" ? "text-amber-300" : "text-red-300"}`}>{item.message}</p>}
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => onMove(item.id, "up")} disabled={index === 0 || item.status === "uploading"} aria-label={`${item.file.name} 위로 이동`} className={smallButton}>↑</button>
            <button type="button" onClick={() => onMove(item.id, "down")} disabled={index === queue.length - 1 || item.status === "uploading"} aria-label={`${item.file.name} 아래로 이동`} className={smallButton}>↓</button>
            {item.status === "error" && <button type="button" onClick={() => onRetry(item)} className={smallButton}>재시도</button>}
            <button type="button" onClick={() => onRemove(item)} disabled={item.status === "uploading"} aria-describedby={item.status === "error" ? `file-error-${item.id}` : undefined} className={`${smallButton} text-red-300`}>제거</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReplayGameReview({ item, index, count, orientation, onOrientation, onMove }: {
  readonly item: Extract<ReplayQueueItem, { readonly status: "ready" }>;
  readonly index: number;
  readonly count: number;
  readonly orientation: { readonly value: "NORMAL" | "SWAPPED" | null; readonly source: "inferred" | "manual" } | undefined;
  readonly onOrientation: (value: "NORMAL" | "SWAPPED") => void;
  readonly onMove: (direction: "up" | "down") => void;
}) {
  const { preview } = item.parsed;
  return (
    <details className="group py-4" open={index === 0}>
      <summary className="flex cursor-pointer list-none flex-col gap-3 sm:flex-row sm:items-center">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-sm font-bold text-cyan-300">{index + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{preview.game.map}</span>
          <span className="text-xs text-gray-500">{preview.playedAtKst} · {formatDuration(preview.game.gameLength ?? 0)} · 빌드 {preview.build ?? "미상"}</span>
        </span>
        <span className="flex flex-wrap items-center gap-2" onClick={(event) => event.preventDefault()}>
          <button type="button" onClick={() => onMove("up")} disabled={index === 0} aria-label={`${index + 1}경기 위로 이동`} className={smallButton}>↑</button>
          <button type="button" onClick={() => onMove("down")} disabled={index === count - 1} aria-label={`${index + 1}경기 아래로 이동`} className={smallButton}>↓</button>
          <select
            id={`orientation-${item.id}`}
            value={orientation?.value ?? ""}
            onChange={(event) => onOrientation(event.target.value as "NORMAL" | "SWAPPED")}
            aria-label={`${index + 1}경기 팀 방향`}
            aria-invalid={!orientation?.value}
            className="rounded-lg border border-white/10 bg-[#141421] px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
          >
            <option value="" disabled>팀 방향 선택</option>
            <option value="NORMAL">리플레이 1팀 → 원래 1팀</option>
            <option value="SWAPPED">리플레이 1팀 → 원래 2팀</option>
          </select>
          {orientation?.value && <span className="text-[11px] text-gray-500">{orientation.source === "inferred" ? "자동" : "직접"}</span>}
          <span className="text-xs text-gray-500 group-open:rotate-180" aria-hidden="true">⌄</span>
        </span>
      </summary>
      <div className="mt-4 grid gap-4 pl-0 sm:pl-11 lg:grid-cols-2">
        <TeamPreview label="리플레이 1팀" players={preview.game.team1.players} win={preview.game.team1.win} />
        <TeamPreview label="리플레이 2팀" players={preview.game.team2.players} win={preview.game.team2.win} />
      </div>
      {preview.warnings.length > 0 && (
        <ul className="mt-4 space-y-1 pl-0 text-xs text-amber-300 sm:pl-11">
          {preview.warnings.map((warning) => <li key={warning}>주의 · {warning}</li>)}
        </ul>
      )}
    </details>
  );
}

function TeamPreview({ label, players, win }: { readonly label: string; readonly players: ReadonlyArray<ReplayImportPlayer>; readonly win: boolean }) {
  const totals = players.reduce((sum, player) => ({ kills: sum.kills + player.kills, deaths: sum.deaths + player.deaths, damage: sum.damage + player.heroDamage }), { kills: 0, deaths: 0, damage: 0 });
  return (
    <div className="min-w-0 rounded-xl bg-white/[0.035] p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label} {win && <span className="text-emerald-300">승</span>}</h3>
        <span className="text-[11px] text-gray-500">K {totals.kills} · D {totals.deaths} · 피해 {formatCompact(totals.damage)}</span>
      </div>
      <ul className="space-y-1.5">
        {players.map((player) => (
          <li key={player.rawName} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-xs">
            <span className="truncate"><span className="font-medium text-gray-200">{player.rawName}</span> <span className="text-gray-500">· {player.hero}</span></span>
            <span className="tabular-nums text-gray-400">{player.kills}/{player.deaths}/{player.takedowns} · {formatCompact(player.heroDamage)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlayerDirectoryStatus({ state, onRetry }: { readonly state: ReturnType<typeof createInitialReplayImportState>["playerDirectory"]; readonly onRetry: () => void }) {
  if (state.status === "ready") return <p id="player-directory-status" tabIndex={-1} className="text-sm text-gray-400 outline-none">등록 선수 {state.players.length}명</p>;
  if (state.status === "error") return <div id="player-directory-status" tabIndex={-1} className="flex items-center gap-2 text-sm text-red-300 outline-none"><span>{state.message}</span><button type="button" onClick={onRetry} className="underline underline-offset-4">다시 불러오기</button></div>;
  return <p id="player-directory-status" tabIndex={-1} className="text-sm text-cyan-300 outline-none">등록 선수 불러오는 중…</p>;
}

function SelectField({ id, label, value, options, onChange, disabled = false }: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly options: ReadonlyArray<{ readonly id: string; readonly label: string }>;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-gray-300">
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="w-full rounded-xl border border-white/10 bg-[#141421] px-4 py-3 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 disabled:opacity-50">
        <option value="">선택</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

function ManualJsonFallback({ players, isPlayerDirectoryReady }: { readonly players: ReadonlyArray<PlayerListItem>; readonly isPlayerDirectoryReady: boolean }) {
  const [team1LeaderId, setTeam1LeaderId] = useState("");
  const [team2LeaderId, setTeam2LeaderId] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [result, setResult] = useState<ManualSaveState>({ status: "idle" });

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
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      setResult({ status: "error", message: "JSON 루트는 객체여야 합니다." });
      return;
    }
    setResult({ status: "saving" });
    try {
      const response = await fetch("/api/matches/json", {
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
      <summary className="cursor-pointer text-sm font-semibold text-gray-400 hover:text-white">고급 기능 · 기존 JSON 직접 입력</summary>
      <div className="mt-5 space-y-4 rounded-2xl bg-white/[0.03] p-4 sm:p-6">
        <p className="text-sm text-gray-400">리플레이 파싱을 사용할 수 없을 때만 기존 JSON 입력 방식을 사용하세요.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField id="json-team1-leader" label="팀 1 리더" value={team1LeaderId} onChange={setTeam1LeaderId} disabled={!isPlayerDirectoryReady} options={players.map(toSelectOption)} />
          <SelectField id="json-team2-leader" label="팀 2 리더" value={team2LeaderId} onChange={setTeam2LeaderId} disabled={!isPlayerDirectoryReady} options={players.map(toSelectOption)} />
        </div>
        <label className="block space-y-2 text-sm font-medium text-gray-300">
          <span>매치 JSON 데이터</span>
          <textarea value={jsonText} onChange={(event) => setJsonText(event.target.value)} placeholder={'{\n  "20260213": [ ... ]\n}'} className="h-72 w-full resize-y rounded-xl border border-white/10 bg-[#10101b] px-4 py-3 font-mono text-sm text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30" />
        </label>
        {result.status === "success" || result.status === "error" ? <p role="status" className={result.status === "success" ? "text-sm text-emerald-300" : "text-sm text-red-300"}>{result.message}</p> : null}
        <button type="button" onClick={() => void save()} disabled={result.status === "saving"} className="rounded-xl bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15 disabled:opacity-50">{result.status === "saving" ? "저장 중…" : "JSON으로 저장"}</button>
      </div>
    </details>
  );
}

const smallButton = "rounded-md bg-white/6 px-2.5 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-white/12 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-30";

function isReadyItem(item: ReplayQueueItem): item is Extract<ReplayQueueItem, { readonly status: "ready" }> {
  return item.status === "ready";
}

function uniqueReplayPlayers(items: ReadonlyArray<Extract<ReplayQueueItem, { readonly status: "ready" }>>): ReadonlyArray<ReplayImportPlayer> {
  const players = new Map<string, ReplayImportPlayer>();
  items.forEach((item) => [...item.parsed.preview.game.team1.players, ...item.parsed.preview.game.team2.players].forEach((player) => {
    if (!players.has(player.rawName)) players.set(player.rawName, player);
  }));
  return Array.from(players.values()).toSorted((a, b) => a.rawName.localeCompare(b.rawName, "ko"));
}

function originalTeamOptions(item: Extract<ReplayQueueItem, { readonly status: "ready" }> | undefined, mappings: Readonly<Record<string, string>>, players: ReadonlyArray<PlayerListItem>) {
  const byId = new Map(players.map((player) => [player.id, player]));
  const options = (members: ReadonlyArray<ReplayImportPlayer>) => members.flatMap((member) => {
    const id = mappings[member.rawName];
    const player = id ? byId.get(id) : undefined;
    return player ? [{ id: player.id, label: `${player.nickname} (${player.name})` }] : [];
  });
  return item ? { team1: options(item.parsed.preview.game.team1.players), team2: options(item.parsed.preview.game.team2.players) } : { team1: [], team2: [] };
}

function queueStatus(item: ReplayQueueItem): string {
  if (item.status === "queued") return "대기 중";
  if (item.status === "uploading") return "분석 중";
  if (item.status === "ready") return "분석 완료";
  return item.failure === "network" ? "네트워크 오류" : item.failure === "preflight" ? "선택 오류" : "파싱 실패";
}

function formatBytes(bytes: number): string {
  return bytes < 1_000_000 ? `${Math.ceil(bytes / 1_000)}KB` : `${(bytes / 1_000_000).toFixed(1)}MB`;
}

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlayerListItem(value: unknown): value is PlayerListItem {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string" && typeof value.nickname === "string";
}

function isParseResponse(value: unknown): value is ParseResponse {
  return isRecord(value)
    && typeof value.draft === "string"
    && typeof value.sourceReplayHash === "string"
    && isRecord(value.preview)
    && isRecord(value.duplicatePreflight);
}

function isConfirmResponse(value: unknown): value is ConfirmResponse {
  return isRecord(value)
    && typeof value.matchId === "string"
    && typeof value.gamesCreated === "number"
    && typeof value.alreadyImported === "boolean";
}

function readApiMessage(value: unknown, fallback: string): string {
  if (!isRecord(value)) return fallback;
  if (typeof value.error === "string") return value.error;
  return isRecord(value.error) && typeof value.error.message === "string" ? value.error.message : fallback;
}

function readApiCode(value: unknown, fallback: string): string {
  return isRecord(value) && isRecord(value.error) && typeof value.error.code === "string" ? value.error.code : fallback;
}

function toSelectOption(player: PlayerListItem): { readonly id: string; readonly label: string } {
  return { id: player.id, label: `${player.nickname} (${player.name})` };
}
