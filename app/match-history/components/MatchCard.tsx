import { MatchHistoryItem } from "@/app/api/matches/route";
import dayjs from "dayjs";
import { GameCard } from "./GameCard";

interface MatchCardProps {
  readonly match: MatchHistoryItem;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
}

export function MatchCard({ match, isExpanded, onToggle }: MatchCardProps) {
  const team1 = match.teams.find((t) => t.teamNumber === 1);
  const team2 = match.teams.find((t) => t.teamNumber === 2);

  if (!team1 || !team2) {
    return null;
  }

  const team1Wins = match.games.filter((g) => g.winnerTeamNumber === 1).length;
  const team2Wins = match.games.filter((g) => g.winnerTeamNumber === 2).length;

  const team1Name = team1.leader.name.slice(1) + "팀";
  const team2Name = team2.leader.name.slice(1) + "팀";

  const isTeam1Winner = match.winnerTeamNumber === 1;
  const isTeam2Winner = match.winnerTeamNumber === 2;
  const isDraw = match.winnerTeamNumber === null;

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden transition-all hover:border-white/20">
      {/* Header Info */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-0.5 rounded-full text-sm font-bold border ${
              match.type === "LUNCH"
                ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
            }`}
          >
            {match.type === "LUNCH" ? "점심" : "저녁"}
          </span>
          <span className="text-sm font-medium text-gray-400">
            {dayjs(match.playedAt).format("YYYY년 MM월 DD일")}
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={onToggle}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
            isExpanded
              ? "bg-gray-700 text-gray-300"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          <span className="relative z-10 flex items-center gap-2">
            {isExpanded ? "닫기" : "열기"}
          </span>
        </button>
      </div>

      {/* Match Content */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Team 1 */}
          <div
            className={`flex-1 w-full flex flex-col items-center md:items-end text-center md:text-right transition-opacity ${
              isTeam2Winner ? "opacity-60" : "opacity-100"
            }`}
          >
            <div className="mb-2">
              <span className="text-xs font-bold text-cyan-400/80 uppercase tracking-tighter block mb-1">
                TEAM 1
              </span>
              <h3 className="text-2xl font-black text-white">{team1Name}</h3>
            </div>
            <div className="flex flex-wrap justify-center md:justify-end gap-1.5 mt-2">
              {team1.members.map((m) => (
                <span
                  key={m.id}
                  className={`px-2 py-0.5 rounded text-sm font-medium ${
                    m.id === team1.leader.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "bg-white/5 text-gray-400 border border-white/5"
                  }`}
                >
                  {m.nickname}
                </span>
              ))}
            </div>
          </div>

          {/* Score Center */}
          <div className="flex flex-col items-center shrink-0 px-4">
            <div className="flex items-center gap-4">
              <span
                className={`text-5xl font-black tabular-nums ${
                  isTeam1Winner ? "text-cyan-400" : "text-gray-600"
                }`}
              >
                {team1Wins}
              </span>
              <span className="text-2xl font-bold text-gray-700">:</span>
              <span
                className={`text-5xl font-black tabular-nums ${
                  isTeam2Winner ? "text-purple-400" : "text-gray-600"
                }`}
              >
                {team2Wins}
              </span>
            </div>
            <div className="mt-2 px-4 py-1 rounded-lg bg-white/5 border border-white/10">
              <span className="text-sm font-bold text-gray-400">
                {isDraw ? (
                  "DRAW"
                ) : (
                  <span
                    className={
                      isTeam1Winner ? "text-cyan-400" : "text-purple-400"
                    }
                  >
                    {isTeam1Winner ? team1Name : team2Name} WIN
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Team 2 */}
          <div
            className={`flex-1 w-full flex flex-col items-center md:items-start text-center md:text-left transition-opacity ${
              isTeam1Winner ? "opacity-60" : "opacity-100"
            }`}
          >
            <div className="mb-2">
              <span className="text-xs font-bold text-purple-400/80 uppercase tracking-tighter block mb-1">
                TEAM 2
              </span>
              <h3 className="text-2xl font-black text-white">{team2Name}</h3>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-2">
              {team2.members.map((m) => (
                <span
                  key={m.id}
                  className={`px-2 py-0.5 rounded text-sm font-medium ${
                    m.id === team2.leader.id
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "bg-white/5 text-gray-400 border border-white/5"
                  }`}
                >
                  {m.nickname}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Games */}
      {isExpanded && (
        <div className="bg-black/20 border-t border-white/10 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          {match.games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              team1Name={team1Name}
              team2Name={team2Name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
