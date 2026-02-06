import { HeroRole } from "@/domain/hots/models";
import { GameResult } from "@/generated/prisma/client";

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

export type StatWeights = {
  heroDamage: number;
  siegeDamage: number;
  healingDone: number;
  experienceContribution: number;
  damageTaken: number;
  timeCCdEnemyHeroes: number;
  takedowns: number;
  kills: number;
};

export type PlayerStats = {
  id: string;
  position: HeroRole;
  kills: number;
  deaths: number;
  takedowns: number;
  heroDamage: number;
  siegeDamage: number;
  healingDone: number;
  experienceContribution: number;
  damageTaken: number;
  timeCCdEnemyHeroes: number;
  timeSpentDead: number;
  mercCampCaptures: number;
  watchTowerCaptures: number;
};

export type PlayerStatsSource = Pick<
  PlayerStats,
  | "id"
  | "position"
  | "kills"
  | "deaths"
  | "takedowns"
  | "heroDamage"
  | "siegeDamage"
  | "healingDone"
  | "experienceContribution"
  | "damageTaken"
  | "timeCCdEnemyHeroes"
  | "timeSpentDead"
  | "mercCampCaptures"
  | "watchTowerCaptures"
>;

export type RankedPlayer = PlayerStats & {
  rank: number;
  baseScore: number;
  bonusScore: number;
  totalScore: number;
  weightedScores: StatWeights;
};

export const DEFAULT_STAT_WEIGHTS: StatWeights = {
  heroDamage: 1,
  siegeDamage: 1,
  healingDone: 1,
  experienceContribution: 1,
  damageTaken: 1,
  timeCCdEnemyHeroes: 1,
  takedowns: 1,
  kills: 1,
};

const POSITION_WEIGHTS: Record<HeroRole, StatWeights> = {
  TANKER: {
    heroDamage: 1,
    siegeDamage: 0.5,
    healingDone: 0.5,
    experienceContribution: 1,
    damageTaken: 5,
    timeCCdEnemyHeroes: 5,
    takedowns: 2,
    kills: 1,
  },
  OFFLANER: {
    heroDamage: 2,
    siegeDamage: 4,
    healingDone: 0.5,
    experienceContribution: 5.5,
    damageTaken: 3.5,
    timeCCdEnemyHeroes: 2.5,
    takedowns: 3,
    kills: 1,
  },
  MAIN_DEALER: {
    heroDamage: 6,
    siegeDamage: 1.5,
    healingDone: 0,
    experienceContribution: 1.5,
    damageTaken: 0,
    timeCCdEnemyHeroes: 0.5,
    takedowns: 2.5,
    kills: 1.5,
  },
  SUB_DEALER: {
    heroDamage: 6,
    siegeDamage: 1.5,
    healingDone: 0,
    experienceContribution: 2,
    damageTaken: 0,
    timeCCdEnemyHeroes: 1.5,
    takedowns: 3,
    kills: 1.5,
  },
  HEALER: {
    heroDamage: 0.5,
    siegeDamage: 0.5,
    healingDone: 5,
    experienceContribution: 1,
    damageTaken: 0.5,
    timeCCdEnemyHeroes: 2,
    takedowns: 1.5,
    kills: 0.5,
  },
};

export function parseTakeParam(input: string | null): number {
  if (!input) return DEFAULT_TAKE;
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return DEFAULT_TAKE;
  if (parsed <= 0) return DEFAULT_TAKE;
  return Math.min(Math.floor(parsed), MAX_TAKE);
}

export function toPlayerStats(source: PlayerStatsSource): PlayerStats {
  return {
    id: source.id,
    position: source.position,
    kills: source.kills,
    deaths: source.deaths,
    takedowns: source.takedowns,
    heroDamage: source.heroDamage,
    siegeDamage: source.siegeDamage,
    healingDone: source.healingDone,
    experienceContribution: source.experienceContribution,
    damageTaken: source.damageTaken,
    timeCCdEnemyHeroes: source.timeCCdEnemyHeroes,
    timeSpentDead: source.timeSpentDead,
    mercCampCaptures: source.mercCampCaptures,
    watchTowerCaptures: source.watchTowerCaptures,
  };
}

export function buildRankedPlayerMap(players: PlayerStats[]): Map<string, RankedPlayer> {
  return new Map(calculatePlayerRankings(players).map((player) => [player.id, player]));
}

export function calculatePlayerRankings(players: PlayerStats[]): RankedPlayer[] {
  const maxValues = {
    heroDamage: maxBy(players, (player) => player.heroDamage),
    siegeDamage: maxBy(players, (player) => player.siegeDamage),
    healingDone: maxBy(players, (player) => player.healingDone),
    experienceContribution: maxBy(players, (player) => player.experienceContribution),
    damageTaken: maxBy(players, (player) => player.damageTaken),
    timeCCdEnemyHeroes: maxBy(players, (player) => player.timeCCdEnemyHeroes),
    takedowns: maxBy(players, (player) => player.takedowns),
    kills: maxBy(players, (player) => player.kills),
  };

  const scored = players.map((player) => {
    const weights = POSITION_WEIGHTS[player.position] ?? DEFAULT_STAT_WEIGHTS;
    const weightedScores: StatWeights = {
      heroDamage: normalizeScore(player.heroDamage, maxValues.heroDamage) * weights.heroDamage,
      siegeDamage: normalizeScore(player.siegeDamage, maxValues.siegeDamage) * weights.siegeDamage,
      healingDone: normalizeScore(player.healingDone, maxValues.healingDone) * weights.healingDone,
      experienceContribution:
        normalizeScore(player.experienceContribution, maxValues.experienceContribution) *
        weights.experienceContribution,
      damageTaken: normalizeScore(player.damageTaken, maxValues.damageTaken) * weights.damageTaken,
      timeCCdEnemyHeroes:
        normalizeScore(player.timeCCdEnemyHeroes, maxValues.timeCCdEnemyHeroes) * weights.timeCCdEnemyHeroes,
      takedowns: normalizeScore(player.takedowns, maxValues.takedowns) * weights.takedowns,
      kills: normalizeScore(player.kills, maxValues.kills) * weights.kills,
    };

    const baseScore = sumScores(weightedScores);
    const bonusScore = player.mercCampCaptures * 5 + player.watchTowerCaptures * 5;
    const penaltyMultiplier = isTankPenaltyReduced(player.position) ? 0.6 : 1;
    const penaltyScore = (player.deaths * 50 + player.timeSpentDead * 1.5) * penaltyMultiplier;
    const totalScore = baseScore + bonusScore - penaltyScore;

    return {
      ...player,
      baseScore,
      bonusScore,
      totalScore,
      weightedScores,
      rank: 0,
    };
  });

  return scored
    .toSorted((a, b) => b.totalScore - a.totalScore)
    .map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
}

export function calculateGameResult(teamNumber: number, winnerTeamNumber: number | null): GameResult {
  if (winnerTeamNumber === null) {
    return GameResult.DRAW;
  }
  return teamNumber === winnerTeamNumber ? GameResult.WIN : GameResult.LOSE;
}

function normalizeScore(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0;
  return value / maxValue;
}

function maxBy(players: PlayerStats[], selector: (player: PlayerStats) => number): number {
  if (players.length === 0) return 0;
  return Math.max(...players.map(selector));
}

function sumScores(scores: StatWeights): number {
  return (
    scores.heroDamage +
    scores.siegeDamage +
    scores.healingDone +
    scores.experienceContribution +
    scores.damageTaken +
    scores.timeCCdEnemyHeroes +
    scores.takedowns +
    scores.kills
  );
}

function isTankPenaltyReduced(position: HeroRole): boolean {
  return position === "TANKER" || position === "OFFLANER";
}
