import { prisma } from "@/config/prisma";
import { CreateMatchRequest, CreateMatchResponse } from "@/domain/hots/types/match-contract";
import { parseGameStats } from "@/domain/hots/utils/game-stats-parser";
import dayjs from "dayjs";
import { calculateGameResult } from "./common";
import { MatchServiceError } from "./errors";

export async function createMatch(body: CreateMatchRequest): Promise<CreateMatchResponse> {
  const playedAt = dayjs(body.playedAt, "YYYYMMDD");
  if (!playedAt.isValid()) {
    throw new MatchServiceError("잘못된 날짜 형식입니다. YYYYMMDD 형식으로 입력해주세요.");
  }

  if (!Array.isArray(body.games) || body.games.length === 0) {
    throw new MatchServiceError("최소 1개 이상의 게임이 필요합니다.");
  }

  const parsedGames = body.games.map((game) => {
    try {
      return parseGameStats(game.statsText);
    } catch (err) {
      const message = err instanceof Error ? err.message : "파싱 오류";
      throw new MatchServiceError(`게임 스탯 파싱 실패: ${message}`);
    }
  });

  const allNicknames = parsedGames
    .flatMap((it) => it.teams)
    .flatMap((it) => it.players)
    .map((it) => it.nickname)
    .reduce((acc, it) => {
      acc.add(it);
      return acc;
    }, new Set<string>());

  const players = await prisma.player.findMany({
    where: { nickname: { in: Array.from(allNicknames) } },
  });

  const playerIdByNickname = new Map(players.map((player) => [player.nickname, player.id]));
  const missingPlayers = Array.from(allNicknames).filter((nickname) => !playerIdByNickname.has(nickname));
  if (missingPlayers.length > 0) {
    throw new MatchServiceError(`등록되지 않은 플레이어: ${missingPlayers.join(", ")}`);
  }

  const firstGame = parsedGames[0];
  const team1Players = firstGame.teams[0].players.map((player) => playerIdByNickname.get(player.nickname)!);
  const team2Players = firstGame.teams[1].players.map((player) => playerIdByNickname.get(player.nickname)!);

  const team1LeaderId = playerIdByNickname.get(body.team1Leader);
  const team2LeaderId = playerIdByNickname.get(body.team2Leader);
  if (!team1LeaderId || !team2LeaderId) {
    throw new MatchServiceError("등록되지 않은 리더");
  }

  const team1Wins = body.games.filter((game) => game.winnerTeamNumber === 1).length;
  const team2Wins = body.games.filter((game) => game.winnerTeamNumber === 2).length;
  const matchWinnerTeamNumber = team1Wins > team2Wins ? 1 : team2Wins > team1Wins ? 2 : null;

  const match = await prisma.$transaction(
    async (tx) => {
      const newMatch = await tx.match.create({
        data: {
          type: body.type,
          playedAt: playedAt.toDate(),
          winnerTeamNumber: matchWinnerTeamNumber,
        },
      });

      const [matchTeam1, matchTeam2] = await tx.matchTeam.createManyAndReturn({
        data: [
          {
            matchId: newMatch.id,
            teamNumber: 1,
            leaderId: team1LeaderId,
          },
          {
            matchId: newMatch.id,
            teamNumber: 2,
            leaderId: team2LeaderId,
          },
        ],
      });

      await tx.matchTeamMember.createMany({
        data: [
          ...team1Players.map((playerId) => ({
            matchTeamId: matchTeam1.id,
            playerId,
          })),
          ...team2Players.map((playerId) => ({
            matchTeamId: matchTeam2.id,
            playerId,
          })),
        ],
      });

      for (let gameIndex = 0; gameIndex < parsedGames.length; gameIndex++) {
        const parsedGame = parsedGames[gameIndex];
        const gameInput = body.games[gameIndex];

        const game = await tx.game.create({
          data: {
            matchId: newMatch.id,
            gameNumber: gameIndex + 1,
            map: parsedGame.map,
            winnerTeamNumber: gameInput.winnerTeamNumber,
          },
        });

        for (const parsedTeam of parsedGame.teams) {
          const sourceMatchTeamId = parsedTeam.teamNumber === 1 ? matchTeam1.id : matchTeam2.id;
          const gameResult = calculateGameResult(parsedTeam.teamNumber, gameInput.winnerTeamNumber);

          const gameTeam = await tx.gameTeam.create({
            data: {
              gameId: game.id,
              teamNumber: parsedTeam.teamNumber,
              sourceMatchTeamId,
              result: gameResult,
            },
          });

          await tx.gameTeamMember.createMany({
            data: parsedTeam.players.map((player) => ({
              gameTeamId: gameTeam.id,
              playerId: playerIdByNickname.get(player.nickname)!,
              hero: player.hero,
              kills: player.kills,
              deaths: player.deaths,
              takedowns: player.takedowns,
              heroDamage: player.heroDamage,
              damageTaken: player.damageTaken,
            })),
          });
        }
      }

      return newMatch;
    },
    {
      timeout: 10000,
      maxWait: 10000,
    },
  );

  return {
    matchId: match.id,
    gamesCreated: parsedGames.length,
  };
}
