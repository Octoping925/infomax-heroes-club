import { MatchHistoryItem } from "@/app/api/matches/route";
import { MAPS } from "@/domain/hots/constants/maps";
import { GameTeamTable } from "./GameTeamTable";

interface GameCardProps {
  readonly game: MatchHistoryItem["games"][number];
  readonly team1Name: string;
  readonly team2Name: string;
}

export function GameCard({ game, team1Name, team2Name }: GameCardProps) {
  const mapName = MAPS[game.map as keyof typeof MAPS] ?? game.map;

  const team1 = game.teams.find((t) => t.teamNumber === 1);
  const team2 = game.teams.find((t) => t.teamNumber === 2);

  const isTeam1Winner = game.winnerTeamNumber === 1;

  // 게임 정보 계산
  const gameLengthMinutes = Math.floor(game.gameLength / 60);
  const gameLengthSeconds = game.gameLength % 60;
  const formattedGameLength = `${gameLengthMinutes}:${gameLengthSeconds.toString().padStart(2, "0")}`;

  const maxTeamLevel = Math.max(team1?.teamLevel ?? 0, team2?.teamLevel ?? 0);

  // 전체 게임 플레이어를 정렬하여 등수 계산 (가라로 1~10등)
  const allMembers = [
    ...(team1?.members.map((m) => ({ ...m, teamNumber: 1 })) ?? []),
    ...(team2?.members.map((m) => ({ ...m, teamNumber: 2 })) ?? []),
  ];

  // 가라 등수: 각 플레이어에 1~10등 할당
  const membersWithRank = allMembers.map((member, index) => ({
    ...member,
    rank: index + 1,
  }));

  // 팀별로 분리
  const team1MembersWithRank = membersWithRank.filter((m) => m.teamNumber === 1);
  const team2MembersWithRank = membersWithRank.filter((m) => m.teamNumber === 2);

  return (
    <div className="bg-white/5 border border-white/10 overflow-hidden transition-all">
      <div className="px-4 py-3 flex items-center justify-between bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <h5 className="flex items-center justify-center h-8 text-sm font-black text-gray-200">
            Game {game.gameNumber} · {mapName}
          </h5>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>⏱️ {formattedGameLength}</span>
            <span>📊 레벨 {maxTeamLevel}</span>
          </div>
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
          result={team1?.result ?? null}
          bans={team1?.bans ?? []}
          members={team1MembersWithRank}
          accent="border-cyan-500/30"
        />
        <GameTeamTable
          title={team2Name}
          result={team2?.result ?? null}
          bans={team2?.bans ?? []}
          members={team2MembersWithRank}
          accent="border-purple-500/30"
        />
      </div>
    </div>
  );
}
