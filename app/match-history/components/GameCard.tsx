import type { MatchHistoryItem } from "@/domain/hots/types/match-contract";
import { MAP_CATALOG } from "@/domain/hots/constants/maps";
import { GameTeamTable } from "./GameTeamTable";

interface GameCardProps {
  readonly game: MatchHistoryItem["games"][number];
  readonly team1Name: string;
  readonly team2Name: string;
}

export function GameCard({ game, team1Name, team2Name }: GameCardProps) {
  const team1 = game.teams.find((t) => t.teamNumber === 1);
  const team2 = game.teams.find((t) => t.teamNumber === 2);

  const isTeam1Winner = game.winnerTeamNumber === 1;

  // 게임 정보 계산
  const gameLengthMinutes = Math.floor(game.gameLength / 60);
  const gameLengthSeconds = game.gameLength % 60;
  const formattedGameLength = `${gameLengthMinutes}:${gameLengthSeconds.toString().padStart(2, "0")}`;

  return (
    <div className="bg-white/5 border border-white/10 overflow-hidden transition-all">
      <div className="px-4 py-3 flex items-center justify-between bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <h5 className="flex items-center justify-center h-8 text-base font-black text-gray-200">
            Game {game.gameNumber} · {MAP_CATALOG[game.map].nameKo}
          </h5>
          <span className="text-sm text-gray-400 font-bold">⏱️ {formattedGameLength}</span>
        </div>
        <div className="flex items-center gap-2">
          {game.winnerTeamNumber === null ? (
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 border border-white/5">
              Draw
            </span>
          ) : (
            <span
              className={`text-sm font-bold tracking-widest px-2 py-0.5 rounded border ${
                isTeam1Winner
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                  : "bg-purple-500/10 text-purple-400 border-purple-500/30"
              }`}
            >
              {game.winnerTeamNumber === 1 ? team1Name : team2Name} 승
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <GameTeamTable
          title={team1Name}
          level={team1?.teamLevel}
          result={team1?.result ?? null}
          bans={team1?.bans ?? []}
          members={team1?.members ?? []}
          accent="border-cyan-500/30"
        />
        <GameTeamTable
          title={team2Name}
          level={team2?.teamLevel}
          result={team2?.result ?? null}
          bans={team2?.bans ?? []}
          members={team2?.members ?? []}
          accent="border-purple-500/30"
        />
      </div>
    </div>
  );
}
