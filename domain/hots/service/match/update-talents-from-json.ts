import dayjs from "dayjs";
import { prisma } from "@/config/prisma";
import { fetchPlayerMap } from "@/app/api/stats/utils/player";
import { Hero, HOTS_TALENT_TIERS, isTalentTier, TalentTier } from "@/domain/hots/models";
import { resolveTalentKey } from "@/domain/hots/service/talent-resolver";
import { deleteGameTeamMemberTalents, insertGameTeamMemberTalents } from "./talent-sql";
import { MatchServiceError } from "./errors";

type RawTalentRecord = Partial<Record<`${TalentTier}`, string | null>>;

type RawTalentEntry = {
  readonly tier: number;
  readonly code: string | null;
};

type RawPlayerTalent = {
  readonly name: string;
  readonly talents?: ReadonlyArray<string | null | RawTalentEntry> | RawTalentRecord;
};

type RawTeam = {
  readonly players: ReadonlyArray<RawPlayerTalent>;
};

type RawGame = {
  readonly date: string;
  readonly idx: number;
  readonly team1: RawTeam;
  readonly team2: RawTeam;
};

type RawData = Record<string, ReadonlyArray<RawGame>>;

type NormalizedPlayerTalentPatch = {
  readonly playerId: string;
  readonly nickname: string;
  readonly talentsProvided: boolean;
  readonly talents: ReadonlyArray<{
    readonly tier: TalentTier;
    readonly rawCode: string;
  }>;
};

type NormalizedTeamTalentPatch = {
  readonly players: ReadonlyArray<NormalizedPlayerTalentPatch>;
};

type NormalizedGameTalentPatch = {
  readonly idx: number;
  readonly team1: NormalizedTeamTalentPatch;
  readonly team2: NormalizedTeamTalentPatch;
};

export type UpdateMatchTalentsFromJsonRequest = {
  readonly data: RawData;
};

export type UpdateMatchTalentsFromJsonResponse = {
  readonly matchesUpdated: number;
  readonly gamesUpdated: number;
  readonly playersUpdated: number;
  readonly skippedReasons: ReadonlyArray<string>;
};

const DATE_PATTERN = /^\d{8}$/;

export async function updateMatchTalentsFromJson(input: unknown): Promise<UpdateMatchTalentsFromJsonResponse> {
  const body = parseRequestBody(input);
  const playerMap = await fetchPlayerMap();
  const nicknameToPlayerId = new Map(playerMap.values().map((player) => [player.nickname, player.id]));

  const dateEntries = Object.entries(body.data).sort(([a], [b]) => a.localeCompare(b));
  const skippedReasons: string[] = [];
  let matchesUpdated = 0;
  let gamesUpdated = 0;
  let playersUpdated = 0;

  for (const [dateKey, rawGames] of dateEntries) {
    const normalizedGames = rawGames
      .map((game, gameIndex) => normalizeGame(game, `${dateKey}#${gameIndex + 1}`, nicknameToPlayerId))
      .sort((a, b) => a.idx - b.idx);

    const matchId = await findMatchId({
      date: dateKey,
      games: normalizedGames,
      playerMap,
    });

    if (!matchId) {
      skippedReasons.push(`${dateKey}: 매칭되는 match를 찾지 못했습니다.`);
      continue;
    }

    let updatedGamesInMatch = 0;

    for (const game of normalizedGames) {
      const dbGame = await prisma.game.findUnique({
        where: {
          matchId_gameNumber: {
            matchId,
            gameNumber: game.idx,
          },
        },
        select: {
          id: true,
          teams: {
            select: {
              id: true,
              teamNumber: true,
              members: {
                select: {
                  id: true,
                  playerId: true,
                  hero: true,
                },
              },
            },
          },
        },
      });

      if (!dbGame) {
        skippedReasons.push(`${dateKey}#${game.idx}: DB game을 찾지 못했습니다.`);
        continue;
      }

      const affectedMemberIds = new Set<string>();
      const talentRows: Array<{
        gameTeamMemberId: string;
        tier: TalentTier;
        rawCode: string;
        talentKey: string | null;
      }> = [];

      for (const dbTeam of dbGame.teams) {
        const sourceTeam = dbTeam.teamNumber === 1 ? game.team1 : game.team2;

        for (const player of sourceTeam.players) {
          if (!player.talentsProvided) {
            continue;
          }

          const member = dbTeam.members.find((candidate) => candidate.playerId === player.playerId);
          if (!member) {
            skippedReasons.push(
              `${dateKey}#${game.idx} ${dbTeam.teamNumber}팀: ${player.nickname} 멤버를 찾지 못했습니다.`,
            );
            continue;
          }

          affectedMemberIds.add(member.id);
          talentRows.push(
            ...player.talents.map((talent) => ({
              gameTeamMemberId: member.id,
              tier: talent.tier,
              rawCode: talent.rawCode,
              talentKey: resolveTalentKey(member.hero as Hero, talent.rawCode),
            })),
          );
        }
      }

      const memberIds = Array.from(affectedMemberIds);
      if (memberIds.length === 0) {
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await deleteGameTeamMemberTalents(tx, memberIds);
        await insertGameTeamMemberTalents(tx, talentRows);
      });

      updatedGamesInMatch += 1;
      gamesUpdated += 1;
      playersUpdated += memberIds.length;
    }

    if (updatedGamesInMatch > 0) {
      matchesUpdated += 1;
    }
  }

  return {
    matchesUpdated,
    gamesUpdated,
    playersUpdated,
    skippedReasons,
  };
}

async function findMatchId(input: {
  readonly date: string;
  readonly games: ReadonlyArray<NormalizedGameTalentPatch>;
  readonly playerMap: Awaited<ReturnType<typeof fetchPlayerMap>>;
}): Promise<string | null> {
  const start = dayjs(input.date, "YYYYMMDD").startOf("day").toDate();
  const end = dayjs(input.date, "YYYYMMDD").endOf("day").toDate();
  const expectedGameNumbers = new Set(input.games.map((game) => game.idx));

  const candidates = await prisma.match.findMany({
    where: {
      playedAt: { gte: start, lte: end },
      teams: {
        some: {
          teamNumber: 1,
        },
      },
      AND: {
        teams: {
          some: {
            teamNumber: 2,
          },
        },
      },
    },
    select: {
      id: true,
      games: {
        select: {
          gameNumber: true,
        },
      },
    },
  });

  const filtered = candidates.filter((match) => {
    if (match.games.length !== expectedGameNumbers.size) {
      return false;
    }

    const actualGameNumbers = new Set(match.games.map((game) => game.gameNumber));
    for (const gameNumber of expectedGameNumbers) {
      if (!actualGameNumbers.has(gameNumber)) {
        return false;
      }
    }

    return true;
  });

  if (filtered.length === 0) return null;
  if (filtered.length === 1) return filtered[0].id;

  const sampleGame = input.games.find((game) => game.idx === 1) ?? input.games[0];
  if (!sampleGame) {
    return filtered[0].id;
  }

  const expectedNicknames = new Set(
    [...sampleGame.team1.players, ...sampleGame.team2.players].map((player) => player.nickname),
  );

  for (const match of filtered) {
    const dbGame = await prisma.game.findUnique({
      where: {
        matchId_gameNumber: {
          matchId: match.id,
          gameNumber: sampleGame.idx,
        },
      },
      select: {
        teams: {
          select: {
            members: {
              select: {
                playerId: true,
              },
            },
          },
        },
      },
    });

    if (!dbGame) {
      continue;
    }

    const actualNicknames = new Set(
      dbGame.teams
        .flatMap((team) => team.members)
        .map((member) => input.playerMap.get(member.playerId)?.nickname)
        .filter((nickname): nickname is string => typeof nickname === "string" && nickname.length > 0),
    );

    if (actualNicknames.size !== expectedNicknames.size) {
      continue;
    }

    let isSame = true;
    for (const nickname of expectedNicknames) {
      if (!actualNicknames.has(nickname)) {
        isSame = false;
        break;
      }
    }

    if (isSame) {
      return match.id;
    }
  }

  return filtered[0].id;
}

function parseRequestBody(input: unknown): UpdateMatchTalentsFromJsonRequest {
  const body = readObject(input, "요청 본문");

  const dataObject = readObject(body.data, "data");

  const entries = Object.entries(dataObject);
  if (entries.length === 0) {
    throw new MatchServiceError("data는 최소 1개 이상의 날짜 키를 포함해야 합니다.");
  }

  const data: RawData = {};
  for (const [dateKey, gamesValue] of entries) {
    if (!DATE_PATTERN.test(dateKey)) {
      throw new MatchServiceError(`잘못된 날짜 키입니다: ${dateKey} (YYYYMMDD 형식이어야 합니다)`);
    }
    if (!Array.isArray(gamesValue) || gamesValue.length === 0) {
      throw new MatchServiceError(`${dateKey}: 최소 1개 이상의 게임이 필요합니다.`);
    }
    data[dateKey] = gamesValue.map((gameValue, index) => parseRawGame(gameValue, `${dateKey}#${index + 1}`));
  }

  return { data };
}

function parseRawGame(input: unknown, label: string): RawGame {
  const game = readObject(input, label);

  return {
    date: readString(game.date, `${label}.date`),
    idx: readPositiveInt(game.idx, `${label}.idx`),
    team1: parseRawTeam(game.team1, `${label}.team1`),
    team2: parseRawTeam(game.team2, `${label}.team2`),
  };
}

function parseRawTeam(input: unknown, label: string): RawTeam {
  const team = readObject(input, label);
  const playersValue = team.players;

  if (!Array.isArray(playersValue)) {
    throw new MatchServiceError(`${label}.players는 배열이어야 합니다.`);
  }

  return {
    players: playersValue.map((player, index) => parseRawPlayer(player, `${label}.players[${index}]`)),
  };
}

function parseRawPlayer(input: unknown, label: string): RawPlayerTalent {
  const player = readObject(input, label);
  const talentsProvided = Object.prototype.hasOwnProperty.call(player, "talents");

  return {
    name: readString(player.name, `${label}.name`),
    talents: talentsProvided ? readOptionalTalents(player.talents, `${label}.talents`) : undefined,
  };
}

function normalizeGame(
  rawGame: RawGame,
  label: string,
  nicknameToPlayerId: ReadonlyMap<string, string>,
): NormalizedGameTalentPatch {
  if (!DATE_PATTERN.test(rawGame.date)) {
    throw new MatchServiceError(`${label}.date는 YYYYMMDD 형식이어야 합니다.`);
  }

  return {
    idx: rawGame.idx,
    team1: normalizeTeam(rawGame.team1, `${label}.team1`, nicknameToPlayerId),
    team2: normalizeTeam(rawGame.team2, `${label}.team2`, nicknameToPlayerId),
  };
}

function normalizeTeam(
  rawTeam: RawTeam,
  label: string,
  nicknameToPlayerId: ReadonlyMap<string, string>,
): NormalizedTeamTalentPatch {
  return {
    players: rawTeam.players.map((player) => normalizePlayer(player, label, nicknameToPlayerId)),
  };
}

function normalizePlayer(
  rawPlayer: RawPlayerTalent,
  label: string,
  nicknameToPlayerId: ReadonlyMap<string, string>,
): NormalizedPlayerTalentPatch {
  const playerId = nicknameToPlayerId.get(rawPlayer.name);
  if (!playerId) {
    throw new MatchServiceError(`${label}: 등록되지 않은 플레이어(${rawPlayer.name})`);
  }

  return {
    playerId,
    nickname: rawPlayer.name,
    talentsProvided: rawPlayer.talents !== undefined,
    talents: normalizeTalents(rawPlayer.talents, `${label}.${rawPlayer.name}.talents`),
  };
}

function normalizeTalents(
  input: RawPlayerTalent["talents"],
  label: string,
): ReadonlyArray<{
  readonly tier: TalentTier;
  readonly rawCode: string;
}> {
  if (input === undefined) {
    return [];
  }

  const entries: Array<{ tier: TalentTier; code: string }> = Array.isArray(input)
    ? input.flatMap((value, index) => {
        if (value === null || value === undefined) {
          return [];
        }
        if (typeof value === "string") {
          const tier = HOTS_TALENT_TIERS[index];
          if (!tier) {
            throw new MatchServiceError(`${label}[${index}]: 지원하지 않는 특성 인덱스입니다.`);
          }
          return [{ tier, code: value }];
        }
        const tier = readPositiveInt(value.tier, `${label}[${index}].tier`);
        const code = readOptionalString(value.code, `${label}[${index}].code`) ?? null;
        if (!isTalentTier(tier)) {
          throw new MatchServiceError(`${label}[${index}].tier: 지원하지 않는 특성 티어입니다.`);
        }
        if (!code) {
          return [];
        }
        return [{ tier, code }];
      })
    : Object.entries(input as RawTalentRecord).flatMap(([tierKey, code]) => {
        const tier = Number(tierKey);
        if (!isTalentTier(tier)) {
          throw new MatchServiceError(`${label}.${tierKey}: 지원하지 않는 특성 티어입니다.`);
        }
        if (!code) {
          return [];
        }
        return [{ tier, code }];
      });

  const deduped = new Map<TalentTier, { tier: TalentTier; rawCode: string }>();
  for (const entry of entries) {
    const rawCode = entry.code.trim();
    if (!rawCode) {
      continue;
    }
    deduped.set(entry.tier, { tier: entry.tier, rawCode });
  }

  return Array.from(deduped.values()).toSorted((a, b) => a.tier - b.tier);
}

function readOptionalTalents(value: unknown, label: string): RawPlayerTalent["talents"] {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) => {
      if (entry === null) {
        return null;
      }
      if (typeof entry === "string") {
        return entry;
      }
      if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
        const object = entry as Record<string, unknown>;
        return {
          tier: readPositiveInt(object.tier, `${label}[${index}].tier`),
          code: readOptionalString(object.code, `${label}[${index}].code`) ?? null,
        };
      }
      throw new MatchServiceError(`${label}[${index}]는 문자열, null, 또는 객체여야 합니다.`);
    });
  }

  if (typeof value === "object" && value !== null) {
    const object = value as Record<string, unknown>;
    const result: RawTalentRecord = {};

    for (const [tierKey, rawCode] of Object.entries(object)) {
      const tier = Number(tierKey);
      if (!isTalentTier(tier)) {
        throw new MatchServiceError(`${label}.${tierKey}: 지원하지 않는 특성 티어입니다.`);
      }
      if (rawCode === null) {
        result[tierKey as `${TalentTier}`] = null;
        continue;
      }
      result[tierKey as `${TalentTier}`] = readString(rawCode, `${label}.${tierKey}`);
    }

    return result;
  }

  throw new MatchServiceError(`${label}는 배열 또는 객체여야 합니다.`);
}

function readObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new MatchServiceError(`${label}는 객체여야 합니다.`);
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new MatchServiceError(`${label}는 빈 값일 수 없는 문자열이어야 합니다.`);
  }
  return value.trim();
}

function readOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return readString(value, label);
}

function readNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new MatchServiceError(`${label}는 유효한 숫자여야 합니다.`);
  }
  return value;
}

function readPositiveInt(value: unknown, label: string): number {
  const numberValue = readNumber(value, label);
  const intValue = Math.trunc(numberValue);
  if (intValue <= 0 || intValue !== numberValue) {
    throw new MatchServiceError(`${label}는 1 이상의 정수여야 합니다.`);
  }
  return intValue;
}
