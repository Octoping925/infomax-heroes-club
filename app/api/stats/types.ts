import { GameMap, Hero, HeroRole } from "@domain/hots/models";
import { round } from "es-toolkit";

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

/** 플레이어 평균 스탯 통계 응답(게임 단위) */
export interface PlayerAverageStatsResponse {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly totalGames: number;
  readonly averageKills: number;
  readonly averageDeaths: number;
  readonly averageTakedowns: number;
  readonly averageHeroDamage: number;
  readonly averageDamageTaken: number;
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

/** 영웅 듀오(같은 팀) 승률 응답 (게임 단위) */
export interface HeroDuoWinRateResponse extends WinRateStats {
  readonly heroA: Hero;
  readonly heroB: Hero;
}

/** 플레이어의 맵별 영웅 승률 응답 */
export interface PlayerHeroMapWinRateResponse {
  readonly map: GameMap;
  readonly heroStats: ReadonlyArray<HeroWinRateResponse>;
}

/** 플레이어의 영웅별 승률 응답 */
export interface PlayerHeroWinRateResponse {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly heroStats: ReadonlyArray<HeroWinRateResponse>;
  readonly heroStatsByMap: ReadonlyArray<PlayerHeroMapWinRateResponse>;
}

export type PlayerFormResult = "WIN" | "LOSE" | "DRAW";

export interface PlayerFormPointResponse {
  readonly gameId: string;
  readonly playedAt: string;
  readonly gameNumber: number;
  readonly map: GameMap;
  readonly hero: Hero;
  readonly result: PlayerFormResult;
  readonly kills: number;
  readonly deaths: number;
  readonly takedowns: number;
  readonly dpm: number;
}

export interface PlayerFormTrendResponse {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly totalGames: number;
  readonly points: ReadonlyArray<PlayerFormPointResponse>;
}

export interface PlayerCombinedWinRateResponse {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly matchStats: WinRateStats;
  readonly gameStats: WinRateStats;
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

export type HeroTierLabel = "OP" | "1티어" | "2티어" | "3티어" | "4티어" | "5티어";

export interface HeroTierResponse {
  readonly hero: Hero;
  readonly tier: HeroTierLabel;
  readonly isHoneyPick: boolean;
  readonly honeyScore: number;
  readonly tierScore: number;
  readonly pickCount: number;
  readonly banCount: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly pickRate: number;
  readonly banRate: number;
  readonly pickWinRate: number;
}

export interface HeroCounterPickItemResponse {
  readonly opponentHero: Hero;
  readonly games: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly winRate: number;
  readonly dropPercentPoint: number;
}

export interface HeroCounterPickResponse {
  readonly hero: Hero;
  readonly totalGames: number;
  readonly baseWinRate: number;
  readonly counters: ReadonlyArray<HeroCounterPickItemResponse>;
}

/** 맵별 플레이어 승률 응답 */
export interface MapPlayerWinRateResponse {
  readonly map: GameMap;
  readonly playerStats: ReadonlyArray<PlayerWinRateResponse>;
}

/** 맵별 영웅 승률 응답 */
export interface MapHeroWinRateResponse {
  readonly map: GameMap;
  readonly heroStats: HeroWinRateResponse[];
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

// ============================================
// Rivalry (라이벌리)
// ============================================

export type RivalryLabelType = "DESTINED_RIVAL" | "NEMESIS";

export interface RivalryLabel {
  readonly type: RivalryLabelType;
  /**
   * UI에 바로 보여줄 라벨 텍스트(한국어)
   * - 예: "숙명의 라이벌", "천적: B → A"
   */
  readonly text: string;
}

export type RivalryRecentResult = "A" | "B" | "D";

export interface RivalrySide {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  /** 0 ~ 100 */
  readonly winRate: number;
}

export interface RivalryHeroPick {
  readonly hero: Hero;
  readonly count: number;
}

export interface RivalryScoreBreakdown {
  /** 맞대결 횟수(매치 단위) */
  readonly matchesCount: number;
  /** 0 ~ 1 */
  readonly countScore: number;
  /** 0 ~ 1 (50:50에 가까울수록 1) */
  readonly balance: number;
  /** 0 ~ 1 (최근성 + 최근 5경기 가중) */
  readonly recency: number;
  /** 0 ~ 1 (퍼포먼스 격차가 작을수록 1) */
  readonly performanceCloseness: number;
  /** 0 ~ 1 (가중치 적용 후) */
  readonly rawScore: number;
}

export interface RivalryCardResponse {
  /** pair의 안정적인 키 (playerId 기반, A|B는 정렬된 순서) */
  readonly id: string;
  readonly score: number; // 0 ~ 100
  readonly labels: ReadonlyArray<RivalryLabel>;
  readonly playerA: RivalrySide;
  readonly playerB: RivalrySide;
  readonly recent5: {
    readonly winsA: number;
    readonly winsB: number;
    readonly draws: number;
    readonly sequence: ReadonlyArray<RivalryRecentResult>;
  };
  readonly lunchDinner: {
    readonly lunch: {
      readonly winsA: number;
      readonly winsB: number;
      readonly draws: number;
    };
    readonly dinner: {
      readonly winsA: number;
      readonly winsB: number;
      readonly draws: number;
    };
  };
  readonly topHeroes: {
    readonly playerA: ReadonlyArray<RivalryHeroPick>;
    readonly playerB: ReadonlyArray<RivalryHeroPick>;
  };
  /** 자동 생성된 한국어 멘트 */
  readonly comment: string;
  readonly breakdown: RivalryScoreBreakdown;
  /** ISO string */
  readonly lastPlayedAt: string;
}

export interface RivalryListResponse {
  readonly generatedAt: string; // ISO string
  readonly params: {
    readonly minMatches: number;
    readonly limit: number;
    readonly takeMatches: number;
    readonly includeInsufficientSample: boolean;
  };
  readonly hottest: RivalryCardResponse | null;
  readonly items: ReadonlyArray<RivalryCardResponse>;
}

export interface TeamingWindowStats {
  readonly encounterMatches: number;
  readonly sameTeamMatches: number;
  /** 0 ~ 100 */
  readonly sameTeamRate: number;
}

export interface TeamingPairStatResponse {
  readonly playerAId: string;
  readonly playerBId: string;
  readonly allTime: TeamingWindowStats;
  readonly recent6: TeamingWindowStats;
}

export interface PlayerRoleStatResponse {
  readonly role: HeroRole;
  readonly games: number;
  /** 0 ~ 100 */
  readonly rate: number;
}

export interface TeamingPlayerProfileResponse {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly totalMatches: number;
  /** 0 ~ 100 */
  readonly allTimeWinRate: number;
  /** 0 ~ 100, 최근 recentMatchCount 내 개인 참여 경기 기준 */
  readonly recentWinRate: number;
  readonly recentGames: number;
  readonly primaryRole: HeroRole | null;
  readonly flexibility: number;
  readonly roleStats: ReadonlyArray<PlayerRoleStatResponse>;
}

export interface TeamComposerResponse {
  readonly generatedAt: string;
  readonly recentMatchCount: number;
  readonly defaultCandidateIds: ReadonlyArray<string>;
  readonly players: ReadonlyArray<TeamingPlayerProfileResponse>;
  readonly pairs: ReadonlyArray<TeamingPairStatResponse>;
}

/**
 * 평균을 계산하는 유틸리티 함수
 */
export function calculateAverage(total: number, count: number): number {
  if (count === 0) return 0;
  return round(total / count, 2);
}
