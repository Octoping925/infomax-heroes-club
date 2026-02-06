import { MatchHistoryItem } from "@/domain/hots/types/match-contract";

export function useMatchResult(match: MatchHistoryItem) {
  const { teams, games, winnerTeamNumber } = match;

  const team1 = teams.find((t) => t.teamNumber === 1);
  const team2 = teams.find((t) => t.teamNumber === 2);

  if (!team1 || !team2) {
    throw new Error("팀 정보가 없습니다.");
  }

  const team1Wins = games.filter((g) => g.winnerTeamNumber === 1).length;
  const team2Wins = games.filter((g) => g.winnerTeamNumber === 2).length;

  const team1Name = team1.leader.name.slice(1) + "팀";
  const team2Name = team2.leader.name.slice(1) + "팀";

  const isTeam1Winner = winnerTeamNumber === 1;
  const isTeam2Winner = winnerTeamNumber === 2;
  const isDraw = winnerTeamNumber === null;

  function getWinnerLabel() {
    if (isDraw) {
      return "무승부";
    }

    return isTeam1Winner ? `${team1Name} 승` : `${team2Name} 승`;
  }

  return {
    team1,
    team2,
    team1Name,
    team2Name,
    team1Wins,
    team2Wins,
    isTeam1Winner,
    isTeam2Winner,
    isDraw,
    getWinnerLabel,
  };
}
