import type { MatchHistoryItem } from "@/domain/hots/types/match-contract";
import { GameTeamTable } from "./GameTeamTable";

interface GameCardProps {
  readonly game: MatchHistoryItem["games"][number];
  readonly team1Name: string;
  readonly team2Name: string;
}

export function GameCard({ game, team1Name, team2Name }: GameCardProps) {
  const team1 = game.teams.find((t) => t.teamNumber === 1);
  const team2 = game.teams.find((t) => t.teamNumber === 2);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <GameTeamTable
        side={1}
        title={team1Name}
        level={team1?.teamLevel}
        result={team1?.result ?? null}
        bans={team1?.bans ?? []}
        members={team1?.members ?? []}
      />
      <GameTeamTable
        side={2}
        title={team2Name}
        level={team2?.teamLevel}
        result={team2?.result ?? null}
        bans={team2?.bans ?? []}
        members={team2?.members ?? []}
      />
    </div>
  );
}
