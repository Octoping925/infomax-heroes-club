import type { GameMap } from "@/generated/prisma/enums";
import type { Hero, HeroRole, TalentTier } from "@/domain/hots/models";
import { Talent } from "../models/talent";

export type RawTalentRecord = Partial<Record<`${TalentTier}`, string | null>>;

export type RawTalentEntry = {
  readonly tier: number;
  readonly code: string | null;
};

export type RawPlayerStat = {
  readonly name: string;
  readonly hero: string;
  readonly position?: string;
  readonly talents?: ReadonlyArray<string | null | RawTalentEntry> | RawTalentRecord;
  readonly kills: number;
  readonly deaths: number;
  readonly takedowns: number;
  readonly heroDamage: number;
  readonly siegeDamage?: number;
  readonly damageTaken: number;
  readonly healingDone?: number;
  readonly experienceContribution?: number;
  readonly timeSpentDead?: number;
  readonly timeCCdEnemyHeroes?: number;
  readonly dpm?: number;
  readonly mercCampCaptures?: number;
  readonly watchTowerCaptures?: number;
  readonly regenGlobes?: number;
};

export type RawTeam = {
  readonly win: boolean;
  readonly level?: number;
  readonly players: ReadonlyArray<RawPlayerStat>;
  readonly bans?: ReadonlyArray<string>;
};

export type RawGame = {
  readonly date: string;
  readonly idx: number;
  readonly gameLength?: number;
  readonly map: string;
  readonly team1: RawTeam;
  readonly team2: RawTeam;
};

export type RawReplayImportData = Record<string, ReadonlyArray<RawGame>>;

export type NormalizedPlayer = {
  readonly nickname: string;
  readonly hero: Hero;
  readonly position: HeroRole;
  readonly talents: ReadonlyArray<Talent>;
  readonly kills: number;
  readonly deaths: number;
  readonly takedowns: number;
  readonly heroDamage: number;
  readonly siegeDamage: number;
  readonly damageTaken: number;
  readonly healingDone: number;
  readonly experienceContribution: number;
  readonly timeSpentDead: number;
  readonly timeCCdEnemyHeroes: number;
  readonly dpm: number;
  readonly mercCampCaptures: number;
  readonly watchTowerCaptures: number;
  readonly regenGlobes: number;
};

export type NormalizedTeam = {
  readonly win: boolean;
  readonly teamLevel: number;
  readonly players: ReadonlyArray<NormalizedPlayer>;
  readonly bans: ReadonlyArray<Hero>;
};

export type NormalizedGame = {
  readonly date: string;
  readonly idx: number;
  readonly map: GameMap;
  readonly gameLength: number;
  readonly winnerTeamNumber: number | null;
  readonly team1: NormalizedTeam;
  readonly team2: NormalizedTeam;
};
