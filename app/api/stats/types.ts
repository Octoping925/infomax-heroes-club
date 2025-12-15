import { GameMap, Hero } from "@/generated/prisma/client";

/** 승률 통계 기본 타입 */
export interface WinRateStats {
  readonly totalGames: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly winRate: number; // 0 ~ 100
}

/** 점심/저녁 승률 응답(게임 단위, Match.type으로 구분) */
export interface PlayerLunchDinnerWinRateResponse {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly lunchStats: WinRateStats;
  readonly dinnerStats: WinRateStats;
  readonly dinnerWinRateDiff: number; // dinner - lunch
  readonly absWinRateDiff: number;
}

/** 플레이어 평균 킬/데스 통계 응답(게임 단위) */
export interface PlayerAverageKillsDeathsResponse {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly totalGames: number;
  readonly averageKills: number;
  readonly averageDeaths: number;
}

/** 플레이어 승률 응답 */
export interface PlayerWinRateResponse extends WinRateStats {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
}

/** 영웅 승률 응답 */
export interface HeroWinRateResponse extends WinRateStats {
  readonly hero: Hero;
}

/** 플레이어의 영웅별 승률 응답 */
export interface PlayerHeroWinRateResponse {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly heroStats: ReadonlyArray<HeroWinRateResponse>;
}

/** 팀 변경 승률 응답 */
export interface TeamSwitchWinRateResponse {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly originalTeamStats: WinRateStats;
  readonly switchedTeamStats: WinRateStats;
  readonly switchedWinRateDiff: number; // 팀 변경 시 승률 차이
}

/** 영웅 픽/밴 통계 응답 */
export interface HeroPopularityResponse {
  readonly hero: Hero;
  readonly pickCount: number;
  readonly banCount: number;
  readonly totalAppearance: number;
  readonly pickWinRate: number;
}

/** 맵별 플레이어 승률 응답 */
export interface MapPlayerWinRateResponse {
  readonly map: GameMap;
  readonly playerStats: ReadonlyArray<PlayerWinRateResponse>;
}

/** 2인 조합(듀오) 승률 응답 (매치 단위) */
export interface FantasyDuoWinRateResponse extends WinRateStats {
  readonly playerA: {
    readonly playerId: string;
    readonly playerName: string;
    readonly playerNickname: string;
  };
  readonly playerB: {
    readonly playerId: string;
    readonly playerName: string;
    readonly playerNickname: string;
  };
}

/**
 * 승률을 계산하는 유틸리티 함수
 */
export function calculateWinRate(wins: number, totalGames: number): number {
  if (totalGames === 0) return 0;
  return Math.round((wins / totalGames) * 10000) / 100;
}

/**
 * 평균을 계산하는 유틸리티 함수
 */
export function calculateAverage(total: number, count: number): number {
  if (count === 0) return 0;
  return Math.round((total / count) * 100) / 100;
}
