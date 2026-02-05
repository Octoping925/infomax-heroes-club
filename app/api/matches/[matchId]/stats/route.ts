import { prisma } from "@/config/prisma";
import { Hero } from "@/domain/hots/models";
import { HeroPositionMap } from "@/domain/hots/constants";
import { fetchPlayerMap } from "@/app/api/stats/utils/player";
import { NextRequest, NextResponse } from "next/server";

type UpdateGameTeamMemberStatsInput = {
  readonly gameTeamMemberId: string;
  readonly hero: Hero;
  readonly heroDamage: number;
  readonly siegeDamage: number;
  readonly damageTaken: number;
  readonly healingDone: number;
};

type UpdateMatchStatsRequest = {
  readonly updates: ReadonlyArray<UpdateGameTeamMemberStatsInput>;
};

export type MatchStatsResponse = {
  readonly matchId: string;
  readonly games: ReadonlyArray<{
    readonly id: string;
    readonly gameNumber: number;
    readonly map: string;
    readonly teams: ReadonlyArray<{
      readonly id: string; // gameTeamId
      readonly teamNumber: number;
      readonly result: string;
      readonly members: ReadonlyArray<{
        readonly id: string; // gameTeamMemberId
        readonly player: {
          readonly id: string;
          readonly name: string;
          readonly nickname: string;
        };
        readonly hero: Hero;
        readonly heroDamage: number;
        readonly siegeDamage: number;
        readonly damageTaken: number;
        readonly healingDone: number;
      }>;
    }>;
  }>;
};

/**
 * 내전 전적(피해/힐) 조회
 * GET /api/matches/:matchId/stats
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ matchId: string }> },
): Promise<NextResponse<MatchStatsResponse | { error: string }>> {
  try {
    const { matchId } = await context.params;
    const playerMap = await fetchPlayerMap();

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        games: {
          orderBy: { gameNumber: "asc" },
          select: {
            id: true,
            gameNumber: true,
            map: true,
            teams: {
              orderBy: { teamNumber: "asc" },
              select: {
                id: true,
                teamNumber: true,
                result: true,
                members: {
                  select: {
                    id: true,
                    hero: true,
                    heroDamage: true,
                    siegeDamage: true,
                    damageTaken: true,
                    healingDone: true,
                    playerId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: "존재하지 않는 내전입니다." }, { status: 404 });
    }

    return NextResponse.json(
      {
        matchId: match.id,
        games: match.games.map((game) => ({
          id: game.id,
          gameNumber: game.gameNumber,
          map: game.map,
          teams: game.teams.map((team) => ({
            id: team.id,
            teamNumber: team.teamNumber,
            result: team.result,
            members: team.members.map((member) => ({
              id: member.id,
              player: playerMap.get(member.playerId)!,
              hero: member.hero,
              heroDamage: member.heroDamage,
              siegeDamage: member.siegeDamage,
              damageTaken: member.damageTaken,
              healingDone: member.healingDone,
            })),
          })),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("내전 전적 조회 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 내전 전적(피해/힐) 저장
 * PUT /api/matches/:matchId/stats
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ matchId: string }> },
): Promise<NextResponse<{ success: true } | { error: string }>> {
  try {
    const { matchId } = await context.params;
    const body: UpdateMatchStatsRequest = await request.json();

    const updates = body.updates ?? [];
    if (updates.length === 0) {
      return NextResponse.json({ error: "업데이트할 데이터가 없습니다." }, { status: 400 });
    }

    for (const update of updates) {
      const validationError = validateUpdate(update);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    const targetMemberIds = updates.map((update) => update.gameTeamMemberId);
    const members = await prisma.gameTeamMember.findMany({
      where: {
        id: { in: targetMemberIds },
      },
      select: {
        id: true,
        gameTeam: {
          select: {
            game: {
              select: {
                matchId: true,
              },
            },
          },
        },
      },
    });

    const memberMatchIdMap = new Map(members.map((member) => [member.id, member.gameTeam.game.matchId] as const));

    const missingMembers = targetMemberIds.filter((id) => !memberMatchIdMap.has(id));
    if (missingMembers.length > 0) {
      return NextResponse.json(
        {
          error: `존재하지 않는 gameTeamMemberId가 포함되어 있습니다: ${missingMembers.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const invalidScopeMembers = targetMemberIds.filter((id) => memberMatchIdMap.get(id) !== matchId);
    if (invalidScopeMembers.length > 0) {
      return NextResponse.json({ error: "요청한 내전에 속하지 않는 멤버가 포함되어 있습니다." }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        await tx.gameTeamMember.update({
          where: { id: update.gameTeamMemberId },
          data: {
            hero: update.hero,
            heroDamage: update.heroDamage,
            siegeDamage: update.siegeDamage,
            damageTaken: update.damageTaken,
            healingDone: update.healingDone,
          },
        });
      }
    });

    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("내전 전적 저장 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function validateUpdate(update: UpdateGameTeamMemberStatsInput): string | null {
  if (!update.gameTeamMemberId || update.gameTeamMemberId.trim().length === 0) {
    return "gameTeamMemberId가 비어있습니다.";
  }

  const fields: Array<[string, number]> = [
    ["heroDamage", update.heroDamage],
    ["siegeDamage", update.siegeDamage],
    ["damageTaken", update.damageTaken],
    ["healingDone", update.healingDone],
  ];

  for (const [label, value] of fields) {
    if (!Number.isFinite(value) || value < 0) {
      return `${label} 값이 올바르지 않습니다.`;
    }
  }

  if (!isValidHeroKey(update.hero)) {
    return "영웅 정보가 올바르지 않습니다.";
  }

  return null;
}

function isValidHeroKey(input: string): input is Hero {
  return Object.hasOwn(HeroPositionMap, input);
}
