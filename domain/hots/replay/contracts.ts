import type { GameMap } from "@/domain/hots/models/map";
import type { RawGame, RawPlayerStat, RawTeam } from "@/domain/hots/types/replay-import-contract";

export interface ReplayImportPlayer extends RawPlayerStat {
  readonly rawName: string;
  readonly suggestedNickname: string | null;
}

export interface ReplayImportTeam extends RawTeam {
  readonly players: ReadonlyArray<ReplayImportPlayer>;
}

export interface ReplayImportGame extends RawGame {
  readonly team1: ReplayImportTeam;
  readonly team2: ReplayImportTeam;
}

export interface NormalizedReplay {
  readonly build: number | null;
  readonly playedAt: string;
  readonly playedAtKst: string;
  readonly dateKey: string;
  readonly map: GameMap;
  readonly winnerSide: 0 | 1;
  readonly game: ReplayImportGame;
  readonly warnings: ReadonlyArray<string>;
}
