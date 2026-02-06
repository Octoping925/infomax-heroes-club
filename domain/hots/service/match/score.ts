import { HeroRole } from "@/domain/hots/models";
import { PlayerStats, RankedPlayer, StatWeights } from "./types";

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
    heroDamage: 2,
    siegeDamage: 0.5,
    healingDone: 0.5,
    experienceContribution: 1,
    damageTaken: 8,
    timeCCdEnemyHeroes: 6,
    takedowns: 3,
    kills: 1,
  },
  OFFLANER: {
    heroDamage: 5,
    siegeDamage: 4,
    healingDone: 0.5,
    experienceContribution: 5.5,
    damageTaken: 3.5,
    timeCCdEnemyHeroes: 2.5,
    takedowns: 3,
    kills: 1,
  },
  MAIN_DEALER: {
    heroDamage: 10,
    siegeDamage: 2.5,
    healingDone: 0,
    experienceContribution: 1.5,
    damageTaken: 0,
    timeCCdEnemyHeroes: 0.5,
    takedowns: 3.5,
    kills: 1.5,
  },
  SUB_DEALER: {
    heroDamage: 9,
    siegeDamage: 3.5,
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
    healingDone: 7,
    experienceContribution: 1,
    damageTaken: 0.5,
    timeCCdEnemyHeroes: 2,
    takedowns: 1.5,
    kills: 0.5,
  },
};

export function buildRankedPlayerMap(players: PlayerStats[]): Map<string, RankedPlayer> {
  return new Map(calculatePlayerRankings(players).map((player) => [player.id, player]));
}

export function calculatePlayerRankings(players: PlayerStats[]): RankedPlayer[] {
  const maxValues = {
    heroDamage: maxBy(players, (p) => p.heroDamage),
    siegeDamage: maxBy(players, (p) => p.siegeDamage),
    healingDone: maxBy(players, (p) => p.healingDone),
    experienceContribution: maxBy(players, (p) => p.experienceContribution),
    damageTaken: maxBy(players, (p) => p.damageTaken),
    timeCCdEnemyHeroes: maxBy(players, (p) => p.timeCCdEnemyHeroes),
    takedowns: maxBy(players, (p) => p.takedowns),
    kills: maxBy(players, (p) => p.kills),
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
    const penaltyScore = (player.timeSpentDead * 0.5 + player.deaths) * penaltyMultiplier;
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

function normalizeScore(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0;
  return value / maxValue;
}

function maxBy(players: PlayerStats[], selector: (player: PlayerStats) => number): number {
  if (players.length === 0) return 0;
  return Math.max(...players.map(selector));
}

function sumScores(scores: StatWeights) {
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

function isTankPenaltyReduced(position: HeroRole) {
  return position === "TANKER" || position === "OFFLANER";
}
