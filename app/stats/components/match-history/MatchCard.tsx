import { MatchHistoryItem } from "@/app/api/matches/route";
import dayjs from "dayjs";
import { TeamSummaryCard } from "./TeamSummaryCard";
import { GameCard } from "./GameCard";

interface MatchCardProps {
  match: MatchHistoryItem;
  isExpanded: boolean;
  onToggle: () => void;
}

export function MatchCard({ match, isExpanded, onToggle }: MatchCardProps) {
  const team1 = match.teams.find((t) => t.teamNumber === 1);
  const team2 = match.teams.find((t) => t.teamNumber === 2);

  if (!team1 || !team2) {
    return null;
  }

  const team1Name = team1.leader.name.slice(1) + "팀";
  const team2Name = team2.leader.name.slice(1) + "팀";

  const winnerLabel = getWinnerLabel(
    match.winnerTeamNumber,
    team1Name,
    team2Name
  );

  return (
    <main className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-5">
        <table className="w-full table-fixed">
          <tbody>
            <tr>
              <td className="align-top w-26">
                <span className="block text-center w-22 px-3 py-1 mb-2 rounded-full text-md font-medium border bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                  {match.type === "LUNCH" ? "점심" : "저녁"}
                </span>
                <span className="block text-center w-22 px-3 py-1 mb-2 rounded-full text-md font-medium border bg-white/5 text-gray-300 border-white/10">
                  {winnerLabel}
                </span>
                <span className="block text-md font-semibold text-gray-400 uppercase tracking-wider text-center">
                  {dayjs(match.playedAt).format("YYYY-MM-DD")}
                </span>
              </td>
              <td className="align-top px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TeamSummaryCard
                    title={team1Name}
                    leaderNickname={team1.leader.nickname ?? "-"}
                    members={team1.members.map((m) => m.nickname) ?? []}
                    accent="border-cyan-500/30"
                  />
                  <TeamSummaryCard
                    title={team2Name}
                    leaderNickname={team2.leader.nickname ?? "-"}
                    members={team2.members.map((m) => m.nickname) ?? []}
                    accent="border-purple-500/30"
                  />
                </div>
              </td>
              <td className="align-top w-28 text-right pl-4">
                <button
                  onClick={onToggle}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isExpanded
                      ? "bg-gray-500 text-white shadow-lg shadow-gray-500/25"
                      : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {isExpanded ? "닫기" : "열기"}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {isExpanded && (
        <div className="border-t border-white/10 p-5 space-y-4">
          {match.games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </main>
  );
}

function getWinnerLabel(
  winnerTeamNumber: number | null,
  team1Name: string,
  team2Name: string
) {
  if (winnerTeamNumber === null) return "무승부";
  if (winnerTeamNumber === 1) return `${team1Name} 승`;
  return `${team2Name} 승`;
}
