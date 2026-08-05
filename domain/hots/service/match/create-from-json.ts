import { prisma } from "@/config/prisma";
import { HeroMap } from "@/domain/hots/constants";
import { Hero, HeroRole, HeroRoles, HOTS_TALENT_TIERS, isTalentTier, TalentTier } from "@/domain/hots/models";
import { resolveTalentKey } from "@/domain/hots/service/talent-resolver";
import { MAP_CATALOG } from "@/domain/hots/constants/maps";
import { GameMap, MatchType } from "@/generated/prisma/enums";
import { calculateGameResult } from "./common";
import { MatchServiceError } from "./errors";
import { insertGameTeamMemberTalents } from "./talent-sql";
import type {
  NormalizedGame,
  NormalizedPlayer,
  NormalizedTeam,
  RawGame,
  RawPlayerStat,
  RawReplayImportData,
  RawTalentRecord,
  RawTeam,
} from "@/domain/hots/types/replay-import-contract";

export type CreateMatchesFromJsonRequest = {
  readonly team1LeaderId: string;
  readonly team2LeaderId: string;
  readonly data: RawReplayImportData;
};

export type CreateMatchesFromJsonResponse = {
  readonly matchesCreated: number;
  readonly gamesCreated: number;
  readonly matchIds: ReadonlyArray<string>;
};

const koreanToHeroMap: ReadonlyMap<string, Hero> = new Map(
  Object.entries(HeroMap).map(([heroKey, koreanName]) => [koreanName, heroKey as Hero]),
);

const koreanToMapMap: ReadonlyMap<string, GameMap> = new Map(
  Object.entries(MAP_CATALOG).map(([mapKey, map]) => [map.nameKo, mapKey as GameMap]),
);

const ROLE_SET = new Set<string>(Object.values(HeroRoles));
const DATE_PATTERN = /^\d{8}$/;

export async function createMatchesFromJson(input: unknown): Promise<CreateMatchesFromJsonResponse> {
  const body = parseRequestBody(input);

  if (body.team1LeaderId === body.team2LeaderId) {
    throw new MatchServiceError("team1LeaderId와 team2LeaderId는 달라야 합니다.");
  }

  await validateLeaderIds(body.team1LeaderId, body.team2LeaderId);

  const dateEntries = Object.entries(body.data).sort(([a], [b]) => a.localeCompare(b));
  const createdMatchIds: string[] = [];
  let gamesCreated = 0;

  const allPlayers = await prisma.player.findMany({ select: { id: true, nickname: true } });

  const playerIdByNickname = new Map(allPlayers.map((player) => [player.nickname, player.id]));

  for (const [dateKey, rawGames] of dateEntries) {
    const normalizedGames = rawGames
      .map((game, gameIndex) => normalizeGame(game, { dateKey, gameIndex: gameIndex + 1 }))
      .sort((a, b) => a.idx - b.idx);

    validateGameNumbers(normalizedGames, dateKey);

    const nicknameSet = collectNicknames(normalizedGames);

    const missingPlayers = Array.from(nicknameSet).filter((nickname) => !playerIdByNickname.has(nickname));
    if (missingPlayers.length > 0) {
      throw new MatchServiceError(`${dateKey}: 등록되지 않은 플레이어(${missingPlayers.join(", ")})`);
    }

    const firstGame = normalizedGames[0];
    if (!firstGame) {
      throw new MatchServiceError(`${dateKey}: 최소 1개 이상의 게임이 필요합니다.`);
    }

    const matchTeam1PlayerIds = firstGame.team1.players.map((player) => playerIdByNickname.get(player.nickname)!);
    const matchTeam2PlayerIds = firstGame.team2.players.map((player) => playerIdByNickname.get(player.nickname)!);

    if (!matchTeam1PlayerIds.includes(body.team1LeaderId)) {
      throw new MatchServiceError(`${dateKey}: team1LeaderId가 1경기 1팀 멤버가 아닙니다.`);
    }
    if (!matchTeam2PlayerIds.includes(body.team2LeaderId)) {
      throw new MatchServiceError(`${dateKey}: team2LeaderId가 1경기 2팀 멤버가 아닙니다.`);
    }

    const team1Wins = normalizedGames.filter((game) => game.winnerTeamNumber === 1).length;
    const team2Wins = normalizedGames.filter((game) => game.winnerTeamNumber === 2).length;
    const matchWinnerTeamNumber = team1Wins > team2Wins ? 1 : team2Wins > team1Wins ? 2 : null;

    const playedAt = parsePlayedAt(dateKey);

    const match = await prisma.$transaction(
      async (tx) => {
        const newMatch = await tx.match.create({
          data: {
            type: MatchType.DINNER,
            playedAt,
            winnerTeamNumber: matchWinnerTeamNumber,
          },
        });

        const [matchTeam1, matchTeam2] = await tx.matchTeam.createManyAndReturn({
          data: [
            {
              matchId: newMatch.id,
              teamNumber: 1,
              leaderId: body.team1LeaderId,
            },
            {
              matchId: newMatch.id,
              teamNumber: 2,
              leaderId: body.team2LeaderId,
            },
          ],
        });

        await tx.matchTeamMember.createMany({
          data: [
            ...matchTeam1PlayerIds.map((playerId) => ({
              matchTeamId: matchTeam1.id,
              playerId,
            })),
            ...matchTeam2PlayerIds.map((playerId) => ({
              matchTeamId: matchTeam2.id,
              playerId,
            })),
          ],
        });

        for (const game of normalizedGames) {
          const newGame = await tx.game.create({
            data: {
              matchId: newMatch.id,
              gameNumber: game.idx,
              gameLength: game.gameLength,
              map: game.map,
              winnerTeamNumber: game.winnerTeamNumber,
            },
          });

          for (const teamNumber of [1, 2] as const) {
            const team = teamNumber === 1 ? game.team1 : game.team2;
            const sourceMatchTeamId = teamNumber === 1 ? matchTeam1.id : matchTeam2.id;
            const result = calculateGameResult(teamNumber, game.winnerTeamNumber);

            const gameTeam = await tx.gameTeam.create({
              data: {
                gameId: newGame.id,
                teamNumber,
                sourceMatchTeamId,
                result,
                teamLevel: team.teamLevel,
              },
            });

            const createdMembers = await tx.gameTeamMember.createManyAndReturn({
              data: team.players.map((player) => ({
                gameTeamId: gameTeam.id,
                playerId: playerIdByNickname.get(player.nickname)!,
                hero: player.hero,
                position: player.position,
                kills: player.kills,
                deaths: player.deaths,
                takedowns: player.takedowns,
                heroDamage: player.heroDamage,
                siegeDamage: player.siegeDamage,
                damageTaken: player.damageTaken,
                healingDone: player.healingDone,
                experienceContribution: player.experienceContribution,
                timeSpentDead: player.timeSpentDead,
                timeCCdEnemyHeroes: player.timeCCdEnemyHeroes,
                dpm: player.dpm,
                mercCampCaptures: player.mercCampCaptures,
                watchTowerCaptures: player.watchTowerCaptures,
                regenGlobes: player.regenGlobes,
              })),
            });

            const talentsToCreate = createdMembers.flatMap((member) => {
              const player = team.players.find((entry) => playerIdByNickname.get(entry.nickname) === member.playerId);
              if (!player || player.talents.length === 0) {
                return [];
              }

              return player.talents.map((talent) => ({
                gameTeamMemberId: member.id,
                tier: talent.tier,
                rawCode: talent.rawCode,
                talentKey: talent.talentKey,
              }));
            });

            await insertGameTeamMemberTalents(tx, talentsToCreate);

            if (team.bans.length > 0) {
              await tx.gameTeamBan.createMany({
                data: team.bans.map((hero, index) => ({
                  gameTeamId: gameTeam.id,
                  hero,
                  banOrder: index + 1,
                })),
              });
            }
          }
        }

        return newMatch;
      },
      {
        timeout: 15000,
        maxWait: 15000,
      },
    );

    createdMatchIds.push(match.id);
    gamesCreated += normalizedGames.length;
  }

  return {
    matchesCreated: createdMatchIds.length,
    gamesCreated,
    matchIds: createdMatchIds,
  };
}

function parseRequestBody(input: unknown): CreateMatchesFromJsonRequest {
  const body = readObject(input, "요청 본문");

  const team1LeaderId = readString(body.team1LeaderId, "team1LeaderId");
  const team2LeaderId = readString(body.team2LeaderId, "team2LeaderId");
  const dataObject = readObject(body.data, "data");

  const entries = Object.entries(dataObject);
  if (entries.length === 0) {
    throw new MatchServiceError("data는 최소 1개 이상의 날짜 키를 포함해야 합니다.");
  }

  const data: RawReplayImportData = {};
  for (const [dateKey, gamesValue] of entries) {
    if (!DATE_PATTERN.test(dateKey)) {
      throw new MatchServiceError(`잘못된 날짜 키입니다: ${dateKey} (YYYYMMDD 형식이어야 합니다)`);
    }
    if (!Array.isArray(gamesValue) || gamesValue.length === 0) {
      throw new MatchServiceError(`${dateKey}: 최소 1개 이상의 게임이 필요합니다.`);
    }
    data[dateKey] = gamesValue.map((gameValue, index) => parseRawGame(gameValue, `${dateKey}#${index + 1}`));
  }

  return {
    team1LeaderId,
    team2LeaderId,
    data,
  };
}

function parseRawGame(input: unknown, label: string): RawGame {
  const game = readObject(input, label);
  return {
    date: readString(game.date, `${label}.date`),
    idx: readPositiveInt(game.idx, `${label}.idx`),
    gameLength: readOptionalNumber(game.gameLength, `${label}.gameLength`),
    map: readString(game.map, `${label}.map`),
    team1: parseRawTeam(game.team1, `${label}.team1`),
    team2: parseRawTeam(game.team2, `${label}.team2`),
  };
}

function parseRawTeam(input: unknown, label: string): RawTeam {
  const team = readObject(input, label);
  const playersValue = team.players;

  if (!Array.isArray(playersValue) || playersValue.length !== 5) {
    throw new MatchServiceError(`${label}.players는 정확히 5명이어야 합니다.`);
  }

  const bansValue = team.bans;
  if (bansValue !== undefined && !Array.isArray(bansValue)) {
    throw new MatchServiceError(`${label}.bans는 배열이어야 합니다.`);
  }

  return {
    win: readBoolean(team.win, `${label}.win`),
    level: readOptionalNumber(team.level, `${label}.level`),
    players: playersValue.map((player, index) => parseRawPlayer(player, `${label}.players[${index}]`)),
    bans:
      bansValue?.map((ban, index) => {
        return readString(ban, `${label}.bans[${index}]`);
      }) ?? [],
  };
}

function parseRawPlayer(input: unknown, label: string): RawPlayerStat {
  const player = readObject(input, label);

  return {
    name: readString(player.name, `${label}.name`),
    hero: readString(player.hero, `${label}.hero`),
    position: readOptionalString(player.position, `${label}.position`),
    talents: readOptionalTalents(player.talents, `${label}.talents`),
    kills: readNumber(player.kills, `${label}.kills`),
    deaths: readNumber(player.deaths, `${label}.deaths`),
    takedowns: readNumber(player.takedowns, `${label}.takedowns`),
    heroDamage: readNumber(player.heroDamage, `${label}.heroDamage`),
    siegeDamage: readOptionalNumber(player.siegeDamage, `${label}.siegeDamage`),
    damageTaken: readNumber(player.damageTaken, `${label}.damageTaken`),
    healingDone: readOptionalNumber(player.healingDone, `${label}.healingDone`),
    experienceContribution: readOptionalNumber(player.experienceContribution, `${label}.experienceContribution`),
    timeSpentDead: readOptionalNumber(player.timeSpentDead, `${label}.timeSpentDead`),
    timeCCdEnemyHeroes: readOptionalNumber(player.timeCCdEnemyHeroes, `${label}.timeCCdEnemyHeroes`),
    dpm: readOptionalNumber(player.dpm, `${label}.dpm`),
    mercCampCaptures: readOptionalNumber(player.mercCampCaptures, `${label}.mercCampCaptures`),
    watchTowerCaptures: readOptionalNumber(player.watchTowerCaptures, `${label}.watchTowerCaptures`),
    regenGlobes: readOptionalNumber(player.regenGlobes, `${label}.regenGlobes`),
  };
}

function normalizeGame(rawGame: RawGame, context: { dateKey: string; gameIndex: number }): NormalizedGame {
  const label = `${context.dateKey}#${context.gameIndex}`;

  if (!DATE_PATTERN.test(rawGame.date)) {
    throw new MatchServiceError(`${label}.date는 YYYYMMDD 형식이어야 합니다.`);
  }
  if (rawGame.date !== context.dateKey) {
    throw new MatchServiceError(`${label}.date(${rawGame.date})가 상위 날짜 키(${context.dateKey})와 다릅니다.`);
  }

  const map = koreanToMapMap.get(rawGame.map);
  if (!map) {
    throw new MatchServiceError(`${label}: 알 수 없는 맵 이름(${rawGame.map})`);
  }

  const team1 = normalizeTeam(rawGame.team1, `${label}.team1`);
  const team2 = normalizeTeam(rawGame.team2, `${label}.team2`);

  const allNicknames = [...team1.players, ...team2.players].map((player) => player.nickname);
  const uniqueNicknameCount = new Set(allNicknames).size;
  if (uniqueNicknameCount !== allNicknames.length) {
    throw new MatchServiceError(`${label}: 한 게임 안에 중복 닉네임이 존재합니다.`);
  }

  return {
    date: rawGame.date,
    idx: rawGame.idx,
    map,
    gameLength: toNonNegativeInt(rawGame.gameLength ?? 0),
    winnerTeamNumber: parseWinnerTeamNumber(rawGame.team1.win, rawGame.team2.win, label),
    team1,
    team2,
  };
}

function normalizeTeam(rawTeam: RawTeam, label: string): NormalizedTeam {
  const players = rawTeam.players.map((player) => normalizePlayer(player, label));
  const nicknameCount = new Set(players.map((player) => player.nickname)).size;
  if (nicknameCount !== players.length) {
    throw new MatchServiceError(`${label}: 팀 내부에 중복 닉네임이 존재합니다.`);
  }

  const bans =
    rawTeam.bans?.map((ban, index) => {
      const mapped = koreanToHeroMap.get(ban);
      if (!mapped) {
        throw new MatchServiceError(`${label}.bans[${index}]: 알 수 없는 영웅 이름(${ban})`);
      }
      return mapped;
    }) ?? [];

  if (new Set(bans).size !== bans.length) {
    throw new MatchServiceError(`${label}: 밴 영웅이 중복되었습니다.`);
  }

  return {
    win: rawTeam.win,
    teamLevel: toNonNegativeInt(rawTeam.level ?? 0),
    players,
    bans,
  };
}

function normalizePlayer(rawPlayer: RawPlayerStat, teamLabel: string): NormalizedPlayer {
  const hero = koreanToHeroMap.get(rawPlayer.hero);
  if (!hero) {
    throw new MatchServiceError(`${teamLabel}: 알 수 없는 영웅 이름(${rawPlayer.hero})`);
  }

  const position = parsePosition(rawPlayer.position, `${teamLabel}.${rawPlayer.name}.position`);

  return {
    nickname: rawPlayer.name,
    hero,
    position,
    talents: normalizeTalents(rawPlayer.talents, hero, `${teamLabel}.${rawPlayer.name}.talents`),
    kills: toNonNegativeInt(rawPlayer.kills),
    deaths: toNonNegativeInt(rawPlayer.deaths),
    takedowns: toNonNegativeInt(rawPlayer.takedowns),
    heroDamage: toNonNegativeInt(rawPlayer.heroDamage),
    siegeDamage: toNonNegativeInt(rawPlayer.siegeDamage ?? 0),
    damageTaken: toNonNegativeInt(rawPlayer.damageTaken),
    healingDone: toNonNegativeInt(rawPlayer.healingDone ?? 0),
    experienceContribution: toNonNegativeInt(rawPlayer.experienceContribution ?? 0),
    timeSpentDead: toNonNegativeInt(rawPlayer.timeSpentDead ?? 0),
    timeCCdEnemyHeroes: toNonNegativeInt(rawPlayer.timeCCdEnemyHeroes ?? 0),
    dpm: toNonNegativeInt(rawPlayer.dpm ?? 0),
    mercCampCaptures: toNonNegativeInt(rawPlayer.mercCampCaptures ?? 0),
    watchTowerCaptures: toNonNegativeInt(rawPlayer.watchTowerCaptures ?? 0),
    regenGlobes: toNonNegativeInt(rawPlayer.regenGlobes ?? 0),
  };
}

function normalizeTalents(
  input: RawPlayerStat["talents"],
  hero: Hero,
  label: string,
): ReadonlyArray<{
  readonly tier: TalentTier;
  readonly rawCode: string;
  readonly talentKey: string | null;
}> {
  if (!input) {
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
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          const tier = readPositiveInt((value as Record<string, unknown>).tier, `${label}[${index}].tier`);
          const code = readOptionalString((value as Record<string, unknown>).code, `${label}[${index}].code`) ?? null;
          if (!isTalentTier(tier)) {
            throw new MatchServiceError(`${label}[${index}].tier: 지원하지 않는 특성 티어입니다.`);
          }
          if (!code) {
            return [];
          }
          return [{ tier, code }];
        }
        throw new MatchServiceError(`${label}[${index}]: 문자열 또는 { tier, code } 형태여야 합니다.`);
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

  const deduped = new Map<TalentTier, { tier: TalentTier; code: string }>();
  for (const entry of entries) {
    const rawCode = entry.code.trim();
    if (!rawCode) {
      continue;
    }
    deduped.set(entry.tier, { tier: entry.tier, code: rawCode });
  }

  return Array.from(deduped.values())
    .map((entry) => ({
      tier: entry.tier,
      rawCode: entry.code,
      talentKey: resolveTalentKey(hero, entry.code),
    }))
    .toSorted((a, b) => a.tier - b.tier);
}

function parsePosition(position: string | undefined, label: string): HeroRole {
  if (!position || position.length === 0) {
    return HeroRoles.TANKER;
  }
  if (!ROLE_SET.has(position)) {
    throw new MatchServiceError(`${label}: 잘못된 포지션(${position})`);
  }
  return position as HeroRole;
}

function parseWinnerTeamNumber(team1Win: boolean, team2Win: boolean, label: string): number | null {
  if (team1Win && team2Win) {
    throw new MatchServiceError(`${label}: 두 팀이 동시에 승리일 수 없습니다.`);
  }
  if (!team1Win && !team2Win) {
    return null;
  }
  return team1Win ? 1 : 2;
}

function validateGameNumbers(games: ReadonlyArray<NormalizedGame>, dateKey: string): void {
  const gameNumbers = new Set<number>();
  for (const game of games) {
    if (gameNumbers.has(game.idx)) {
      throw new MatchServiceError(`${dateKey}: 중복된 게임 번호가 있습니다(${game.idx}).`);
    }
    gameNumbers.add(game.idx);
  }
}

async function validateLeaderIds(team1LeaderId: string, team2LeaderId: string): Promise<void> {
  const leaders = await prisma.player.findMany({
    where: {
      id: {
        in: [team1LeaderId, team2LeaderId],
      },
    },
    select: { id: true },
  });

  if (leaders.length !== 2) {
    throw new MatchServiceError("유효하지 않은 leaderId입니다.");
  }
}

function collectNicknames(games: ReadonlyArray<NormalizedGame>): Set<string> {
  return games
    .flatMap((game) => [game.team1, game.team2])
    .flatMap((team) => team.players)
    .reduce((acc, player) => {
      acc.add(player.nickname);
      return acc;
    }, new Set<string>());
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

function readOptionalTalents(value: unknown, label: string): RawPlayerStat["talents"] {
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

function readOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return readString(value, label);
}

function readBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new MatchServiceError(`${label}는 boolean이어야 합니다.`);
  }
  return value;
}

function readNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new MatchServiceError(`${label}는 유효한 숫자여야 합니다.`);
  }
  return value;
}

function readOptionalNumber(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return readNumber(value, label);
}

function readPositiveInt(value: unknown, label: string): number {
  const numberValue = readNumber(value, label);
  const intValue = Math.trunc(numberValue);
  if (intValue <= 0 || intValue !== numberValue) {
    throw new MatchServiceError(`${label}는 1 이상의 정수여야 합니다.`);
  }
  return intValue;
}

function toNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
}

function parsePlayedAt(value: string): Date {
  const year = Number.parseInt(value.slice(0, 4), 10);
  const month = Number.parseInt(value.slice(4, 6), 10);
  const day = Number.parseInt(value.slice(6, 8), 10);

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new MatchServiceError(`${value}: 존재하지 않는 날짜입니다.`);
  }

  return date;
}
