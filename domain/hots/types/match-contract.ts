import type { Hero, HeroRole } from "@/domain/hots/models";
import type { GameResult, MatchType } from "@/generated/prisma/client";
import type { StatWeights } from "@/domain/hots/service/match/types";

export type MatchHistoryPlayer = {
  readonly id: string;
  readonly name: string;
  readonly nickname: string;
};

export type MatchHistoryMatchTeam = {
  readonly id: string;
  readonly teamNumber: number;
  readonly leader: MatchHistoryPlayer;
  readonly members: ReadonlyArray<MatchHistoryPlayer>;
};

export type MatchHistoryGameTeamMember = {
  id: string;
  player: MatchHistoryPlayer;
  position: HeroRole;
  hero: Hero;
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
  rank: number;
  baseScore: number;
  bonusScore: number;
  totalScore: number;
  weightedScores: StatWeights;
};

export type MatchHistoryGameTeamBan = {
  readonly banOrder: number;
  readonly hero: Hero;
};

export type MatchHistoryGameTeam = {
  readonly id: string;
  readonly teamNumber: number;
  readonly result: GameResult;
  readonly teamLevel: number;
  readonly members: MatchHistoryGameTeamMember[];
  readonly bans: MatchHistoryGameTeamBan[];
};

export type MatchHistoryGame = {
  readonly id: string;
  readonly gameNumber: number;
  readonly gameLength: number;
  readonly map: string;
  readonly winnerTeamNumber: number | null;
  readonly teams: MatchHistoryGameTeam[];
};

export type MatchHistoryItem = {
  readonly id: string;
  readonly playedAt: string;
  readonly type: MatchType;
  readonly winnerTeamNumber: number | null;
  readonly teams: MatchHistoryMatchTeam[];
  readonly games: MatchHistoryGame[];
};

export type GameInput = {
  readonly statsText: string;
  readonly winnerTeamNumber: number | null;
};

export type CreateMatchRequest = {
  readonly playedAt: string;
  readonly type: MatchType;
  readonly team1Leader: string;
  readonly team2Leader: string;
  readonly games: ReadonlyArray<GameInput>;
};

export type CreateMatchResponse = {
  readonly matchId: string;
  readonly gamesCreated: number;
};
