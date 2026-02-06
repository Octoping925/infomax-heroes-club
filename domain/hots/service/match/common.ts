import { GameResult } from "@/generated/prisma/client";
import { PlayerStats, PlayerStatsSource } from "./types";

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

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

export function calculateGameResult(teamNumber: number, winnerTeamNumber: number | null): GameResult {
  if (winnerTeamNumber === null) {
    return GameResult.DRAW;
  }
  return teamNumber === winnerTeamNumber ? GameResult.WIN : GameResult.LOSE;
}
