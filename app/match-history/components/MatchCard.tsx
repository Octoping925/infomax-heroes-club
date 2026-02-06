import type { MatchHistoryItem } from "@/domain/hots/types/match-contract";
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
  const winnerLabel = isDraw ? "무승부" : `${isTeam1Winner ? team1Name : team2Name} 승`;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] overflow-hidden transition-all hover:border-white/20">
      {/* Header Info */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              match.type === "LUNCH"
                ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
            }`}
          >
            {match.type === "LUNCH" ? "점심" : "저녁"}
          </span>
          <span className="text-sm font-medium text-gray-400">{dayjs(match.playedAt).format("YYYY년 MM월 DD일")}</span>
        </div>
        <button
          onClick={onToggle}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-300 ${
            isExpanded
              ? "bg-white/15 text-gray-200 border-white/20"
              : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white"
          }`}
        >
          {isExpanded ? "접기" : "상세"}
        </button>
      </div>

      {/* Match Content */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 md:items-stretch">
          <div
            className={`rounded-xl border p-3 transition-colors ${
              isTeam1Winner ? "bg-cyan-500/10 border-cyan-400/30" : "bg-white/[0.03] border-white/10"
            } ${isTeam2Winner ? "opacity-65" : "opacity-100"} `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-[0.18em] text-cyan-300/90">TEAM 1</span>
              {isTeam1Winner && !isDraw && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 font-bold">WIN</span>
              )}
            </div>
            <p className="text-base font-black text-white leading-none mb-2">{team1Name}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-2">
              {team1.members.map((m) => (
                <span
                  key={m.id}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
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

          <div className="min-w-[130px] md:min-w-[150px] rounded-xl px-3 py-2.5 flex md:flex-col items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-black tabular-nums ${isTeam1Winner ? "text-cyan-300" : "text-gray-500"}`}>
                {team1Wins}
              </span>
              <span className="text-gray-600 font-bold">:</span>
              <span
                className={`text-3xl font-black tabular-nums ${isTeam2Winner ? "text-fuchsia-300" : "text-gray-500"}`}
              >
                {team2Wins}
              </span>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full border font-bold ${
                isDraw
                  ? "border-white/15 bg-white/5 text-gray-300"
                  : isTeam1Winner
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                    : "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200"
              }`}
            >
              {winnerLabel}
            </span>
          </div>

          <div
            className={`rounded-xl border p-3 transition-colors ${
              isTeam2Winner ? "bg-fuchsia-500/10 border-fuchsia-400/30" : "bg-white/[0.03] border-white/10"
            } ${isTeam1Winner ? "opacity-65" : "opacity-100"} `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-[0.18em] text-fuchsia-300/90">TEAM 2</span>
              {isTeam2Winner && !isDraw && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-400/20 text-fuchsia-200 font-bold">
                  WIN
                </span>
              )}
            </div>
            <p className="text-base font-black text-white leading-none mb-2">{team2Name}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-2">
              {team2.members.map((m) => (
                <span
                  key={m.id}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
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
            <GameCard key={game.id} game={game} team1Name={team1Name} team2Name={team2Name} />
          ))}
        </div>
      )}
    </div>
  );
}
