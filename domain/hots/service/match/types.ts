import { HeroRole } from "@/domain/hots/models";

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
