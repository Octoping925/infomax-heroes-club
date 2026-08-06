import { describe, expect, it } from "vitest";
import decodedReplay from "./__fixtures__/synthetic/decoded-replay.json";
import { ReplayParseError } from "./replay-errors";
import { normalizeDecodedReplay } from "./normalize-replay";

describe("normalizeDecodedReplay", () => {
  it("maps every importer field while keeping replay sides and KST metadata", () => {
    const result = normalizeDecodedReplay(decodedReplay, { gameIndex: 2 });

    expect(result).toMatchObject({
      build: 94786,
      playedAt: "2025-05-07T15:30:00.000Z",
      playedAtKst: "2025-05-08 00:30:00",
      dateKey: "20250508",
      map: "CursedHollow",
      winnerSide: 1,
      game: {
        date: "20250508",
        idx: 2,
        gameLength: 1234,
        map: "저주받은 골짜기",
        team1: { win: false, level: 19, bans: ["아바투르", "발라"] },
        team2: { win: true, level: 20, bans: ["무라딘", "제이나"] },
      },
    });
    expect(result.game.team1.players).toHaveLength(5);
    expect(result.game.team2.players).toHaveLength(5);
    expect(result.game.team1.players[0]).toEqual({
      rawName: "자양동스나이퍼",
      suggestedNickname: "greatjyp",
      name: "greatjyp",
      hero: "아바투르",
      position: "SUB_DEALER",
      talents: ["AbathurPressurizedGlands", "AbathurAdrenalOverload"],
      kills: 1,
      deaths: 2,
      takedowns: 11,
      heroDamage: 12000,
      siegeDamage: 32000,
      damageTaken: 4200,
      healingDone: 500,
      experienceContribution: 17000,
      timeSpentDead: 31,
      timeCCdEnemyHeroes: 4,
      dpm: 583,
      mercCampCaptures: 2,
      watchTowerCaptures: 1,
      regenGlobes: 8,
    });
  });

  it("suggests only explicit aliases and leaves unknown replay names unresolved", () => {
    const result = normalizeDecodedReplay(decodedReplay);

    expect(result.game.team2.players[0]).toMatchObject({
      rawName: "BrownOgre",
      suggestedNickname: "maunkong",
      name: "maunkong",
    });
    expect(result.game.team1.players[1]).toMatchObject({
      rawName: "player2",
      suggestedNickname: null,
      name: "player2",
    });
  });

  it("does not include BattleTags or full decoded events in its output", () => {
    const keys = collectKeys(normalizeDecodedReplay(decodedReplay));

    expect(keys).not.toContain("tag");
    expect(keys).not.toContain("events");
    expect(keys).not.toContain("ToonHandle");
  });

  it.each([
    ["INCOMPLETE_REPLAY", { ...decodedReplay, status: -5 }],
    ["WINNER_NOT_FOUND", { ...decodedReplay, match: { ...decodedReplay.match, winner: null } }],
    ["UNSUPPORTED_MAP", { ...decodedReplay, match: { ...decodedReplay.match, map: "없는 전장" } }],
    ["INCOMPLETE_REPLAY", { ...decodedReplay, match: { ...decodedReplay.match, length: 0 } }],
  ])("rejects invalid decoded replay state with %s", (code, input) => {
    expectReplayError(input, code);
  });

  it("rejects unsupported heroes", () => {
    const input = structuredClone(decodedReplay);
    input.players.p1.hero = "없는 영웅";

    expectReplayError(input, "UNSUPPORTED_HERO");
  });

  it("rejects fewer than five players on either side", () => {
    const input = structuredClone(decodedReplay);
    input.match.teams[0].ids.pop();

    expectReplayError(input, "INVALID_TEAM_SIZE");
  });

  it("rejects duplicate player slots and duplicate raw nicknames", () => {
    const duplicateSlot = structuredClone(decodedReplay);
    duplicateSlot.match.teams[1].ids[4] = "p1";
    expectReplayError(duplicateSlot, "DUPLICATE_PLAYER");

    const duplicateName = structuredClone(decodedReplay);
    duplicateName.players.p10.name = "player9";
    expectReplayError(duplicateName, "DUPLICATE_PLAYER");
  });
});

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectKeys);
  }
  if (typeof value !== "object" || value === null) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) => [key, ...collectKeys(child)]);
}

function expectReplayError(input: unknown, code: string): void {
  try {
    normalizeDecodedReplay(input);
    throw new Error(`Expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(ReplayParseError);
    expect((error as ReplayParseError).code).toBe(code);
  }
}
