import type { PlayerListItem } from "@/app/api/players/route";
import type { NormalizedReplay } from "@/domain/hots/replay/contracts";
import {
  REPLAY_FILE_MAX_BYTES,
  REPLAY_MAX_BATCH_FILES,
} from "@/domain/hots/replay/limits";

export type ReplayFileDescriptor = {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly lastModified: number;
};

export type ParsedReplay = {
  readonly draft: string;
  readonly sourceReplayHash: string;
  readonly preview: NormalizedReplay;
};

type QueueBase = {
  readonly id: string;
  readonly file: ReplayFileDescriptor;
};

export type ReplayQueueItem =
  | (QueueBase & { readonly status: "queued" })
  | (QueueBase & { readonly status: "uploading" })
  | (QueueBase & { readonly status: "ready"; readonly parsed: ParsedReplay })
  | (QueueBase & {
      readonly status: "error";
      readonly failure: "preflight" | "parse" | "network";
      readonly message: string;
    });

export type Orientation = "NORMAL" | "SWAPPED";

export type OrientationChoice = {
  readonly value: Orientation | null;
  readonly source: "inferred" | "manual";
};

export type PlayerDirectoryState =
  | { readonly status: "idle" | "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly players: ReadonlyArray<PlayerListItem> };

export type ConfirmState =
  | { readonly status: "idle" }
  | { readonly status: "saving" }
  | {
      readonly status: "success";
      readonly matchId: string;
      readonly gamesCreated: number;
      readonly alreadyImported: boolean;
    }
  | { readonly status: "error"; readonly code: string; readonly message: string };

export type ReplayImportState = {
  readonly queue: ReadonlyArray<ReplayQueueItem>;
  readonly playerDirectory: PlayerDirectoryState;
  readonly playerMappings: Readonly<Record<string, string>>;
  readonly orientations: Readonly<Record<string, OrientationChoice>>;
  readonly team1LeaderId: string;
  readonly team2LeaderId: string;
  readonly matchType: "LUNCH" | "DINNER";
  readonly confirm: ConfirmState;
};

export type ReplayImportAction =
  | { readonly type: "FILES_ADDED"; readonly files: ReadonlyArray<ReplayFileDescriptor> }
  | {
      readonly type: "FILE_REJECTED";
      readonly file: ReplayFileDescriptor;
      readonly message: string;
    }
  | { readonly type: "NEXT_UPLOAD_STARTED" }
  | { readonly type: "UPLOAD_SUCCEEDED"; readonly id: string; readonly parsed: ParsedReplay }
  | {
      readonly type: "UPLOAD_FAILED";
      readonly id: string;
      readonly failure: "parse" | "network";
      readonly message: string;
    }
  | { readonly type: "FILE_RETRY_REQUESTED"; readonly id: string }
  | { readonly type: "FILE_REMOVED"; readonly id: string }
  | { readonly type: "FILE_MOVED"; readonly id: string; readonly direction: "up" | "down" }
  | { readonly type: "PLAYER_DIRECTORY_LOADING" }
  | { readonly type: "PLAYER_DIRECTORY_FAILED"; readonly message: string }
  | { readonly type: "PLAYER_DIRECTORY_LOADED"; readonly players: ReadonlyArray<PlayerListItem> }
  | { readonly type: "PLAYER_MAPPED"; readonly rawName: string; readonly playerId: string }
  | {
      readonly type: "ORIENTATION_SELECTED";
      readonly sourceReplayHash: string;
      readonly orientation: Orientation;
    }
  | { readonly type: "LEADER_SELECTED"; readonly team: 1 | 2; readonly playerId: string }
  | { readonly type: "MATCH_TYPE_SELECTED"; readonly matchType: "LUNCH" | "DINNER" }
  | { readonly type: "CONFIRM_STARTED" }
  | {
      readonly type: "CONFIRM_SUCCEEDED";
      readonly matchId: string;
      readonly gamesCreated: number;
      readonly alreadyImported: boolean;
    }
  | { readonly type: "CONFIRM_FAILED"; readonly code: string; readonly message: string };

export type BlockingReasonCode =
  | "NO_VALID_GAMES"
  | "UPLOAD_IN_PROGRESS"
  | "PLAYER_DIRECTORY_LOADING"
  | "PLAYER_DIRECTORY_FAILED"
  | "PLAYER_DIRECTORY_EMPTY"
  | "MISSING_PLAYER_MAPPING"
  | "PLAYER_COLLISION"
  | "DUPLICATE_REPLAY"
  | "MIXED_DATES"
  | "AMBIGUOUS_ORIENTATION"
  | "MISSING_TEAM1_LEADER"
  | "MISSING_TEAM2_LEADER";

export type BlockingReason = {
  readonly code: BlockingReasonCode;
  readonly message: string;
  readonly targetId: string;
};

export type FileValidationErrorCode =
  | "INVALID_EXTENSION"
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "BATCH_LIMIT_EXCEEDED";

export type FileValidationResult = {
  readonly accepted: ReadonlyArray<ReplayFileDescriptor>;
  readonly rejected: ReadonlyArray<{
    readonly file: ReplayFileDescriptor;
    readonly code: FileValidationErrorCode;
    readonly message: string;
  }>;
};

export function createInitialReplayImportState(): ReplayImportState {
  return {
    queue: [],
    playerDirectory: { status: "idle" },
    playerMappings: {},
    orientations: {},
    team1LeaderId: "",
    team2LeaderId: "",
    matchType: "DINNER",
    confirm: { status: "idle" },
  };
}

export function replayImportReducer(
  state: ReplayImportState,
  action: ReplayImportAction,
): ReplayImportState {
  switch (action.type) {
    case "FILES_ADDED":
      return resetConfirm({
        ...state,
        queue: [
          ...state.queue,
          ...action.files.map((file): ReplayQueueItem => ({ id: file.id, file, status: "queued" })),
        ],
      });
    case "FILE_REJECTED":
      return resetConfirm({
        ...state,
        queue: [
          ...state.queue,
          {
            id: action.file.id,
            file: action.file,
            status: "error",
            failure: "preflight",
            message: action.message,
          },
        ],
      });
    case "NEXT_UPLOAD_STARTED": {
      if (state.queue.some((item) => item.status === "uploading")) return state;
      const next = state.queue.find((item) => item.status === "queued");
      if (!next) return state;
      return {
        ...state,
        queue: state.queue.map((item) => item.id === next.id ? { ...item, status: "uploading" } : item),
      };
    }
    case "UPLOAD_SUCCEEDED": {
      const uploaded = resetConfirm({
        ...state,
        queue: state.queue.map((item) => item.id === action.id
          ? { id: item.id, file: item.file, status: "ready", parsed: action.parsed }
          : item),
      });
      if (uploaded.playerDirectory.status !== "ready") {
        return reconcileReadyChoices(uploaded);
      }
      return reconcileReadyChoices({
        ...uploaded,
        playerMappings: applySuggestedMappings(uploaded, uploaded.playerDirectory.players),
      });
    }
    case "UPLOAD_FAILED":
      return reconcileReadyChoices({
        ...state,
        queue: state.queue.map((item) => item.id === action.id
          ? { id: item.id, file: item.file, status: "error", failure: action.failure, message: action.message }
          : item),
      });
    case "FILE_RETRY_REQUESTED":
      return reconcileReadyChoices(resetConfirm({
        ...state,
        queue: state.queue.map((item) => item.id === action.id
          ? { id: item.id, file: item.file, status: "queued" }
          : item),
      }));
    case "FILE_REMOVED":
      return reconcileReadyChoices(resetConfirm({
        ...state,
        queue: state.queue.filter((item) => item.id !== action.id),
      }));
    case "FILE_MOVED":
      return reconcileReadyChoices(resetConfirm({ ...state, queue: moveItem(state.queue, action.id, action.direction) }));
    case "PLAYER_DIRECTORY_LOADING":
      return { ...state, playerDirectory: { status: "loading" } };
    case "PLAYER_DIRECTORY_FAILED":
      return { ...state, playerDirectory: { status: "error", message: action.message } };
    case "PLAYER_DIRECTORY_LOADED":
      return reconcileReadyChoices({
        ...state,
        playerDirectory: { status: "ready", players: action.players },
        playerMappings: applySuggestedMappings(state, action.players),
      });
    case "PLAYER_MAPPED":
      return reconcileReadyChoices(resetConfirm({
        ...state,
        playerMappings: action.playerId
          ? { ...state.playerMappings, [action.rawName]: action.playerId }
          : omitKey(state.playerMappings, action.rawName),
      }));
    case "ORIENTATION_SELECTED": {
      const first = readyItems(state.queue)[0];
      if (first?.parsed.sourceReplayHash === action.sourceReplayHash) return state;
      return resetConfirm({
        ...state,
        orientations: {
          ...state.orientations,
          [action.sourceReplayHash]: { value: action.orientation, source: "manual" },
        },
      });
    }
    case "LEADER_SELECTED":
      return resetConfirm(action.team === 1
        ? { ...state, team1LeaderId: action.playerId }
        : { ...state, team2LeaderId: action.playerId });
    case "MATCH_TYPE_SELECTED":
      return resetConfirm({ ...state, matchType: action.matchType });
    case "CONFIRM_STARTED":
      return { ...state, confirm: { status: "saving" } };
    case "CONFIRM_SUCCEEDED":
      return {
        ...state,
        confirm: {
          status: "success",
          matchId: action.matchId,
          gamesCreated: action.gamesCreated,
          alreadyImported: action.alreadyImported,
        },
      };
    case "CONFIRM_FAILED":
      return { ...state, confirm: { status: "error", code: action.code, message: action.message } };
  }
}

export function validateReplayFiles(
  files: ReadonlyArray<ReplayFileDescriptor>,
  currentCount: number,
): FileValidationResult {
  const accepted: ReplayFileDescriptor[] = [];
  const rejected: FileValidationResult["rejected"][number][] = [];
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".stormreplay")) {
      rejected.push({ file, code: "INVALID_EXTENSION", message: ".StormReplay 파일만 선택할 수 있습니다." });
      continue;
    }
    if (file.size === 0) {
      rejected.push({ file, code: "EMPTY_FILE", message: "빈 리플레이 파일은 업로드할 수 없습니다." });
      continue;
    }
    if (file.size > REPLAY_FILE_MAX_BYTES) {
      rejected.push({ file, code: "FILE_TOO_LARGE", message: "리플레이 파일은 4,000,000 bytes 이하여야 합니다." });
      continue;
    }
    if (currentCount + accepted.length >= REPLAY_MAX_BATCH_FILES) {
      rejected.push({ file, code: "BATCH_LIMIT_EXCEEDED", message: "한 번에 최대 10개까지 처리할 수 있습니다." });
      continue;
    }
    accepted.push(file);
  }
  return { accepted, rejected };
}

export function getBlockingReasons(state: ReplayImportState): ReadonlyArray<BlockingReason> {
  const reasons: BlockingReason[] = [];
  const ready = readyItems(state.queue);
  if (ready.length === 0) {
    reasons.push({ code: "NO_VALID_GAMES", message: "저장할 수 있는 리플레이가 없습니다.", targetId: "replay-files" });
  }
  if (state.queue.some((item) => item.status === "queued" || item.status === "uploading")) {
    reasons.push({ code: "UPLOAD_IN_PROGRESS", message: "모든 리플레이 처리가 끝날 때까지 기다려 주세요.", targetId: "replay-queue" });
  }
  if (state.playerDirectory.status === "idle" || state.playerDirectory.status === "loading") {
    reasons.push({ code: "PLAYER_DIRECTORY_LOADING", message: "등록 선수 목록을 불러오는 중입니다.", targetId: "player-directory-status" });
  } else if (state.playerDirectory.status === "error") {
    reasons.push({ code: "PLAYER_DIRECTORY_FAILED", message: "등록 선수 목록을 불러오지 못했습니다.", targetId: "player-directory-status" });
  } else if (state.playerDirectory.status === "ready" && state.playerDirectory.players.length === 0) {
    reasons.push({ code: "PLAYER_DIRECTORY_EMPTY", message: "등록된 선수가 없어 매핑할 수 없습니다.", targetId: "player-directory-status" });
  }

  const rawNames = allRawNames(ready);
  const missing = rawNames.filter((rawName) => !state.playerMappings[rawName]);
  if (missing.length > 0) {
    reasons.push({
      code: "MISSING_PLAYER_MAPPING",
      message: `${missing.length}명의 리플레이 선수를 등록 선수와 연결해 주세요.`,
      targetId: `mapping-${toDomId(missing[0])}`,
    });
  }
  if (hasPlayerCollision(ready, state.playerMappings)) {
    reasons.push({
      code: "PLAYER_COLLISION",
      message: "한 경기에서 같은 등록 선수가 두 번 선택되었습니다.",
      targetId: "player-mappings",
    });
  }
  const hashes = ready.map((item) => item.parsed.sourceReplayHash);
  if (new Set(hashes).size !== hashes.length) {
    reasons.push({
      code: "DUPLICATE_REPLAY",
      message: "같은 리플레이가 두 번 포함되었습니다. 중복 파일을 제거해 주세요.",
      targetId: "replay-queue",
    });
  }
  if (new Set(ready.map((item) => item.parsed.preview.dateKey)).size > 1) {
    reasons.push({
      code: "MIXED_DATES",
      message: "서로 다른 날짜의 리플레이는 나누어 저장해 주세요.",
      targetId: "blocking-summary",
    });
  }
  const ambiguous = ready.find((item) => !state.orientations[item.parsed.sourceReplayHash]?.value);
  if (ambiguous) {
    reasons.push({
      code: "AMBIGUOUS_ORIENTATION",
      message: "자동 판별할 수 없는 경기의 팀 방향을 선택해 주세요.",
      targetId: `orientation-${ambiguous.id}`,
    });
  }

  const original = originalTeamPlayerIds(ready[0], state.playerMappings);
  if (!state.team1LeaderId || !original.team1.includes(state.team1LeaderId)) {
    reasons.push({ code: "MISSING_TEAM1_LEADER", message: "원래 1팀 리더를 선택해 주세요.", targetId: "team1-leader" });
  }
  if (!state.team2LeaderId || !original.team2.includes(state.team2LeaderId)) {
    reasons.push({ code: "MISSING_TEAM2_LEADER", message: "원래 2팀 리더를 선택해 주세요.", targetId: "team2-leader" });
  }
  return reasons;
}

export function buildConfirmRequest(state: ReplayImportState): {
  readonly drafts: ReadonlyArray<{
    readonly token: string;
    readonly gameNumber: number;
    readonly orientation: Orientation;
  }>;
  readonly playerMappings: Readonly<Record<string, string>>;
  readonly team1LeaderId: string;
  readonly team2LeaderId: string;
  readonly type: "LUNCH" | "DINNER";
} {
  return {
    drafts: readyItems(state.queue).map((item, index) => ({
      token: item.parsed.draft,
      gameNumber: index + 1,
      orientation: state.orientations[item.parsed.sourceReplayHash]?.value ?? "NORMAL",
    })),
    playerMappings: state.playerMappings,
    team1LeaderId: state.team1LeaderId,
    team2LeaderId: state.team2LeaderId,
    type: state.matchType,
  };
}

export function getDraftExpiry(token: string): number | null {
  try {
    const [payload] = token.split(".");
    if (!payload) return null;
    const json = globalThis.atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null || !("expiresAt" in parsed)) return null;
    const expiresAt = (parsed as { readonly expiresAt?: unknown }).expiresAt;
    return Number.isSafeInteger(expiresAt) ? Number(expiresAt) : null;
  } catch {
    return null;
  }
}

export function isDraftExpired(token: string, now = Date.now()): boolean {
  const expiresAt = getDraftExpiry(token);
  return expiresAt !== null && Math.floor(now / 1_000) >= expiresAt;
}

export function toDomId(value: string): string {
  return encodeURIComponent(value).replaceAll("%", "-");
}

function reconcileReadyChoices(state: ReplayImportState): ReplayImportState {
  const ready = readyItems(state.queue);
  const rawNames = new Set(allRawNames(ready));
  const playerMappings = Object.fromEntries(
    Object.entries(state.playerMappings).filter(([rawName]) => rawNames.has(rawName)),
  );
  const orientations: Record<string, OrientationChoice> = {};
  ready.forEach((item, index) => {
    const hash = item.parsed.sourceReplayHash;
    if (index === 0) {
      orientations[hash] = { value: "NORMAL", source: "inferred" };
      return;
    }
    const existing = state.orientations[hash];
    if (existing?.source === "manual") {
      orientations[hash] = existing;
      return;
    }
    orientations[hash] = {
      value: inferOrientation(ready[0], item, playerMappings),
      source: "inferred",
    };
  });
  const original = originalTeamPlayerIds(ready[0], playerMappings);
  return {
    ...state,
    playerMappings,
    orientations,
    team1LeaderId: original.team1.includes(state.team1LeaderId) ? state.team1LeaderId : "",
    team2LeaderId: original.team2.includes(state.team2LeaderId) ? state.team2LeaderId : "",
  };
}

function inferOrientation(
  first: Extract<ReplayQueueItem, { readonly status: "ready" }> | undefined,
  current: Extract<ReplayQueueItem, { readonly status: "ready" }>,
  mappings: Readonly<Record<string, string>>,
): Orientation | null {
  if (!first) return null;
  const source1 = mappedTeam(first.parsed.preview.game.team1.players, mappings);
  const source2 = mappedTeam(first.parsed.preview.game.team2.players, mappings);
  const current1 = mappedTeam(current.parsed.preview.game.team1.players, mappings);
  const current2 = mappedTeam(current.parsed.preview.game.team2.players, mappings);
  if ([source1, source2, current1, current2].some((team) => team.length !== 5)) return null;
  const normal = overlap(current1, source1) + overlap(current2, source2);
  const swapped = overlap(current1, source2) + overlap(current2, source1);
  return normal === swapped ? null : normal > swapped ? "NORMAL" : "SWAPPED";
}

function readyItems(queue: ReadonlyArray<ReplayQueueItem>) {
  return queue.filter((item): item is Extract<ReplayQueueItem, { readonly status: "ready" }> => item.status === "ready");
}

function allRawNames(ready: ReturnType<typeof readyItems>): string[] {
  return Array.from(new Set(ready.flatMap((item) => [
    ...item.parsed.preview.game.team1.players.map((player) => player.rawName),
    ...item.parsed.preview.game.team2.players.map((player) => player.rawName),
  ])));
}

function originalTeamPlayerIds(
  first: ReturnType<typeof readyItems>[number] | undefined,
  mappings: Readonly<Record<string, string>>,
): { readonly team1: ReadonlyArray<string>; readonly team2: ReadonlyArray<string> } {
  if (!first) return { team1: [], team2: [] };
  return {
    team1: mappedTeam(first.parsed.preview.game.team1.players, mappings),
    team2: mappedTeam(first.parsed.preview.game.team2.players, mappings),
  };
}

function mappedTeam(
  players: NormalizedReplay["game"]["team1"]["players"],
  mappings: Readonly<Record<string, string>>,
): string[] {
  return players.flatMap((player) => mappings[player.rawName] ? [mappings[player.rawName]] : []);
}

function overlap(left: ReadonlyArray<string>, right: ReadonlyArray<string>): number {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value)).length;
}

function hasPlayerCollision(
  ready: ReturnType<typeof readyItems>,
  mappings: Readonly<Record<string, string>>,
): boolean {
  return ready.some((item) => {
    const mapped = [
      ...mappedTeam(item.parsed.preview.game.team1.players, mappings),
      ...mappedTeam(item.parsed.preview.game.team2.players, mappings),
    ];
    return new Set(mapped).size !== mapped.length;
  });
}

function applySuggestedMappings(
  state: ReplayImportState,
  players: ReadonlyArray<PlayerListItem>,
): Readonly<Record<string, string>> {
  const byNickname = new Map(players.map((player) => [player.nickname.toLocaleLowerCase("ko"), player.id]));
  const suggested = { ...state.playerMappings };
  for (const item of readyItems(state.queue)) {
    for (const replayPlayer of [
      ...item.parsed.preview.game.team1.players,
      ...item.parsed.preview.game.team2.players,
    ]) {
      if (suggested[replayPlayer.rawName]) continue;
      const nickname = replayPlayer.suggestedNickname ?? replayPlayer.rawName;
      const playerId = byNickname.get(nickname.toLocaleLowerCase("ko"));
      if (playerId) suggested[replayPlayer.rawName] = playerId;
    }
  }
  return suggested;
}

function moveItem(
  queue: ReadonlyArray<ReplayQueueItem>,
  id: string,
  direction: "up" | "down",
): ReadonlyArray<ReplayQueueItem> {
  const index = queue.findIndex((item) => item.id === id);
  if (index < 0) return queue;
  const delta = direction === "up" ? -1 : 1;
  let target = index + delta;
  if (queue[index].status === "ready") {
    while (target >= 0 && target < queue.length && queue[target].status !== "ready") {
      target += delta;
    }
  }
  if (target < 0 || target >= queue.length) return queue;
  const moved = [...queue];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return moved;
}

function omitKey(
  record: Readonly<Record<string, string>>,
  key: string,
): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.entries(record).filter(([entry]) => entry !== key));
}

function resetConfirm(state: ReplayImportState): ReplayImportState {
  return { ...state, confirm: { status: "idle" } };
}
