import { createHash } from "node:crypto";
import { prisma } from "@/config/prisma";
import type { NormalizedReplay } from "@/domain/hots/replay/contracts";
import { REPLAY_MAX_BATCH_FILES } from "@/domain/hots/replay/limits";
import { ReplayDraftError, verifyReplayDraft } from "@/domain/hots/replay/replay-draft";
import type { NormalizedGame, RawGame, RawPlayerStat, RawTeam } from "@/domain/hots/types/replay-import-contract";
import { Prisma } from "@/generated/prisma/client";
import { MatchType } from "@/generated/prisma/enums";
import { normalizeGame } from "./create-from-json";
import { MatchServiceError } from "./errors";
import {
  persistNormalizedMatch,
  type PersistGame,
  type PersistMatchInput,
  type PersistPlayer,
  type PersistTeam,
} from "./persist-normalized-match";

const existingMatchSelect = {
  id: true,
  type: true,
  playedAt: true,
  replayImportFingerprint: true,
  teams: {
    select: {
      id: true,
      teamNumber: true,
      leaderId: true,
      members: { select: { playerId: true } },
    },
  },
  games: {
    select: {
      gameNumber: true,
      sourceReplayHash: true,
      teams: {
        select: {
          teamNumber: true,
          sourceMatchTeamId: true,
          members: { select: { playerId: true, hero: true } },
        },
      },
    },
  },
} satisfies Prisma.MatchSelect;

type Orientation = "NORMAL" | "SWAPPED";

export type CreateMatchFromReplaysRequest = {
  readonly drafts: ReadonlyArray<{
    readonly token: string;
    readonly gameNumber: number;
    readonly orientation: Orientation;
  }>;
  readonly playerMappings: Readonly<Record<string, string>>;
  readonly team1LeaderId: string;
  readonly team2LeaderId: string;
  readonly type: "LUNCH" | "DINNER";
};

export type CreateMatchFromReplaysResponse = {
  readonly matchId: string;
  readonly gamesCreated: number;
  readonly idempotent: boolean;
};

type VerifiedDraft = {
  readonly replay: NormalizedReplay;
  readonly sourceReplayHash: string;
  readonly gameNumber: number;
  readonly orientation: Orientation;
};

export async function createMatchFromReplays(input: unknown): Promise<CreateMatchFromReplaysResponse> {
  const request = parseRequest(input);
  const verifiedDrafts = verifyDrafts(request);
  const persistenceInput = buildPersistenceInput(request, verifiedDrafts);
  try {
    return await prisma.$transaction(
      async (tx) => {
        await validateRegisteredPlayers(tx, persistenceInput);
        const existing = await resolveExistingMatch(tx, persistenceInput);
        if (existing) {
          return { matchId: existing.id, gamesCreated: persistenceInput.games.length, idempotent: true };
        }
        const match = await persistNormalizedMatch(tx, persistenceInput);
        return { matchId: match.id, gamesCreated: persistenceInput.games.length, idempotent: false };
      },
      { timeout: 15000, maxWait: 15000 },
    );
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }
    return prisma.$transaction(async (tx) => {
      const existing = await resolveExistingMatch(tx, persistenceInput);
      if (!existing) {
        throw replayConflict();
      }
      return { matchId: existing.id, gamesCreated: persistenceInput.games.length, idempotent: true };
    });
  }
}

function parseRequest(input: unknown): CreateMatchFromReplaysRequest {
  const body = readObject(input, "요청 본문");
  if (!Array.isArray(body.drafts) || body.drafts.length === 0 || body.drafts.length > REPLAY_MAX_BATCH_FILES) {
    throw new MatchServiceError(`drafts는 1개 이상 ${REPLAY_MAX_BATCH_FILES}개 이하여야 합니다.`);
  }
  const mappingsObject = readObject(body.playerMappings, "playerMappings");
  if (Object.keys(mappingsObject).length > 100) {
    throw new MatchServiceError("playerMappings가 너무 큽니다.");
  }
  const playerMappings = Object.fromEntries(
    Object.entries(mappingsObject).map(([rawName, playerId]) => [rawName, readString(playerId, `playerMappings.${rawName}`)]),
  );
  const type = readString(body.type, "type");
  if (type !== MatchType.LUNCH && type !== MatchType.DINNER) {
    throw new MatchServiceError("type은 LUNCH 또는 DINNER여야 합니다.");
  }
  return {
    drafts: body.drafts.map((value, index) => {
      const draft = readObject(value, `drafts[${index}]`);
      const orientation = readString(draft.orientation, `drafts[${index}].orientation`);
      if (orientation !== "NORMAL" && orientation !== "SWAPPED") {
        throw new MatchServiceError(`drafts[${index}].orientation이 올바르지 않습니다.`);
      }
      return {
        token: readString(draft.token, `drafts[${index}].token`),
        gameNumber: readPositiveInt(draft.gameNumber, `drafts[${index}].gameNumber`),
        orientation,
      };
    }),
    playerMappings,
    team1LeaderId: readString(body.team1LeaderId, "team1LeaderId"),
    team2LeaderId: readString(body.team2LeaderId, "team2LeaderId"),
    type,
  };
}

function verifyDrafts(request: CreateMatchFromReplaysRequest): ReadonlyArray<VerifiedDraft> {
  const sorted = request.drafts.toSorted((a, b) => a.gameNumber - b.gameNumber);
  sorted.forEach((draft, index) => {
    if (draft.gameNumber !== index + 1) {
      throw new MatchServiceError("경기 순서는 1부터 연속되어야 하며 중복될 수 없습니다.");
    }
  });
  if (sorted[0]?.orientation !== "NORMAL") {
    throw new MatchServiceError("첫 경기의 팀 방향은 NORMAL이어야 합니다.");
  }
  try {
    const verified = sorted.map((draft) => {
      const claims = verifyReplayDraft(draft.token);
      return {
        replay: claims.normalizedReplay,
        sourceReplayHash: claims.sourceReplayHash,
        gameNumber: draft.gameNumber,
        orientation: draft.orientation,
      };
    });
    if (new Set(verified.map((draft) => draft.sourceReplayHash)).size !== verified.length) {
      throw new MatchServiceError("같은 리플레이가 요청에 중복 포함되었습니다.", 409);
    }
    const dates = new Set(verified.map((draft) => draft.replay.dateKey));
    if (dates.size !== 1) {
      throw new MatchServiceError("서로 다른 서울 날짜의 리플레이는 나누어 업로드해 주세요.");
    }
    return verified;
  } catch (error) {
    if (error instanceof ReplayDraftError) {
      throw new MatchServiceError("리플레이 초안이 만료되었거나 올바르지 않습니다. 다시 파싱해 주세요.");
    }
    throw error;
  }
}

function buildPersistenceInput(
  request: CreateMatchFromReplaysRequest,
  drafts: ReadonlyArray<VerifiedDraft>,
): PersistMatchInput {
  const games = drafts.map((draft) => toPersistGame(draft, request.playerMappings));
  const first = games[0];
  if (!first) throw new MatchServiceError("최소 1개 이상의 게임이 필요합니다.");
  const originalTeam1PlayerIds = playersForSourceTeam(first, 1);
  const originalTeam2PlayerIds = playersForSourceTeam(first, 2);
  if (originalTeam1PlayerIds.length !== 5 || originalTeam2PlayerIds.length !== 5) {
    throw new MatchServiceError("첫 게임은 원래 팀별로 정확히 5명이어야 합니다.");
  }
  const originalTen = new Set([...originalTeam1PlayerIds, ...originalTeam2PlayerIds]);
  if (originalTen.size !== 10) {
    throw new MatchServiceError("첫 게임의 플레이어 매핑은 10명 모두 달라야 합니다.");
  }
  for (const game of games.slice(1)) {
    const current = game.teams.flatMap((team) => team.players.map((player) => player.playerId));
    if (current.length !== 10 || new Set(current).size !== 10 || current.some((id) => !originalTen.has(id))) {
      throw new MatchServiceError("후속 게임에는 첫 게임 밖의 교체 선수나 중복 선수가 포함될 수 없습니다.");
    }
    validateOrientationPlausibility(game, new Set(originalTeam1PlayerIds), new Set(originalTeam2PlayerIds));
  }
  if (!originalTeam1PlayerIds.includes(request.team1LeaderId) || !originalTeam2PlayerIds.includes(request.team2LeaderId)) {
    throw new MatchServiceError("리더는 첫 게임에서 정의된 각 원래 팀의 멤버여야 합니다.");
  }
  return {
    type: request.type,
    playedAt: parseSeoulDate(drafts[0].replay.dateKey),
    replayImportFingerprint: createImportFingerprint(request, drafts),
    team1LeaderId: request.team1LeaderId,
    team2LeaderId: request.team2LeaderId,
    originalTeam1PlayerIds,
    originalTeam2PlayerIds,
    games,
  };
}

function toPersistGame(draft: VerifiedDraft, mappings: Readonly<Record<string, string>>): PersistGame {
  const rawGame = mapRawGamePlayers(draft.replay.game, mappings);
  const normalized = normalizeGame(rawGame, { dateKey: draft.replay.dateKey, gameIndex: draft.gameNumber });
  const sourceNumbers = draft.orientation === "NORMAL" ? ([1, 2] as const) : ([2, 1] as const);
  return {
    gameNumber: draft.gameNumber,
    gameLength: normalized.gameLength,
    map: normalized.map,
    winnerTeamNumber: normalized.winnerTeamNumber,
    sourceReplayHash: draft.sourceReplayHash,
    teams: [
      toPersistTeam(normalized, 1, sourceNumbers[0]),
      toPersistTeam(normalized, 2, sourceNumbers[1]),
    ],
  };
}

function createImportFingerprint(
  request: CreateMatchFromReplaysRequest,
  drafts: ReadonlyArray<VerifiedDraft>,
): string {
  const usedRawNames = new Set(
    drafts.flatMap((draft) => [
      ...draft.replay.game.team1.players.map((player) => player.rawName),
      ...draft.replay.game.team2.players.map((player) => player.rawName),
    ]),
  );
  const playerMappings = Array.from(usedRawNames)
    .sort((left, right) => left.localeCompare(right))
    .map((rawName) => [rawName, request.playerMappings[rawName]] as const);
  const canonicalChoices = {
    version: 1,
    type: request.type,
    team1LeaderId: request.team1LeaderId,
    team2LeaderId: request.team2LeaderId,
    drafts: drafts.map((draft) => ({
      sourceReplayHash: draft.sourceReplayHash,
      gameNumber: draft.gameNumber,
      orientation: draft.orientation,
    })),
    playerMappings,
  };
  return createHash("sha256").update(JSON.stringify(canonicalChoices)).digest("hex");
}

function mapRawGamePlayers(game: RawGame, mappings: Readonly<Record<string, string>>): RawGame {
  const mapTeam = (team: RawTeam): RawTeam => ({
    ...team,
    players: team.players.map((player) => {
      const rawName = "rawName" in player && typeof player.rawName === "string" ? player.rawName : player.name;
      const playerId = mappings[rawName];
      if (!playerId) throw new MatchServiceError(`플레이어 매핑이 필요합니다: ${rawName}`);
      return { ...player, name: playerId } as RawPlayerStat;
    }),
  });
  return { ...game, team1: mapTeam(game.team1), team2: mapTeam(game.team2) };
}

function toPersistTeam(game: NormalizedGame, teamNumber: 1 | 2, sourceTeamNumber: 1 | 2): PersistTeam {
  const team = teamNumber === 1 ? game.team1 : game.team2;
  return {
    teamNumber,
    sourceTeamNumber,
    teamLevel: team.teamLevel,
    bans: [...team.bans],
    players: team.players.map(({ nickname, ...stats }): PersistPlayer => ({ playerId: nickname, ...stats })),
  };
}

function playersForSourceTeam(game: PersistGame, sourceTeamNumber: 1 | 2): ReadonlyArray<string> {
  return game.teams
    .find((team) => team.sourceTeamNumber === sourceTeamNumber)!
    .players.map((player) => player.playerId);
}

function validateOrientationPlausibility(game: PersistGame, originalTeam1: Set<string>, originalTeam2: Set<string>): void {
  const side1 = game.teams[0].players.map((player) => player.playerId);
  const side2 = game.teams[1].players.map((player) => player.playerId);
  const normalScore = side1.filter((id) => originalTeam1.has(id)).length + side2.filter((id) => originalTeam2.has(id)).length;
  const swappedScore = side1.filter((id) => originalTeam2.has(id)).length + side2.filter((id) => originalTeam1.has(id)).length;
  const chosenScore = game.teams[0].sourceTeamNumber === 1 ? normalScore : swappedScore;
  if (chosenScore < Math.max(normalScore, swappedScore)) {
    throw new MatchServiceError("선택한 팀 방향이 선수 겹침 결과와 일치하지 않습니다.", 409);
  }
}

async function validateRegisteredPlayers(tx: Prisma.TransactionClient, input: PersistMatchInput): Promise<void> {
  const requested = [...input.originalTeam1PlayerIds, ...input.originalTeam2PlayerIds];
  const players = await tx.player.findMany({ where: { id: { in: requested } }, select: { id: true } });
  if (players.length !== requested.length) {
    throw new MatchServiceError("등록되지 않은 플레이어가 매핑에 포함되어 있습니다.");
  }
}

async function resolveExistingMatch(
  tx: Prisma.TransactionClient,
  input: PersistMatchInput,
): Promise<Prisma.MatchGetPayload<{ select: typeof existingMatchSelect }> | null> {
  const hashes = input.games.map((game) => game.sourceReplayHash).filter((hash): hash is string => hash !== null);
  const overlap = await tx.game.findMany({
    where: { sourceReplayHash: { in: hashes } },
    select: { matchId: true, sourceReplayHash: true },
  });
  if (overlap.length === 0) return null;
  if (overlap.length !== hashes.length || new Set(overlap.map((game) => game.matchId)).size !== 1) throw replayConflict();
  const match = await tx.match.findUnique({ where: { id: overlap[0].matchId }, select: existingMatchSelect });
  if (!match || !matchesExactly(match, input)) throw replayConflict();
  return match;
}

function matchesExactly(
  match: Prisma.MatchGetPayload<{ select: typeof existingMatchSelect }>,
  input: PersistMatchInput,
): boolean {
  if (
    match.type !== input.type ||
    match.playedAt.getTime() !== input.playedAt.getTime() ||
    match.replayImportFingerprint !== input.replayImportFingerprint ||
    match.games.length !== input.games.length
  ) return false;
  const teamByNumber = new Map(match.teams.map((team) => [team.teamNumber, team]));
  const team1 = teamByNumber.get(1);
  const team2 = teamByNumber.get(2);
  if (!team1 || !team2 || team1.leaderId !== input.team1LeaderId || team2.leaderId !== input.team2LeaderId) return false;
  if (!sameSet(team1.members.map((member) => member.playerId), input.originalTeam1PlayerIds)) return false;
  if (!sameSet(team2.members.map((member) => member.playerId), input.originalTeam2PlayerIds)) return false;
  const matchTeamIdByNumber = new Map([[1, team1.id], [2, team2.id]]);
  const existingGames = match.games.toSorted((a, b) => a.gameNumber - b.gameNumber);
  return existingGames.every((existing, index) => {
    const requested = input.games[index];
    if (!requested || existing.gameNumber !== requested.gameNumber || existing.sourceReplayHash !== requested.sourceReplayHash) return false;
    if (existing.teams.length !== 2) return false;
    return existing.teams.every((existingTeam) => {
      const requestedTeam = requested.teams.find((team) => team.teamNumber === existingTeam.teamNumber);
      return Boolean(
        requestedTeam &&
          existingTeam.sourceMatchTeamId === matchTeamIdByNumber.get(requestedTeam.sourceTeamNumber) &&
          sameMembers(existingTeam.members, requestedTeam.players),
      );
    });
  });
}

function sameSet(left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function sameMembers(
  existing: ReadonlyArray<{ readonly playerId: string; readonly hero: string }>,
  requested: ReadonlyArray<{ readonly playerId: string; readonly hero: string }>,
): boolean {
  const requestedKeys = requested.map((member) => `${member.playerId}:${member.hero}`);
  return sameSet(existing.map((member) => `${member.playerId}:${member.hero}`), requestedKeys);
}

function parseSeoulDate(dateKey: string): Date {
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(4, 6));
  const day = Number(dateKey.slice(6, 8));
  const value = new Date(`${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}T00:00:00+09:00`);
  const check = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || check !== `${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}`) {
    throw new MatchServiceError(`${dateKey}: 존재하지 않는 날짜입니다.`);
  }
  return value;
}

function replayConflict(): MatchServiceError {
  return new MatchServiceError("이미 저장된 리플레이와 요청 내용이 충돌합니다.", 409);
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function readObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new MatchServiceError(`${label}는 객체여야 합니다.`);
  return value as Record<string, unknown>;
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new MatchServiceError(`${label}는 문자열이어야 합니다.`);
  return value.trim();
}

function readPositiveInt(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new MatchServiceError(`${label}는 1 이상의 정수여야 합니다.`);
  return Number(value);
}
