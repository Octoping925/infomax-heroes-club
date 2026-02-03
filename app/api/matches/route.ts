import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { GameResult, MatchType } from "@/generated/prisma/client";
import {
  parseGameStats,
  ParsedGameStats,
} from "@/domain/hots/utils/game-stats-parser";
import dayjs from "dayjs";
import { fetchPlayerMap } from "../stats/utils/player";
import { HeroRole } from "@/domain/hots/models";

type MatchHistoryPlayer = {
  readonly id: string;
  readonly name: string;
  readonly nickname: string;
};

type MatchHistoryMatchTeam = {
  readonly id: string;
  readonly teamNumber: number;
  readonly leader: MatchHistoryPlayer;
  readonly members: ReadonlyArray<MatchHistoryPlayer>;
};

type MatchHistoryGameTeamMember = {
  id: string;
  player: MatchHistoryPlayer;
  position: HeroRole;
  hero: string;
  kills: number;
  deaths: number;
  takedowns: number;
  heroDamage: number;
  siegeDamage: number;
  healingDone: number;
  damageTaken: number;
};

type MatchHistoryGameTeamBan = {
  readonly banOrder: number;
  readonly hero: string;
};

type MatchHistoryGameTeam = {
  readonly id: string;
  readonly teamNumber: number;
  readonly result: GameResult;
  readonly teamLevel: number;
  readonly members: MatchHistoryGameTeamMember[];
  readonly bans: MatchHistoryGameTeamBan[];
};

type MatchHistoryGame = {
  readonly id: string;
  readonly gameNumber: number;
  readonly gameLength: number;
  readonly map: string;
  readonly winnerTeamNumber: number | null;
  readonly teams: MatchHistoryGameTeam[];
};

export type MatchHistoryItem = {
  readonly id: string;
  readonly playedAt: string; // ISO String
  readonly type: MatchType;
  readonly winnerTeamNumber: number | null;
  readonly teams: MatchHistoryMatchTeam[];
  readonly games: MatchHistoryGame[];
};

/**
 * 역대 내전(match) 전적 조회
 * GET /api/matches?take=50
 *
 * - 날짜별 grouping은 프론트에서 처리합니다.
 * - 열기 시 match의 games, 각 game의 team members + hero + kills/deaths 등을 제공합니다.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<MatchHistoryItem[] | { error: string }>> {
  try {
    const take = parseTakeParam(request.nextUrl.searchParams.get("take"));

    const playerMap = await fetchPlayerMap();

    const matches = await prisma.match.findMany({
      orderBy: {
        playedAt: "desc",
      },
      take,
      select: {
        id: true,
        playedAt: true,
        type: true,
        winnerTeamNumber: true,
        teams: {
          orderBy: {
            teamNumber: "asc",
          },
          select: {
            id: true,
            teamNumber: true,
            leaderId: true,
            members: {
              select: {
                playerId: true,
              },
            },
          },
        },
        games: {
          orderBy: {
            gameNumber: "asc",
          },
          select: {
            id: true,
            gameNumber: true,
            gameLength: true,
            map: true,
            winnerTeamNumber: true,
            teams: {
              orderBy: {
                teamNumber: "asc",
              },
              select: {
                id: true,
                teamNumber: true,
                result: true,
                teamLevel: true,
                bans: {
                  orderBy: {
                    banOrder: "asc",
                  },
                  select: {
                    banOrder: true,
                    hero: true,
                  },
                },
                members: {
                  select: {
                    id: true,
                    hero: true,
                    position: true,
                    kills: true,
                    deaths: true,
                    takedowns: true,
                    heroDamage: true,
                    siegeDamage: true,
                    healingDone: true,
                    damageTaken: true,
                    playerId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const response: MatchHistoryItem[] = matches.map((match) => ({
      id: match.id,
      playedAt: match.playedAt.toISOString(),
      type: match.type,
      winnerTeamNumber: match.winnerTeamNumber,
      teams: match.teams.map((team) => ({
        id: team.id,
        teamNumber: team.teamNumber,
        leader: playerMap.get(team.leaderId)!,
        members: team.members.map((member) => playerMap.get(member.playerId)!),
      })),
      games: match.games.map((game) => ({
        id: game.id,
        gameNumber: game.gameNumber,
        gameLength: game.gameLength,
        map: game.map,
        winnerTeamNumber: game.winnerTeamNumber,
        teams: game.teams.map((team) => ({
          id: team.id,
          teamNumber: team.teamNumber,
          result: team.result,
          teamLevel: team.teamLevel,
          bans: team.bans.map((ban) => ({
            banOrder: ban.banOrder,
            hero: ban.hero,
          })),
          members: team.members.map((member) => ({
            id: member.id,
            player: playerMap.get(member.playerId)!,
            position: member.position,
            hero: member.hero,
            kills: member.kills,
            deaths: member.deaths,
            takedowns: member.takedowns,
            heroDamage: member.heroDamage,
            siegeDamage: member.siegeDamage,
            healingDone: member.healingDone,
            damageTaken: member.damageTaken,
          })),
        })),
      })),
    }));

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    console.error("역대 내전 조회 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

function parseTakeParam(input: string | null): number {
  if (!input) return DEFAULT_TAKE;
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return DEFAULT_TAKE;
  if (parsed <= 0) return DEFAULT_TAKE;
  return Math.min(Math.floor(parsed), MAX_TAKE);
}

/** 게임 입력 데이터 */
type GameInput = {
  readonly statsText: string;
  readonly winnerTeamNumber: number | null; // null이면 무승부
};

/** 내전 생성 요청 바디 */
type CreateMatchRequest = {
  readonly playedAt: string; // yyyyMMdd 형식
  readonly type: MatchType;
  readonly team1Leader: string;
  readonly team2Leader: string;
  readonly games: ReadonlyArray<GameInput>;
};

/** 내전 생성 응답 */
type CreateMatchResponse = {
  readonly matchId: string;
  readonly gamesCreated: number;
};

/**
 * 내전 생성 API
 * POST /api/matches
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateMatchResponse | { error: string }>> {
  try {
    const body: CreateMatchRequest = await request.json();

    // 날짜 파싱 (yyyyMMdd → Date)
    const playedAt = dayjs(body.playedAt, "YYYYMMDD");
    if (!playedAt.isValid()) {
      return NextResponse.json(
        { error: "잘못된 날짜 형식입니다. YYYYMMDD 형식으로 입력해주세요." },
        { status: 400 }
      );
    }

    // 게임 스탯 파싱
    const parsedGames: ParsedGameStats[] = [];
    for (const game of body.games) {
      try {
        const parsed = parseGameStats(game.statsText);
        parsedGames.push(parsed);
      } catch (err) {
        const message = err instanceof Error ? err.message : "파싱 오류";
        return NextResponse.json(
          { error: `게임 스탯 파싱 실패: ${message}` },
          { status: 400 }
        );
      }
    }

    // 모든 플레이어 닉네임 수집
    const allNicknames = parsedGames
      .flatMap((it) => it.teams)
      .flatMap((it) => it.players)
      .map((it) => it.nickname)
      .reduce((acc, it) => {
        acc.add(it);
        return acc;
      }, new Set<string>());

    // 플레이어 조회
    const players = await prisma.player.findMany({
      where: { nickname: { in: Array.from(allNicknames) } },
    });

    const playerMap = new Map(players.map((p) => [p.nickname, p.id]));

    // 누락된 플레이어 확인
    const missingPlayers = Array.from(allNicknames).filter(
      (nick) => !playerMap.has(nick)
    );
    if (missingPlayers.length > 0) {
      return NextResponse.json(
        { error: `등록되지 않은 플레이어: ${missingPlayers.join(", ")}` },
        { status: 400 }
      );
    }

    // 첫 번째 게임에서 팀 구성 추출 (MatchTeam 초기 편성용)
    const firstGame = parsedGames[0];
    const team1Players = firstGame.teams[0].players.map(
      (p) => playerMap.get(p.nickname)!
    );
    const team2Players = firstGame.teams[1].players.map(
      (p) => playerMap.get(p.nickname)!
    );

    const team1LeaderId = playerMap.get(body.team1Leader);
    const team2LeaderId = playerMap.get(body.team2Leader);

    if (!team1LeaderId || !team2LeaderId) {
      return NextResponse.json(
        { error: `등록되지 않은 리더` },
        { status: 400 }
      );
    }

    // 전체 승패 계산
    const team1Wins = body.games.filter((g) => g.winnerTeamNumber === 1).length;
    const team2Wins = body.games.filter((g) => g.winnerTeamNumber === 2).length;
    const matchWinnerTeamNumber =
      team1Wins > team2Wins ? 1 : team2Wins > team1Wins ? 2 : null;

    // 트랜잭션으로 모든 데이터 저장
    const match = await prisma.$transaction(
      async (tx) => {
        // 1. Match 생성
        const newMatch = await tx.match.create({
          data: {
            type: body.type,
            playedAt: playedAt.toDate(),
            winnerTeamNumber: matchWinnerTeamNumber,
          },
        });

        // 2. MatchTeam 생성 (팀장은 첫 번째 플레이어)
        const [matchTeam1, matchTeam2] = await tx.matchTeam.createManyAndReturn(
          {
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
          }
        );

        // 3. MatchTeamMember 생성
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

        // 4. 각 Game 생성
        for (let i = 0; i < parsedGames.length; i++) {
          const parsedGame = parsedGames[i];
          const gameInput = body.games[i];

          const game = await tx.game.create({
            data: {
              matchId: newMatch.id,
              gameNumber: i + 1,
              map: parsedGame.map,
              winnerTeamNumber: gameInput.winnerTeamNumber,
            },
          });

          // 5. GameTeam 생성
          for (const parsedTeam of parsedGame.teams) {
            const sourceMatchTeamId =
              parsedTeam.teamNumber === 1 ? matchTeam1.id : matchTeam2.id;

            const gameResult = calculateGameResult(
              parsedTeam.teamNumber,
              gameInput.winnerTeamNumber
            );

            const gameTeam = await tx.gameTeam.create({
              data: {
                gameId: game.id,
                teamNumber: parsedTeam.teamNumber,
                sourceMatchTeamId,
                result: gameResult,
              },
            });

            // 6. GameTeamMember 생성
            await tx.gameTeamMember.createMany({
              data: parsedTeam.players.map((player) => ({
                gameTeamId: gameTeam.id,
                playerId: playerMap.get(player.nickname)!,
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
      }
    );

    return NextResponse.json({
      matchId: match.id,
      gamesCreated: parsedGames.length,
    });
  } catch (err) {
    console.error("내전 생성 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function calculateGameResult(
  teamNumber: number,
  winnerTeamNumber: number | null
): GameResult {
  if (winnerTeamNumber === null) {
    return GameResult.DRAW;
  }
  return teamNumber === winnerTeamNumber ? GameResult.WIN : GameResult.LOSE;
}
