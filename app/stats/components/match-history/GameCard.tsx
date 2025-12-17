import { MatchHistoryItem } from "@/app/api/matches/route";
import { MAPS } from "@/domain/hots/constants/maps";
import { GameTeamTable } from "./GameTeamTable";

interface GameCardProps {
  game: MatchHistoryItem["games"][number];
}

export function GameCard({ game }: GameCardProps) {
  const winnerLabel = getWinnerLabel(game.winnerTeamNumber);
  const mapName = MAPS[game.map as keyof typeof MAPS] ?? game.map;

  const team1 = game.teams.find((t) => t.teamNumber === 1);
  const team2 = game.teams.find((t) => t.teamNumber === 2);

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">
            Game {game.gameNumber} · {mapName}
          </p>
          <p className="text-xs text-gray-500 mt-1">{winnerLabel}</p>
        </div>
      </div>

      <div className="border-t border-white/10 grid grid-cols-1 lg:grid-cols-2">
        <GameTeamTable
          title="팀 1"
          result={team1?.result ?? null}
          members={team1?.members ?? []}
          accent="border-cyan-500/30"
        />
        <GameTeamTable
          title="팀 2"
          result={team2?.result ?? null}
          members={team2?.members ?? []}
          accent="border-purple-500/30"
        />
      </div>
    </div>
  );
}

function getWinnerLabel(winnerTeamNumber: number | null): string {
  if (winnerTeamNumber === null) return "무승부";
  return `팀 ${winnerTeamNumber} 승`;
}
