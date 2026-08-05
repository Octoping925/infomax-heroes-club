import type { ParsedReplayRuntime } from "./parser/parser";
import { parseReplayBuffer } from "./parser/parser";
import { normalizeDecodedReplay } from "./normalize-replay";
import type { NormalizedReplay } from "./contracts";
import { ReplayParseError } from "./replay-errors";
import { createReplayArchive } from "./validate-mpq";

const TRACKER_STAT_EVENT_ID = 10;
const TRACKER_SCORE_EVENT_ID = 11;
const TRACKER_UNIT_BORN_EVENT_ID = 1;
const TRACKER_UNIT_DIED_EVENT_ID = 2;
const WINDOWS_EPOCH_OFFSET_MS = 11_644_473_600_000;
const GAME_LOOPS_PER_SECOND = 16;
const CORE_UNIT_TYPES = new Set(["KingsCore", "VanndarStormpike", "DrekThar"]);

const TEAM_BAN_ATTRIBUTE_IDS = {
  0: new Set([4023, 4025, 4043]),
  1: new Set([4028, 4030, 4045]),
} as const;

type MutablePlayer = {
  name: string;
  hero: string;
  team: 0 | 1;
  gameStats: Record<string, number>;
  talents: Record<string, string>;
  win: boolean | null;
};

export function parseAndNormalizeReplay(
  source: Buffer,
  options: { readonly gameIndex?: number } = {},
): NormalizedReplay {
  const runtime = parseReplayBuffer(source, createReplayArchive);
  if (!runtime.ok) {
    throw new ReplayParseError(runtime.error.code, "build" in runtime.error
      ? { build: runtime.error.build }
      : undefined);
  }

  try {
    return normalizeDecodedReplay(decodeReplayRuntime(runtime), options);
  } catch (error) {
    if (error instanceof ReplayParseError) {
      throw error;
    }
    throw new ReplayParseError("INVALID_REPLAY");
  }
}

export function decodeReplayRuntime(runtime: ParsedReplayRuntime): unknown {
  const details = readObject(runtime.decodeDetails());
  const trackerEvents = runtime.decodeTrackerEvents().map(readObject);
  const attributes = readObject(runtime.decodeAttributesEvents());
  const playerList = readArray(details.m_playerList);
  const players: Record<string, MutablePlayer> = {};
  const teams: Record<0 | 1, { ids: string[]; level: number }> = {
    0: { ids: [], level: 0 },
    1: { ids: [], level: 0 },
  };

  for (const rawPlayer of playerList) {
    const player = readObject(rawPlayer);
    const team = readTeam(player.m_teamId);
    const id = readToonHandle(player.m_toon);
    players[id] = {
      name: readString(player.m_name),
      hero: readString(player.m_hero),
      team,
      gameStats: {},
      talents: {},
      win: null,
    };
    teams[team].ids.push(id);
  }

  const trackerPlayerIds = new Map<number, string>();
  const coreUnitTags = new Set<string>();
  let gatesOpenLoop = 0;
  let finalGameLoop = readNonNegativeNumber(runtime.header.m_elapsedGameLoops);
  for (const event of trackerEvents) {
    const eventName = readOptionalString(event.m_eventName);
    if (
      event._eventid === TRACKER_UNIT_BORN_EVENT_ID &&
      CORE_UNIT_TYPES.has(readOptionalString(event.m_unitTypeName) ?? "")
    ) {
      coreUnitTags.add(readUnitTag(event));
      continue;
    }

    if (
      event._eventid === TRACKER_UNIT_DIED_EVENT_ID &&
      coreUnitTags.has(readUnitTag(event))
    ) {
      finalGameLoop = readNonNegativeNumber(event._gameloop);
      continue;
    }

    if (event._eventid === TRACKER_STAT_EVENT_ID && eventName === "PlayerInit") {
      const trackerId = readKeyedValue(event.m_intData, 0);
      const playerId = readKeyedString(event.m_stringData, 1);
      if (trackerId !== null && playerId && players[playerId]) {
        trackerPlayerIds.set(trackerId, playerId);
      }
      continue;
    }

    if (event._eventid === TRACKER_STAT_EVENT_ID && eventName === "GatesOpen") {
      gatesOpenLoop = readNonNegativeNumber(event._gameloop);
      continue;
    }

    if (event._eventid === TRACKER_SCORE_EVENT_ID) {
      applyScoreEvent(event, trackerPlayerIds, players);
      continue;
    }

    if (event._eventid === TRACKER_STAT_EVENT_ID && eventName === "EndOfGameTalentChoices") {
      applyTalentEvent(event, trackerPlayerIds, players);
    }
  }

  const gameLength = (finalGameLoop - gatesOpenLoop) / GAME_LOOPS_PER_SECOND;
  if (!Number.isFinite(gameLength) || gameLength <= 0) {
    throw new ReplayParseError("INCOMPLETE_REPLAY");
  }

  for (const player of Object.values(players)) {
    player.gameStats.DPM = (player.gameStats.HeroDamage ?? 0) / (gameLength / 60);
    teams[player.team].level = Math.max(teams[player.team].level, player.gameStats.Level ?? 0);
  }

  const winningTeams = new Set(
    Object.values(players)
      .filter((player) => player.win === true)
      .map((player) => player.team),
  );
  const winner = winningTeams.size === 1 ? Array.from(winningTeams)[0] : null;

  return {
    status: 1,
    match: {
      build: runtime.build,
      version: runtime.header.m_version,
      date: windowsFileTimeToDate(details.m_timeUTC).toISOString(),
      length: gameLength,
      map: readString(details.m_title),
      winner,
      teams,
      bans: readBans(attributes),
    },
    players,
  };
}

function applyScoreEvent(
  event: Record<string, unknown>,
  playerIds: ReadonlyMap<number, string>,
  players: Record<string, MutablePlayer>,
): void {
  for (const rawScore of readArray(event.m_instanceList)) {
    const score = readObject(rawScore);
    const name = readString(score.m_name);
    if (name.startsWith("EndOfMatchAward")) {
      continue;
    }

    let trackerId = 1;
    for (const rawValue of readArray(score.m_values)) {
      const values = readArray(rawValue);
      if (values.length === 0) {
        continue;
      }
      const playerId = playerIds.get(trackerId);
      const player = playerId ? players[playerId] : undefined;
      if (player) {
        player.gameStats[name] = readNonNegativeNumber(readObject(values[0]).m_value);
      }
      trackerId += 1;
    }
  }
}

function applyTalentEvent(
  event: Record<string, unknown>,
  playerIds: ReadonlyMap<number, string>,
  players: Record<string, MutablePlayer>,
): void {
  const trackerId = readKeyedValue(event.m_intData, 0);
  const playerId = trackerId === null ? undefined : playerIds.get(trackerId);
  const player = playerId ? players[playerId] : undefined;
  if (!player) {
    return;
  }

  const strings = readArray(event.m_stringData).map(readObject);
  const result = strings.find((entry) => readOptionalString(entry.m_key) === "Result") ?? strings[1];
  const resultValue = result ? readOptionalString(result.m_value) : null;
  player.win = resultValue === "Win" ? true : resultValue === "Loss" ? false : null;

  for (const entry of strings) {
    const key = readOptionalString(entry.m_key);
    const value = readOptionalString(entry.m_value);
    if (key?.startsWith("Tier") && value) {
      player.talents[key.replace(/\s+/g, "")] = value;
    }
  }
}

function readBans(attributes: Record<string, unknown>): Record<0 | 1, Array<{ hero: string }>> {
  const result: Record<0 | 1, Array<{ hero: string }>> = { 0: [], 1: [] };
  const scopes = readObject(attributes.scopes ?? {});
  const draft = readObject(scopes["16"] ?? {});
  for (const [attributeId, rawEntries] of Object.entries(draft)) {
    const id = Number(attributeId);
    const team = TEAM_BAN_ATTRIBUTE_IDS[0].has(id)
      ? 0
      : TEAM_BAN_ATTRIBUTE_IDS[1].has(id)
        ? 1
        : null;
    if (team === null) {
      continue;
    }
    const first = readArray(rawEntries)[0];
    if (first === undefined) {
      continue;
    }
    const hero = readAttributeString(readObject(first).value);
    if (hero) {
      result[team].push({ hero });
    }
  }
  return result;
}

function readToonHandle(value: unknown): string {
  const toon = readObject(value);
  return [toon.m_region, toon.m_programId, toon.m_realm, toon.m_id]
    .map(readIdentifierPart)
    .join("-");
}

function windowsFileTimeToDate(value: unknown): Date {
  const fileTime = readLongNumber(value);
  const date = new Date(fileTime / 10_000 - WINDOWS_EPOCH_OFFSET_MS);
  if (!Number.isFinite(date.getTime())) {
    throw new ReplayParseError("INVALID_REPLAY");
  }
  return date;
}

function readLongNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const toNumber = (value as { toNumber?: unknown }).toNumber;
    if (typeof toNumber === "function") {
      const result = toNumber.call(value);
      if (typeof result === "number" && Number.isFinite(result)) {
        return result;
      }
    }
  }
  throw new ReplayParseError("INVALID_REPLAY");
}

function readKeyedValue(value: unknown, index: number): number | null {
  const entry = readArray(value)[index];
  if (entry === undefined) {
    return null;
  }
  const raw = readObject(entry).m_value;
  return typeof raw === "number" && Number.isSafeInteger(raw) ? raw : null;
}

function readUnitTag(event: Record<string, unknown>): string {
  const index = readNonNegativeNumber(event.m_unitTagIndex);
  const recycle = readNonNegativeNumber(event.m_unitTagRecycle);
  return `${index}-${recycle}`;
}

function readKeyedString(value: unknown, index: number): string | null {
  const entry = readArray(value)[index];
  return entry === undefined ? null : readOptionalString(readObject(entry).m_value);
}

function readAttributeString(value: unknown): string | null {
  return readOptionalString(value);
}

function readObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ReplayParseError("INVALID_REPLAY");
  }
  return value as Record<string, unknown>;
}

function readArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new ReplayParseError("INVALID_REPLAY");
  }
  return value;
}

function readString(value: unknown): string {
  const result = readOptionalString(value);
  if (!result) {
    throw new ReplayParseError("INVALID_REPLAY");
  }
  return result;
}

function readOptionalString(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return Buffer.from(value).toString("utf8").replaceAll("\0", "").trim() || null;
  }
  return null;
}

function readIdentifierPart(value: unknown): string {
  const text = readOptionalString(value);
  if (text) {
    return text;
  }
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return String(value);
  }
  throw new ReplayParseError("INVALID_REPLAY");
}

function readNonNegativeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new ReplayParseError("INVALID_REPLAY");
  }
  return value;
}

function readTeam(value: unknown): 0 | 1 {
  if (value !== 0 && value !== 1) {
    throw new ReplayParseError("INVALID_TEAM_SIZE");
  }
  return value;
}
