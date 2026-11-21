import { describe, expect, it } from "vitest";
import { buildDoorayMatchupBotMessage, formatMatchupShareText } from "./matchup-message";
import type { MatchupPreviewResponse } from "@/domain/hots/service/matchup-preview";

const samplePreview: MatchupPreviewResponse = {
  generatedAt: "2026-11-21T02:00:00.000Z",
  matchType: "LUNCH",
  probability: {
    teamA: 56.5,
    teamB: 43.5,
    factors: [{ label: "최근 폼", teamAEdge: 8.0 }],
  },
  enteredRosterStats: { totalGames: 0, wins: 0, losses: 0, draws: 0, winRate: 0 },
  storylines: [
    {
      kind: "RIVALRY",
      badge: "라이벌리",
      title: "gamma, alpha 상대 설욕전",
      detail: "통산 맞대결 alpha 4승 1패 우세 (5매치)",
    },
  ],
  teamA: {
    label: "A",
    roster: [
      {
        playerId: "p1",
        playerName: "김알파",
        playerNickname: "alpha",
        isLeader: true,
        primaryRole: "TANKER",
        overallStats: { totalGames: 10, wins: 6, losses: 4, draws: 0, winRate: 60 },
        recentStats: { totalGames: 8, wins: 5, losses: 3, draws: 0, winRate: 62.5 },
        matchTypeStats: { totalGames: 6, wins: 4, losses: 2, draws: 0, winRate: 66.7 },
        topHeroes: [],
      },
    ],
    averageOverallWinRate: 60,
    averageRecentWinRate: 62.5,
    averageMatchTypeWinRate: 66.7,
    averageSynergyWinRate: null,
    roleCoverage: [],
    missingRoles: [],
    bestDuo: null,
    jinxDuo: null,
    leaderStat: null,
  },
  teamB: {
    label: "B",
    roster: [
      {
        playerId: "p2",
        playerName: "박감마",
        playerNickname: "gamma",
        isLeader: false,
        primaryRole: "HEALER",
        overallStats: { totalGames: 10, wins: 4, losses: 6, draws: 0, winRate: 40 },
        recentStats: { totalGames: 8, wins: 3, losses: 5, draws: 0, winRate: 37.5 },
        matchTypeStats: { totalGames: 6, wins: 2, losses: 4, draws: 0, winRate: 33.3 },
        topHeroes: [],
      },
    ],
    averageOverallWinRate: 40,
    averageRecentWinRate: 37.5,
    averageMatchTypeWinRate: 33.3,
    averageSynergyWinRate: null,
    roleCoverage: [],
    missingRoles: [],
    bestDuo: null,
    jinxDuo: null,
    leaderStat: null,
  },
  rivalries: [],
};

describe("matchup-message", () => {
  it("formats share text with expected win rate, rosters, storylines, and URL", () => {
    const text = formatMatchupShareText(samplePreview, "https://club.example/matchup?a=alpha&b=gamma");
    expect(text).toContain("점심 내전 대진표 확정");
    expect(text).toContain("A팀 56.5% vs B팀 43.5%");
    expect(text).toContain("👑alpha");
    expect(text).toContain("gamma");
    expect(text).toContain("gamma, alpha 상대 설욕전");
    expect(text).toContain("https://club.example/matchup?a=alpha&b=gamma");
  });

  it("builds a Dooray bot message with two team fields and storyline attachment", () => {
    const bot = buildDoorayMatchupBotMessage(samplePreview, "https://club.example/matchup?a=alpha&b=gamma");
    expect(bot.botName).toBe("히오스 내전 알리미");
    expect(bot.text).toContain("56.5%");
    expect(bot.attachments).toHaveLength(2);
  });
});
