import { prisma } from "@/config/prisma";
import { Hero } from "@/domain/hots/models/hero";
import { NextRequest, NextResponse } from "next/server";

type BanSlotInput = {
  readonly banOrder: 1 | 2 | 3;
  readonly hero: Hero | null;
};

type UpdateGameTeamBansInput = {
  readonly gameTeamId: string;
  readonly bans: ReadonlyArray<BanSlotInput>;
};

type UpdateMatchBansRequest = {
  readonly updates: ReadonlyArray<UpdateGameTeamBansInput>;
};

export type MatchBansResponse = {
  readonly matchId: string;
  readonly games: ReadonlyArray<{
    readonly id: string;
    readonly gameNumber: number;
    readonly map: string;
    readonly teams: ReadonlyArray<{
      readonly id: string; // gameTeamId
      readonly teamNumber: number;
      readonly bans: ReadonlyArray<{
        readonly banOrder: number;
        readonly hero: Hero;
      }>;
    }>;
  }>;
};

/**
 * 내전의 밴 목록 조회
 * GET /api/matches/:matchId/bans
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ matchId: string }> },
): Promise<NextResponse<MatchBansResponse | { error: string }>> {
  try {
    const { matchId } = await context.params;

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
                bans: {
                  orderBy: { banOrder: "asc" },
                  select: {
                    banOrder: true,
                    hero: true,
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
            bans: team.bans.map((ban) => ({
              banOrder: ban.banOrder,
              hero: ban.hero,
            })),
          })),
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    console.error("내전 밴 조회 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 내전 밴 정보 저장(교체)
 * PUT /api/matches/:matchId/bans
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ matchId: string }> },
): Promise<NextResponse<{ success: true } | { error: string }>> {
  try {
    const { matchId } = await context.params;
    const body: UpdateMatchBansRequest = await request.json();

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

    // 수정 대상 gameTeam들이 해당 match의 game에 속하는지 검증
    const targetGameTeamIds = updates.map((u) => u.gameTeamId);
    const gameTeams = await prisma.gameTeam.findMany({
      where: {
        id: { in: targetGameTeamIds },
      },
      select: {
        id: true,
        game: {
          select: { matchId: true },
        },
      },
    });

    const gameTeamMatchIdMap = new Map(gameTeams.map((gt) => [gt.id, gt.game.matchId] as const));

    const missingGameTeams = targetGameTeamIds.filter((id) => !gameTeamMatchIdMap.has(id));
    if (missingGameTeams.length > 0) {
      return NextResponse.json(
        {
          error: `존재하지 않는 gameTeamId가 포함되어 있습니다: ${missingGameTeams.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const invalidScopeGameTeams = targetGameTeamIds.filter((id) => gameTeamMatchIdMap.get(id) !== matchId);
    if (invalidScopeGameTeams.length > 0) {
      return NextResponse.json({ error: "요청한 내전에 속하지 않는 gameTeamId가 포함되어 있습니다." }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const orders = update.bans.map((b) => b.banOrder);

        await tx.gameTeamBan.deleteMany({
          where: {
            gameTeamId: update.gameTeamId,
            banOrder: { in: orders },
          },
        });

        const createData = update.bans
          .filter((b) => b.hero !== null)
          .map((b) => ({
            gameTeamId: update.gameTeamId,
            banOrder: b.banOrder,
            hero: b.hero as Hero,
          }));

        if (createData.length > 0) {
          await tx.gameTeamBan.createMany({ data: createData });
        }
      }
    });

    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("내전 밴 저장 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function validateUpdate(update: UpdateGameTeamBansInput): string | null {
  if (!update.gameTeamId || update.gameTeamId.trim().length === 0) {
    return "gameTeamId가 비어있습니다.";
  }

  if (!Array.isArray(update.bans) || update.bans.length !== 3) {
    return "bans는 3개의 슬롯(1~3번)으로 전달되어야 합니다.";
  }

  const orders = update.bans.map((b) => b.banOrder);
  const orderSet = new Set(orders);
  if (orderSet.size !== 3 || !orders.every((o) => o === 1 || o === 2 || o === 3)) {
    return "banOrder는 1,2,3을 각각 한 번씩 포함해야 합니다.";
  }

  const heroes = update.bans.map((b) => b.hero).filter((h): h is Hero => h !== null);
  const heroSet = new Set(heroes);
  if (heroSet.size !== heroes.length) {
    return "같은 팀에서 동일 영웅을 중복 밴할 수 없습니다.";
  }

  return null;
}
