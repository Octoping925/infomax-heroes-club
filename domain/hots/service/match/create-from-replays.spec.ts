import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueReplayDraft } from "@/domain/hots/replay/replay-draft";
import type { NormalizedReplay } from "@/domain/hots/replay/contracts";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    game: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/config/prisma", () => ({ prisma: mockPrisma }));

import { createMatchFromReplays } from "./create-from-replays";

const HASH_1 = "1".repeat(64);
const HASH_2 = "2".repeat(64);
const PLAYER_IDS = Array.from({ length: 10 }, (_, index) => `p${index + 1}`);

function replay(dateKey = "20260805", start = 0): NormalizedReplay {
  const players = PLAYER_IDS.slice(start, start + 10).map((id, index) => ({
    rawName: id,
    suggestedNickname: null,
    name: id,
    hero: index % 2 === 0 ? "아나" : "제이나",
    position: index % 2 === 0 ? "HEALER" : "SUB_DEALER",
    talents: [],
    kills: 1,
    deaths: 1,
    takedowns: 2,
    heroDamage: 100,
    siegeDamage: 50,
    damageTaken: 30,
    healingDone: 0,
    experienceContribution: 1000,
    timeSpentDead: 0,
    timeCCdEnemyHeroes: 0,
    dpm: 100,
    mercCampCaptures: 0,
    watchTowerCaptures: 0,
    regenGlobes: 1,
  }));
  return {
    build: 99999,
    playedAt: "2026-08-05T10:00:00.000Z",
    playedAtKst: "2026-08-05 19:00:00",
    dateKey,
    map: "BattlefieldOfEternity",
    winnerSide: 0,
    game: {
      date: dateKey,
      idx: 1,
      gameLength: 900,
      map: "영원의 전쟁터",
      team1: { win: true, level: 20, players: players.slice(0, 5), bans: [] },
      team2: { win: false, level: 19, players: players.slice(5), bans: [] },
    },
    warnings: [],
  };
}

function swappedReplay(): NormalizedReplay {
  const value = replay();
  return {
    ...value,
    winnerSide: 1,
    game: {
      ...value.game,
      team1: { ...value.game.team2, win: false },
      team2: { ...value.game.team1, win: true },
    },
  };
}

function replayWithSubstitute(): NormalizedReplay {
  const value = swappedReplay();
  const replacement = { ...value.game.team1.players[4], rawName: "p11", name: "p11" };
  return {
    ...value,
    game: {
      ...value.game,
      team1: { ...value.game.team1, players: [...value.game.team1.players.slice(0, 4), replacement] },
    },
  };
}

function request(secondOrientation: "NORMAL" | "SWAPPED" = "SWAPPED") {
  return {
    drafts: [
      { token: issueReplayDraft({ normalizedReplay: replay(), sourceReplayHash: HASH_1 }), gameNumber: 1, orientation: "NORMAL" as const },
      { token: issueReplayDraft({ normalizedReplay: swappedReplay(), sourceReplayHash: HASH_2 }), gameNumber: 2, orientation: secondOrientation },
    ],
    playerMappings: Object.fromEntries(PLAYER_IDS.map((id) => [id, id])),
    team1LeaderId: "p1",
    team2LeaderId: "p6",
    type: "DINNER" as const,
  };
}

function transactionMock() {
  let gameId = 0;
  let gameTeamId = 0;
  const tx = {
    game: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockImplementation(async () => ({ id: `g${++gameId}` })) },
    player: { findMany: vi.fn().mockResolvedValue(PLAYER_IDS.map((id) => ({ id }))) },
    match: { create: vi.fn().mockResolvedValue({ id: "match-new" }), findUnique: vi.fn() },
    matchTeam: { createManyAndReturn: vi.fn().mockResolvedValue([{ id: "mt1", teamNumber: 1 }, { id: "mt2", teamNumber: 2 }]) },
    matchTeamMember: { createMany: vi.fn().mockResolvedValue({ count: 10 }) },
    gameTeam: { create: vi.fn().mockImplementation(async () => ({ id: `gt${++gameTeamId}` })) },
    gameTeamMember: { createManyAndReturn: vi.fn().mockImplementation(async ({ data }) => data.map((row: { playerId: string }, index: number) => ({ id: `member-${row.playerId}-${index}`, playerId: row.playerId }))) },
    gameTeamBan: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    $executeRawUnsafe: vi.fn(),
  };
  mockPrisma.$transaction.mockImplementation(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx));
  return tx;
}

function existingMatch() {
  const members = (ids: ReadonlyArray<string>) => ids.map((playerId) => ({
    playerId,
    hero: Number(playerId.slice(1)) % 2 === 1 ? "Ana" : "Jaina",
  }));
  return {
    id: "match-existing",
    type: "DINNER",
    playedAt: new Date("2026-08-04T15:00:00.000Z"),
    replayImportFingerprint: baselineFingerprint(),
    teams: [
      { id: "mt1", teamNumber: 1, leaderId: "p1", members: PLAYER_IDS.slice(0, 5).map((playerId) => ({ playerId })) },
      { id: "mt2", teamNumber: 2, leaderId: "p6", members: PLAYER_IDS.slice(5).map((playerId) => ({ playerId })) },
    ],
    games: [
      {
        gameNumber: 1,
        sourceReplayHash: HASH_1,
        teams: [
          { teamNumber: 1, sourceMatchTeamId: "mt1", members: members(PLAYER_IDS.slice(0, 5)) },
          { teamNumber: 2, sourceMatchTeamId: "mt2", members: members(PLAYER_IDS.slice(5)) },
        ],
      },
      {
        gameNumber: 2,
        sourceReplayHash: HASH_2,
        teams: [
          { teamNumber: 1, sourceMatchTeamId: "mt2", members: members(PLAYER_IDS.slice(5)) },
          { teamNumber: 2, sourceMatchTeamId: "mt1", members: members(PLAYER_IDS.slice(0, 5)) },
        ],
      },
    ],
  };
}

function baselineFingerprint(): string {
  const canonicalChoices = {
    version: 1,
    type: "DINNER",
    team1LeaderId: "p1",
    team2LeaderId: "p6",
    drafts: [
      { sourceReplayHash: HASH_1, gameNumber: 1, orientation: "NORMAL" },
      { sourceReplayHash: HASH_2, gameNumber: 2, orientation: "SWAPPED" },
    ],
    playerMappings: PLAYER_IDS.toSorted((left, right) => left.localeCompare(right))
      .map((id) => [id, id]),
  };
  return createHash("sha256").update(JSON.stringify(canonicalChoices)).digest("hex");
}

function existingTransaction() {
  const tx = transactionMock();
  tx.game.findMany.mockResolvedValue([
    { matchId: "match-existing", sourceReplayHash: HASH_1 },
    { matchId: "match-existing", sourceReplayHash: HASH_2 },
  ]);
  tx.match.findUnique.mockResolvedValue(existingMatch());
  return tx;
}

describe("createMatchFromReplays", () => {
  beforeEach(() => {
    process.env.REPLAY_TOKEN_SECRET = Buffer.alloc(32, 7).toString("base64url");
    mockPrisma.game.findMany.mockReset().mockResolvedValue([]);
    mockPrisma.$transaction.mockReset();
  });

  it("maps a reviewed swapped later side back to the original MatchTeams", async () => {
    const tx = transactionMock();
    await expect(createMatchFromReplays(request())).resolves.toEqual({ matchId: "match-new", gamesCreated: 2, idempotent: false });
    expect(tx.gameTeam.create).toHaveBeenNthCalledWith(3, expect.objectContaining({ data: expect.objectContaining({ teamNumber: 1, sourceMatchTeamId: "mt2" }) }));
    expect(tx.gameTeam.create).toHaveBeenNthCalledWith(4, expect.objectContaining({ data: expect.objectContaining({ teamNumber: 2, sourceMatchTeamId: "mt1" }) }));
  });

  it("returns an exact retry without creating rows", async () => {
    const tx = existingTransaction();
    await expect(createMatchFromReplays(request())).resolves.toEqual({ matchId: "match-existing", gamesCreated: 2, idempotent: true });
    expect(tx.match.create).not.toHaveBeenCalled();
    expect(tx.game.create).not.toHaveBeenCalled();
  });

  it.each([
    ["subset", () => ({ ...request(), drafts: [request().drafts[0]] })],
    ["different order", () => {
      const base = request();
      return { ...base, drafts: [{ ...base.drafts[1], gameNumber: 1 }, { ...base.drafts[0], gameNumber: 2 }] };
    }],
    ["different mapping", () => ({ ...request(), playerMappings: { ...request().playerMappings, p1: "p2", p2: "p1" } })],
    ["different leader", () => ({ ...request(), team1LeaderId: "p2" })],
    ["different type", () => ({ ...request(), type: "LUNCH" as const })],
  ])("conflicts on an existing match with %s", async (_label, buildRequest) => {
    existingTransaction();
    await expect(createMatchFromReplays(buildRequest())).rejects.toMatchObject({ status: 409 });
  });

  it("conflicts when same-hero players swap mappings even if persisted rows look identical", async () => {
    existingTransaction();
    const changed = request();
    changed.playerMappings.p1 = "p3";
    changed.playerMappings.p3 = "p1";

    await expect(createMatchFromReplays(changed)).rejects.toMatchObject({ status: 409 });
  });

  it("rejects a partial-overlap batch without writes", async () => {
    const tx = transactionMock();
    tx.game.findMany.mockResolvedValue([{ matchId: "match-existing", sourceReplayHash: HASH_1 }]);
    await expect(createMatchFromReplays(request())).rejects.toMatchObject({ status: 409 });
    expect(tx.match.create).not.toHaveBeenCalled();
  });

  it("rereads the complete match after losing the unique-hash race", async () => {
    const losing = transactionMock();
    losing.match.create.mockRejectedValue({ code: "P2002" });
    const winner = existingTransaction();
    mockPrisma.$transaction
      .mockReset()
      .mockImplementationOnce(async (callback: (value: typeof losing) => Promise<unknown>) => callback(losing))
      .mockImplementationOnce(async (callback: (value: typeof winner) => Promise<unknown>) => callback(winner));
    await expect(createMatchFromReplays(request())).resolves.toEqual({ matchId: "match-existing", gamesCreated: 2, idempotent: true });
  });

  it.each([
    ["mixed dates", () => ({ ...request(), drafts: [{ ...request().drafts[0] }, { token: issueReplayDraft({ normalizedReplay: replay("20260806"), sourceReplayHash: HASH_2 }), gameNumber: 2, orientation: "SWAPPED" as const }] })],
    ["duplicate order", () => ({ ...request(), drafts: request().drafts.map((draft) => ({ ...draft, gameNumber: 1 })) })],
    ["non-contiguous order", () => ({ ...request(), drafts: request().drafts.map((draft, index) => ({ ...draft, gameNumber: index + 2 })) })],
    ["colliding players", () => ({ ...request(), playerMappings: { ...request().playerMappings, p2: "p1" } })],
    ["invalid leader", () => ({ ...request(), team1LeaderId: "p6" })],
    ["unresolved player", () => {
      const base = request();
      const playerMappings = { ...base.playerMappings };
      delete playerMappings.p10;
      return { ...base, playerMappings };
    }],
    ["substitute", () => {
      const base = request();
      return {
        ...base,
        drafts: [
          base.drafts[0],
          { ...base.drafts[1], token: issueReplayDraft({ normalizedReplay: replayWithSubstitute(), sourceReplayHash: HASH_2 }) },
        ],
        playerMappings: { ...base.playerMappings, p11: "p11" },
      };
    }],
  ])("rejects %s before creating rows", async (_label, buildRequest) => {
    await expect(createMatchFromReplays(buildRequest())).rejects.toMatchObject({ status: 400 });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("conflicts when the reviewed orientation contradicts player overlap", async () => {
    await expect(createMatchFromReplays(request("NORMAL"))).rejects.toMatchObject({ status: 409 });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
