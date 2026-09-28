import type { GameMap, Hero } from "../models";
import type { HeroRole } from "../models/hero-role";
import { HERO_CATALOG, MAP_CATALOG } from "../constants";
import { calculateConservativeWinRateScore } from "@/app/stats/utils/conservative-win-rate";

export interface HeroMetaStat {
  readonly hero: Hero;
  readonly games: number;
  readonly wins: number;
  readonly losses: number;
  readonly winRate: number;
  readonly pickRate: number;
  readonly banRate: number | null;
}

export type HeroMetaMapStats = Partial<Record<GameMap, HeroMetaStat[]>>;

export type HeroMetaGrade = "S" | "A" | "B" | "C" | "D";

export interface HeroMetaRow extends HeroMetaStat {
  readonly role: HeroRole;
  readonly tier: HeroMetaGrade | null;
  readonly tierScore: number | null;
}

const HERO_BY_NORMALIZED_NAME = new Map(
  Object.keys(HERO_CATALOG).map((name) => [normalizeName(name), name as Hero]),
);
const MAP_BY_NORMALIZED_NAME = new Map<string, GameMap>(
  Object.keys(MAP_CATALOG).flatMap((map) => [
    [normalizeName(map), map as GameMap],
  ]),
);
MAP_BY_NORMALIZED_NAME.set(normalizeName("Garden of Terror"), "HauntedWoods");
MAP_BY_NORMALIZED_NAME.set(normalizeName("Hanamura Temple"), "Hanamura");

function normalizeName(name: string): string {
  return name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function numeric(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || value.trim() === "")) return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
}

export function parseHeroStats(raw: unknown): HeroMetaStat[] {
  if (typeof raw !== "object" || raw === null || !("data" in raw) || !Array.isArray(raw.data)) {
    throw new Error("Heroes Profile 통계 응답 형식이 올바르지 않습니다.");
  }

  const rows: HeroMetaStat[] = [];
  const unknownHeroes = new Set<string>();
  for (const item of raw.data) {
    if (typeof item !== "object" || item === null) continue;
    const source = item as Record<string, unknown>;
    const hero = typeof source.name === "string" ? HERO_BY_NORMALIZED_NAME.get(normalizeName(source.name)) : undefined;
    if (!hero && typeof source.name === "string" && unknownHeroes.size < 20) unknownHeroes.add(source.name.slice(0, 80));
    const rawWins = numeric(source.wins);
    const rawLosses = numeric(source.losses);
    const games = numeric(source.games_played) ?? numeric(source.games) ??
      (rawWins !== null && rawLosses !== null ? rawWins + rawLosses : null);
    const pickRate = numeric(source.pick_rate) ?? numeric(source.popularity);
    const rawWinRate = numeric(source.win_rate);
    if (!hero || games === null || pickRate === null || (rawWins === null && rawWinRate === null)) continue;
    const wins = Math.min(games, rawWins ?? Math.round((games * rawWinRate!) / 100));
    const losses = Math.max(0, Math.min(games - wins, rawLosses ?? games - wins));
    const winRate = games === 0 ? 0 : rawWinRate ?? (wins / games) * 100;
    rows.push({
      hero,
      games,
      wins,
      losses,
      winRate,
      pickRate,
      banRate: numeric(source.ban_rate),
    });
  }
  if (unknownHeroes.size > 0) console.warn("Unmapped Heroes Profile hero names:", [...unknownHeroes]);
  return rows;
}

export function parseGroupedHeroStats(raw: unknown): HeroMetaMapStats {
  const grouped = asRecord(asRecord(raw)?.data);
  if (!grouped) throw new Error("맵별 통계 응답 형식이 올바르지 않습니다.");

  const mapStats: HeroMetaMapStats = {};
  for (const [mapName, rows] of Object.entries(grouped)) {
    if (!Array.isArray(rows)) throw new Error("맵별 통계 응답 형식이 올바르지 않습니다.");
    const gameMap = MAP_BY_NORMALIZED_NAME.get(normalizeName(mapName));
    if (!gameMap) {
      console.warn("Unmapped Heroes Profile map name:", mapName);
      continue;
    }
    if (mapStats[gameMap]) throw new Error(`중복된 맵 통계가 있습니다: ${mapName}`);
    mapStats[gameMap] = parseHeroStats({ data: rows });
  }

  if (Object.keys(mapStats).length === 0) throw new Error("지원 가능한 맵 통계가 없습니다.");
  return mapStats;
}

function percentileRank(value: number, values: ReadonlyArray<number>): number {
  if (values.length < 2) return 50;
  const sorted = [...values].sort((a, b) => a - b);
  const below = sorted.filter((item) => item < value).length;
  const equal = sorted.filter((item) => item === value).length;
  return ((below + (equal - 1) / 2) / (sorted.length - 1)) * 100;
}

function band(index: number, count: number): HeroMetaGrade {
  const ratio = index / (count - 1);
  if (ratio <= 0.1) return "S";
  if (ratio <= 0.3) return "A";
  if (ratio <= 0.7) return "B";
  if (ratio <= 0.9) return "C";
  return "D";
}

export function gradeHeroStats(stats: HeroMetaStat[]): HeroMetaRow[] {
  const byRole = new Map<HeroRole, HeroMetaStat[]>();
  for (const stat of stats.filter((row) => row.games >= 100)) {
    const role = HERO_CATALOG[stat.hero].role;
    byRole.set(role, [...(byRole.get(role) ?? []), stat]);
  }

  const graded = new Map<Hero, Pick<HeroMetaRow, "tier" | "tierScore">>();
  for (const group of byRole.values()) {
    if (group.length < 5) continue;
    const winScores = group.map((row) => calculateConservativeWinRateScore({
      totalGames: row.games,
      wins: row.wins,
      losses: row.losses,
      draws: 0,
      winRate: row.winRate,
    }));
    const picks = group.map((row) => row.pickRate);
    const bans = group.flatMap((row) => row.banRate === null ? [] : [row.banRate]);
    const scores = group.map((row, index) => {
      const win = percentileRank(winScores[index], winScores);
      const pick = percentileRank(row.pickRate, picks);
      const ban = row.banRate === null || bans.length === 0 ? null : percentileRank(row.banRate, bans);
      return { hero: row.hero, score: (win * 70 + pick * 20 + (ban ?? 0) * (ban === null ? 0 : 10)) / (ban === null ? 90 : 100) };
    }).sort((a, b) => b.score - a.score || a.hero.localeCompare(b.hero));

    scores.forEach((row, index) => graded.set(row.hero, {
      tier: band(index, scores.length),
      tierScore: Math.round(row.score * 10) / 10,
    }));
  }

  return stats.map((stat) => ({
    ...stat,
    role: HERO_CATALOG[stat.hero].role,
    tier: graded.get(stat.hero)?.tier ?? null,
    tierScore: graded.get(stat.hero)?.tierScore ?? null,
  })).sort((a, b) => (b.tierScore ?? -1) - (a.tierScore ?? -1) || a.hero.localeCompare(b.hero));
}
