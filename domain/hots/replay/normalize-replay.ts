import { HERO_CATALOG } from "@/domain/hots/constants/hero-catalog";
import { MAP_CATALOG } from "@/domain/hots/constants/maps";
import type { Hero } from "@/domain/hots/models/hero";
import type { GameMap } from "@/domain/hots/models/map";
import type { NormalizedReplay, ReplayImportPlayer, ReplayImportTeam } from "./contracts";
import { getSuggestedPlayerNickname } from "./player-aliases";
import { ReplayParseError } from "./replay-errors";

const heroByKoreanName = new Map<string, Hero>(
  Object.entries(HERO_CATALOG).map(([hero, entry]) => [entry.nameKo, hero as Hero]),
);
const mapByKoreanName = new Map<string, GameMap>(
  Object.entries(MAP_CATALOG).map(([map, entry]) => [entry.nameKo, map as GameMap]),
);

const HERO_ATTRIBUTE_TO_HERO: Readonly<Record<string, Hero>> = {
  Abat: "Abathur",
  Alar: "Alarak",
  Alex: "Alexstrasza",
  HANA: "Ana",
  Andu: "Anduin",
  Anub: "Anubarak",
  Arts: "Artanis",
  Arth: "Arthas",
  Auri: "Auriel",
  Azmo: "Azmodan",
  Fire: "Blaze",
  Faer: "Brightwing",
  Amaz: "Cassia",
  Chen: "Chen",
  CCho: "Cho",
  Chro: "Chromie",
  DEAT: "Deathwing",
  DECK: "Deckard",
  Deha: "Dehaka",
  Diab: "Diablo",
  DVA0: "DVa",
  L90E: "ETC",
  Fals: "Falstad",
  FENX: "Fenix",
  Gall: "Gall",
  Garr: "Garrosh",
  Tink: "Gazlowe",
  Genj: "Genji",
  Genn: "Greymane",
  Guld: "Guldan",
  Hanz: "Hanzo",
  HOGG: "Hogger",
  Illi: "Illidan",
  IMPE: "Imperius",
  Jain: "Jaina",
  Crus: "Johanna",
  Junk: "Junkrat",
  Kael: "Kaelthas",
  KelT: "KelThuzad",
  Kerr: "Kerrigan",
  Monk: "Kharazim",
  Leor: "Leoric",
  LiLi: "LiLi",
  Wiza: "LiMing",
  Medi: "LtMorales",
  Luci: "Lucio",
  Drya: "Lunara",
  Maie: "Maiev",
  Malf: "Malfurion",
  MalG: "MalGanis",
  MALT: "Malthael",
  Mdvh: "Medivh",
  HMEI: "Mei",
  MEPH: "Mephisto",
  Mura: "Muradin",
  Murk: "Murky",
  Witc: "Nazeebo",
  Nova: "Nova",
  ORPH: "Orphea",
  Prob: "Probius",
  NXHU: "Qhira",
  Ragn: "Ragnaros",
  Rayn: "Raynor",
  Rehg: "Rehgar",
  Rexx: "Rexxar",
  Samu: "Samuro",
  Sgth: "SgtHammer",
  Barb: "Sonya",
  Stit: "Stitches",
  STUK: "Stukov",
  Sylv: "Sylvanas",
  Tass: "Tassadar",
  Butc: "TheButcher",
  Lost: "TheLostVikings",
  Thra: "Thrall",
  Tra0: "Tracer",
  Tych: "Tychus",
  Tyrl: "Tyrael",
  Tyrd: "Tyrande",
  Uthe: "Uther",
  VALE: "Valeera",
  Demo: "Valla",
  Vari: "Varian",
  Necr: "Xul",
  WHIT: "Whitemane",
  YREL: "Yrel",
  Zaga: "Zagara",
  Zary: "Zarya",
  Zera: "Zeratul",
  ZULJ: "Zuljin",
};

export function normalizeDecodedReplay(
  input: unknown,
  options: { readonly gameIndex?: number } = {},
): NormalizedReplay {
  const replay = readObject(input, "replay");
  const status = readNumber(replay.status);
  if (status !== 1) {
    throw new ReplayParseError(status === -5 ? "INCOMPLETE_REPLAY" : "INVALID_REPLAY");
  }

  const match = readObject(replay.match, "match");
  const players = readObject(replay.players, "players");
  const teams = readTwoTeams(match.teams);
  const winner = readWinner(match.winner);
  const map = readMap(match.map);
  const playedAt = readDate(match.date);
  const gameLength = toNonNegativeInt(readNumber(match.length));
  if (gameLength === 0) {
    throw new ReplayParseError("INCOMPLETE_REPLAY");
  }
  const { dateKey, display } = formatKst(playedAt);
  const ids = teams.flatMap((team) => readTeamIds(team));
  if (new Set(ids).size !== ids.length) {
    throw new ReplayParseError("DUPLICATE_PLAYER");
  }

  const normalizedPlayers = new Map<string, ReplayImportPlayer>();
  for (const id of ids) {
    const player = readObject(players[id], `players.${id}`);
    normalizedPlayers.set(id, normalizePlayer(player));
  }
  const rawNames = Array.from(normalizedPlayers.values(), (player) => player.rawName);
  if (new Set(rawNames).size !== rawNames.length) {
    throw new ReplayParseError("DUPLICATE_PLAYER");
  }

  const bans = readObject(match.bans ?? {}, "match.bans");
  const team1 = normalizeTeam(teams[0], readTeamIds(teams[0]), normalizedPlayers, bans["0"], winner === 0);
  const team2 = normalizeTeam(teams[1], readTeamIds(teams[1]), normalizedPlayers, bans["1"], winner === 1);
  const build = readBuild(match);

  return {
    build,
    playedAt: playedAt.toISOString(),
    playedAtKst: display,
    dateKey,
    map,
    winnerSide: winner,
    game: {
      date: dateKey,
      idx: readGameIndex(options.gameIndex),
      gameLength,
      map: MAP_CATALOG[map].nameKo,
      team1,
      team2,
    },
    warnings: [],
  };
}

function normalizePlayer(player: Record<string, unknown>): ReplayImportPlayer {
  const rawName = readNonEmptyString(player.name);
  const hero = readHero(player.hero);
  const stats = readObject(player.gameStats ?? {}, `${rawName}.gameStats`);
  const suggestedNickname = getSuggestedPlayerNickname(rawName);
  const talentsObject = readObject(player.talents ?? {}, `${rawName}.talents`);
  const talents = Object.values(talentsObject).flatMap((value) =>
    typeof value === "string" && value.trim() ? [value.trim()] : [],
  );

  return {
    rawName,
    suggestedNickname,
    name: suggestedNickname ?? rawName,
    hero: HERO_CATALOG[hero].nameKo,
    position: HERO_CATALOG[hero].role,
    talents,
    kills: readStat(stats, "SoloKill"),
    deaths: readStat(stats, "Deaths"),
    takedowns: readStat(stats, "Takedowns"),
    heroDamage: readStat(stats, "HeroDamage"),
    siegeDamage: readStat(stats, "SiegeDamage"),
    damageTaken: readStat(stats, "DamageTaken"),
    healingDone: readStat(stats, "Healing"),
    experienceContribution: readStat(stats, "ExperienceContribution"),
    timeSpentDead: readStat(stats, "TimeSpentDead"),
    timeCCdEnemyHeroes: readStat(stats, "TimeCCdEnemyHeroes"),
    dpm: readStat(stats, "DPM"),
    mercCampCaptures: readStat(stats, "MercCampCaptures"),
    watchTowerCaptures: readStat(stats, "WatchTowerCaptures"),
    regenGlobes: readStat(stats, "RegenGlobes"),
  };
}

function normalizeTeam(
  team: Record<string, unknown>,
  ids: ReadonlyArray<string>,
  players: ReadonlyMap<string, ReplayImportPlayer>,
  rawBans: unknown,
  win: boolean,
): ReplayImportTeam {
  const teamPlayers = ids.map((id) => {
    const player = players.get(id);
    if (!player) {
      throw new ReplayParseError("INVALID_REPLAY");
    }
    return player;
  });
  const bans = Array.isArray(rawBans)
    ? rawBans.map((entry) => {
        const ban = readObject(entry, "ban");
        return HERO_CATALOG[readBannedHero(ban.hero)].nameKo;
      })
    : [];
  return {
    win,
    level: toNonNegativeInt(readNumber(team.level ?? 0)),
    players: teamPlayers,
    bans,
  };
}

function readTwoTeams(value: unknown): [Record<string, unknown>, Record<string, unknown>] {
  const teams = Array.isArray(value) ? value : Object.values(readObject(value, "match.teams"));
  if (teams.length !== 2) {
    throw new ReplayParseError("INVALID_TEAM_SIZE");
  }
  return [readObject(teams[0], "team0"), readObject(teams[1], "team1")];
}

function readTeamIds(team: Record<string, unknown>): string[] {
  if (!Array.isArray(team.ids) || team.ids.length !== 5) {
    throw new ReplayParseError("INVALID_TEAM_SIZE");
  }
  return team.ids.map(readNonEmptyString);
}

function readWinner(value: unknown): 0 | 1 {
  if (value !== 0 && value !== 1) {
    throw new ReplayParseError("WINNER_NOT_FOUND");
  }
  return value;
}

function readMap(value: unknown): GameMap {
  const raw = readNonEmptyString(value);
  if (raw in MAP_CATALOG) {
    return raw as GameMap;
  }
  const map = mapByKoreanName.get(raw);
  if (!map) {
    throw new ReplayParseError("UNSUPPORTED_MAP", { map: raw });
  }
  return map;
}

function readHero(value: unknown): Hero {
  const raw = readNonEmptyString(value).normalize("NFC");
  if (raw in HERO_CATALOG) {
    return raw as Hero;
  }
  if (raw === "Lúcio") {
    return "Lucio";
  }
  const hero = heroByKoreanName.get(raw);
  if (!hero) {
    throw new ReplayParseError("UNSUPPORTED_HERO", { hero: raw });
  }
  return hero;
}

function readBannedHero(value: unknown): Hero {
  const raw = readNonEmptyString(value);
  return HERO_ATTRIBUTE_TO_HERO[raw] ?? readHero(raw);
}

function readBuild(match: Record<string, unknown>): number | null {
  if (typeof match.build === "number" && Number.isSafeInteger(match.build) && match.build > 0) {
    return match.build;
  }
  if (typeof match.version === "object" && match.version !== null) {
    const version = match.version as Record<string, unknown>;
    const build = version.m_baseBuild ?? version.m_build;
    if (typeof build === "number" && Number.isSafeInteger(build) && build > 0) {
      return build;
    }
  }
  return null;
}

function readDate(value: unknown): Date {
  const date = value instanceof Date ? new Date(value) : new Date(readNonEmptyString(value));
  if (!Number.isFinite(date.getTime())) {
    throw new ReplayParseError("INVALID_REPLAY");
  }
  return date;
}

function formatKst(date: Date): { dateKey: string; display: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): string => parts.find((part) => part.type === type)?.value ?? "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const time = `${get("hour")}:${get("minute")}:${get("second")}`;
  return { dateKey: `${year}${month}${day}`, display: `${year}-${month}-${day} ${time}` };
}

function readStat(stats: Record<string, unknown>, key: string): number {
  return toNonNegativeInt(readNumber(stats[key] ?? 0));
}

function readObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ReplayParseError("INVALID_REPLAY", { field: label });
  }
  return value as Record<string, unknown>;
}

function readNonEmptyString(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ReplayParseError("INVALID_REPLAY");
  }
  return value.trim();
}

function readNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ReplayParseError("INVALID_REPLAY");
  }
  return value;
}

function toNonNegativeInt(value: number): number {
  return Math.max(0, Math.round(value));
}

function readGameIndex(value: number | undefined): number {
  if (value === undefined) {
    return 1;
  }
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ReplayParseError("INVALID_REPLAY", { field: "gameIndex" });
  }
  return value;
}
