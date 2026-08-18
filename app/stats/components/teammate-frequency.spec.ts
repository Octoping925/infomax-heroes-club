import { describe, expect, it } from "vitest";
import { buildTeammateRows } from "./teammate-frequency";

describe("buildTeammateRows", () => {
  it("선택 플레이어의 동팀 빈도를 비율과 횟수 순으로 정렬한다", () => {
    const players = [
      { playerId: "p1", playerName: "일", playerNickname: "하나" },
      { playerId: "p2", playerName: "이", playerNickname: "둘" },
      { playerId: "p3", playerName: "삼", playerNickname: "셋" },
      { playerId: "p4", playerName: "사", playerNickname: "넷" },
    ];
    const emptyRecentStats = {
      encounterMatches: 0,
      sameTeamMatches: 0,
      sameTeamRate: 0,
      sameTeamWins: 0,
      sameTeamLosses: 0,
      sameTeamDraws: 0,
      sameTeamWinRate: 0,
    };
    const pairs = [
      {
        playerAId: "p1",
        playerBId: "p2",
        allTime: {
          encounterMatches: 10,
          sameTeamMatches: 6,
          sameTeamRate: 60,
          sameTeamWins: 4,
          sameTeamLosses: 2,
          sameTeamDraws: 0,
          sameTeamWinRate: 66.67,
        },
        recent6: emptyRecentStats,
      },
      {
        playerAId: "p3",
        playerBId: "p1",
        allTime: {
          encounterMatches: 5,
          sameTeamMatches: 3,
          sameTeamRate: 60,
          sameTeamWins: 1,
          sameTeamLosses: 1,
          sameTeamDraws: 1,
          sameTeamWinRate: 50,
        },
        recent6: emptyRecentStats,
      },
      {
        playerAId: "p2",
        playerBId: "p3",
        allTime: {
          encounterMatches: 4,
          sameTeamMatches: 4,
          sameTeamRate: 100,
          sameTeamWins: 4,
          sameTeamLosses: 0,
          sameTeamDraws: 0,
          sameTeamWinRate: 100,
        },
        recent6: emptyRecentStats,
      },
    ];

    expect(buildTeammateRows("p1", players, pairs)).toEqual([
      {
        player: players[1],
        encounterMatches: 10,
        sameTeamMatches: 6,
        sameTeamRate: 60,
        sameTeamWins: 4,
        sameTeamLosses: 2,
        sameTeamDraws: 0,
        sameTeamWinRate: 66.67,
      },
      {
        player: players[2],
        encounterMatches: 5,
        sameTeamMatches: 3,
        sameTeamRate: 60,
        sameTeamWins: 1,
        sameTeamLosses: 1,
        sameTeamDraws: 1,
        sameTeamWinRate: 50,
      },
    ]);
  });
});
