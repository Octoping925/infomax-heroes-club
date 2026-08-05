import { describe, expect, it } from "vitest";
import type { NormalizedReplay } from "@/domain/hots/replay/contracts";
import {
  buildConfirmRequest,
  createInitialReplayImportState,
  getBlockingReasons,
  replayImportReducer,
  validateReplayFiles,
  type ParsedReplay,
  type ReplayFileDescriptor,
} from "./replay-import-state";

const players = Array.from({ length: 10 }, (_, index) => ({
  id: `player-${index + 1}`,
  nickname: `player-${index + 1}`,
  name: `선수 ${index + 1}`,
}));

describe("replay import state", () => {
  it("uploads three accepted files strictly one at a time", () => {
    let state = createInitialReplayImportState();
    state = replayImportReducer(state, {
      type: "FILES_ADDED",
      files: [file("one.StormReplay"), file("two.StormReplay"), file("three.StormReplay")],
    });

    state = replayImportReducer(state, { type: "NEXT_UPLOAD_STARTED" });
    expect(state.queue.map((item) => item.status)).toEqual(["uploading", "queued", "queued"]);

    state = replayImportReducer(state, { type: "NEXT_UPLOAD_STARTED" });
    expect(state.queue.map((item) => item.status)).toEqual(["uploading", "queued", "queued"]);

    state = replayImportReducer(state, {
      type: "UPLOAD_SUCCEEDED",
      id: state.queue[0].id,
      parsed: parsed("a".repeat(64), replay()),
    });
    state = replayImportReducer(state, { type: "NEXT_UPLOAD_STARTED" });
    expect(state.queue.map((item) => item.status)).toEqual(["ready", "uploading", "queued"]);
  });

  it("applies a known nickname suggestion when parsing finishes after the directory loaded", () => {
    let state = createInitialReplayImportState();
    state = replayImportReducer(state, {
      type: "PLAYER_DIRECTORY_LOADED",
      players: [{ id: "known-id", name: "선수", nickname: "known" }],
    });
    state = replayImportReducer(state, { type: "FILES_ADDED", files: [file("known.StormReplay", 100, "known")] });
    state = replayImportReducer(state, { type: "NEXT_UPLOAD_STARTED" });
    const preview = replay();
    state = replayImportReducer(state, {
      type: "UPLOAD_SUCCEEDED",
      id: "known",
      parsed: parsed("d".repeat(64), {
        ...preview,
        game: {
          ...preview.game,
          team1: {
            ...preview.game.team1,
            players: preview.game.team1.players.map((player, index) => index === 0
              ? { ...player, suggestedNickname: "known" }
              : player),
          },
        },
      }),
    });

    expect(state.playerMappings["raw-1"]).toBe("known-id");
  });

  it("rejects a wrong extension, oversized replay, and files beyond the batch limit", () => {
    const result = validateReplayFiles(
      [file("notes.txt"), file("huge.StormReplay", 4_000_001), ...Array.from({ length: 11 }, (_, index) => file(`${index}.StormReplay`))],
      0,
    );

    expect(result.accepted).toHaveLength(10);
    expect(result.rejected.map((entry) => entry.code)).toEqual([
      "INVALID_EXTENSION",
      "FILE_TOO_LARGE",
      "BATCH_LIMIT_EXCEEDED",
    ]);
  });

  it("keeps unrelated choices when one failed upload is retried", () => {
    let state = readyState();
    state = replayImportReducer(state, { type: "PLAYER_MAPPED", rawName: "raw-1", playerId: "player-1" });
    state = replayImportReducer(state, { type: "LEADER_SELECTED", team: 1, playerId: "player-1" });
    state = replayImportReducer(state, { type: "FILE_RETRY_REQUESTED", id: "failed" });

    expect(state.playerMappings["raw-1"]).toBe("player-1");
    expect(state.team1LeaderId).toBe("player-1");
  });

  it("reorders confirm tokens without changing signed draft contents", () => {
    let state = readyState();
    state = replayImportReducer(state, { type: "FILE_MOVED", id: "second", direction: "up" });

    const request = buildConfirmRequest(state);
    expect(request.drafts).toEqual([
      { token: "token-second", gameNumber: 1, orientation: "NORMAL" },
      { token: "token-first", gameNumber: 2, orientation: "NORMAL" },
    ]);
  });

  it("moves a ready game past failed queue rows in one action", () => {
    let state = readyState();
    state = replayImportReducer(state, {
      type: "FILE_REJECTED",
      file: file("broken.txt", 100, "broken"),
      message: "잘못된 확장자",
    });
    state = replayImportReducer(state, { type: "FILE_MOVED", id: "broken", direction: "up" });
    state = replayImportReducer(state, { type: "FILE_MOVED", id: "second", direction: "up" });

    expect(buildConfirmRequest(state).drafts.map((draft) => draft.token)).toEqual([
      "token-second",
      "token-first",
    ]);
  });

  it("preserves choices for an unchanged hash after reparsing", () => {
    let state = readyState();
    state = replayImportReducer(state, { type: "PLAYER_MAPPED", rawName: "raw-1", playerId: "player-1" });
    state = replayImportReducer(state, {
      type: "ORIENTATION_SELECTED",
      sourceReplayHash: "b".repeat(64),
      orientation: "SWAPPED",
    });
    state = replayImportReducer(state, {
      type: "UPLOAD_SUCCEEDED",
      id: "second",
      parsed: parsed("b".repeat(64), replay({ map: "DragonShire" })),
    });

    expect(state.playerMappings["raw-1"]).toBe("player-1");
    expect(state.orientations["b".repeat(64)]).toEqual({ value: "SWAPPED", source: "manual" });
  });

  it("clears choices that depend on a changed hash and roster while preserving referenced mappings", () => {
    let state = readyState();
    state = replayImportReducer(state, { type: "PLAYER_MAPPED", rawName: "raw-1", playerId: "player-1" });
    state = replayImportReducer(state, { type: "LEADER_SELECTED", team: 1, playerId: "player-1" });
    state = replayImportReducer(state, { type: "LEADER_SELECTED", team: 2, playerId: "player-6" });
    state = replayImportReducer(state, {
      type: "UPLOAD_SUCCEEDED",
      id: "first",
      parsed: parsed("c".repeat(64), replay({ start: 11 })),
    });

    expect(state.playerMappings["raw-1"]).toBe("player-1");
    expect(state.orientations["a".repeat(64)]).toBeUndefined();
    expect(state.team1LeaderId).toBe("");
    expect(state.team2LeaderId).toBe("");
    expect(state.matchType).toBe("LUNCH");
  });

  it("removes mappings that are no longer referenced after a parsed game is removed", () => {
    let state = createInitialReplayImportState();
    state = replayImportReducer(state, { type: "FILES_ADDED", files: [file("only.StormReplay", 100, "only")] });
    state = replayImportReducer(state, { type: "NEXT_UPLOAD_STARTED" });
    state = replayImportReducer(state, {
      type: "UPLOAD_SUCCEEDED",
      id: "only",
      parsed: parsed("a".repeat(64), replay()),
    });
    state = replayImportReducer(state, { type: "PLAYER_MAPPED", rawName: "raw-1", playerId: "player-1" });

    state = replayImportReducer(state, { type: "FILE_REMOVED", id: "only" });

    expect(state.playerMappings).toEqual({});
  });

  it("reports each blocking review reason while parse errors remain removable and non-blocking", () => {
    let state = readyState();
    state = replayImportReducer(state, { type: "PLAYER_DIRECTORY_LOADED", players });

    expect(getBlockingReasons(state)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "MISSING_PLAYER_MAPPING" }),
      expect.objectContaining({ code: "AMBIGUOUS_ORIENTATION" }),
      expect.objectContaining({ code: "MISSING_TEAM1_LEADER" }),
      expect.objectContaining({ code: "MISSING_TEAM2_LEADER" }),
    ]));

    state = replayImportReducer(state, {
      type: "FILES_ADDED",
      files: [file("broken.StormReplay", 100, "failed")],
    });
    state = replayImportReducer(state, { type: "NEXT_UPLOAD_STARTED" });
    state = replayImportReducer(state, {
      type: "UPLOAD_FAILED",
      id: "failed",
      failure: "parse",
      message: "손상된 리플레이입니다.",
    });
    expect(getBlockingReasons(state).map((reason) => String(reason.code))).not.toContain("PARSE_FAILURE");
  });

  it.each([
    ["loading", "PLAYER_DIRECTORY_LOADING"],
    ["error", "PLAYER_DIRECTORY_FAILED"],
    ["empty", "PLAYER_DIRECTORY_EMPTY"],
  ] as const)("keeps parsed results but blocks confirmation while the directory is %s", (status, code) => {
    let state = readyState();
    state = replayImportReducer(state, status === "loading"
      ? { type: "PLAYER_DIRECTORY_LOADING" }
      : status === "error"
        ? { type: "PLAYER_DIRECTORY_FAILED", message: "목록 실패" }
        : { type: "PLAYER_DIRECTORY_LOADED", players: [] });

    expect(state.queue.filter((item) => item.status === "ready")).toHaveLength(2);
    expect(getBlockingReasons(state)).toContainEqual(expect.objectContaining({ code }));
  });

  it("blocks mixed replay dates and duplicate player assignments with explicit reasons", () => {
    let state = readyState({ secondDateKey: "20250806" });
    state = replayImportReducer(state, { type: "PLAYER_DIRECTORY_LOADED", players });
    for (let index = 1; index <= 10; index += 1) {
      state = replayImportReducer(state, {
        type: "PLAYER_MAPPED",
        rawName: `raw-${index}`,
        playerId: index === 2 ? "player-1" : `player-${index}`,
      });
    }

    expect(getBlockingReasons(state)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "MIXED_DATES" }),
      expect.objectContaining({ code: "PLAYER_COLLISION" }),
    ]));
  });

  it("blocks the same replay hash from being confirmed twice", () => {
    let state = readyState();
    const first = state.queue.find((item) => item.id === "first");
    expect(first?.status).toBe("ready");
    if (first?.status !== "ready") throw new Error("first replay must be ready");

    state = replayImportReducer(state, {
      type: "UPLOAD_SUCCEEDED",
      id: "second",
      parsed: parsed(first.parsed.sourceReplayHash, replay()),
    });

    expect(getBlockingReasons(state)).toContainEqual(expect.objectContaining({
      code: "DUPLICATE_REPLAY",
    }));
  });
});

function readyState(options: { readonly secondDateKey?: string } = {}) {
  let state = createInitialReplayImportState();
  state = replayImportReducer(state, {
    type: "FILES_ADDED",
    files: [file("first.StormReplay", 100, "first"), file("second.StormReplay", 100, "second")],
  });
  state = replayImportReducer(state, { type: "NEXT_UPLOAD_STARTED" });
  state = replayImportReducer(state, {
    type: "UPLOAD_SUCCEEDED",
    id: "first",
    parsed: parsed("a".repeat(64), replay()),
  });
  state = replayImportReducer(state, { type: "NEXT_UPLOAD_STARTED" });
  state = replayImportReducer(state, {
    type: "UPLOAD_SUCCEEDED",
    id: "second",
    parsed: parsed("b".repeat(64), replay({ dateKey: options.secondDateKey })),
  });
  return state;
}

function file(name: string, size = 100, id = name): ReplayFileDescriptor {
  return { id, name, size, lastModified: 1 };
}

function parsed(sourceReplayHash: string, preview: NormalizedReplay): ParsedReplay {
  return { sourceReplayHash, draft: `token-${sourceReplayHash[0] === "a" ? "first" : sourceReplayHash[0] === "b" ? "second" : "changed"}`, preview };
}

function replay(options: { readonly dateKey?: string; readonly map?: "CursedHollow" | "DragonShire"; readonly start?: number } = {}): NormalizedReplay {
  const start = options.start ?? 1;
  const dateKey = options.dateKey ?? "20250805";
  const team = (offset: number, win: boolean) => ({
    win,
    level: 20,
    bans: [],
    players: Array.from({ length: 5 }, (_, index) => {
      const player = start + offset + index;
      return {
        rawName: `raw-${player}`,
        suggestedNickname: null,
        name: `raw-${player}`,
        hero: "레이너",
        position: "RANGED_ASSASSIN" as const,
        talents: [],
        kills: 1,
        deaths: 1,
        takedowns: 1,
        heroDamage: 1,
        siegeDamage: 1,
        damageTaken: 1,
        healingDone: 1,
        experienceContribution: 1,
        timeSpentDead: 1,
        timeCCdEnemyHeroes: 1,
        dpm: 1,
        mercCampCaptures: 1,
        watchTowerCaptures: 1,
        regenGlobes: 1,
      };
    }),
  });
  return {
    build: 1,
    playedAt: "2025-08-04T15:00:00.000Z",
    playedAtKst: "2025. 08. 05. 00:00",
    dateKey,
    map: options.map ?? "CursedHollow",
    winnerSide: 0,
    warnings: [],
    game: {
      date: dateKey,
      idx: 1,
      gameLength: 1_200,
      map: "저주받은 골짜기",
      team1: team(0, true),
      team2: team(5, false),
    },
  };
}
