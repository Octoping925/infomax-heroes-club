import { prisma } from "@/config/prisma";
import { Hero, HeroRole, HeroRoles } from "@/domain/hots/models";
import { HeroPositionMap } from "@/domain/hots/constants";
import { fetchPlayerMap } from "@/app/api/stats/utils/player";
import { NextRequest, NextResponse } from "next/server";

type UpdateGameTeamMemberStatsInput = {
  readonly gameTeamMemberId: string;
  readonly playerId: string;
  readonly hero: Hero;
  readonly position: HeroRole;
  readonly heroDamage: number;
  readonly siegeDamage: number;
  readonly damageTaken: number;
  readonly healingDone: number;
};

type UpdateMatchStatsRequest = {
  readonly updates: ReadonlyArray<UpdateGameTeamMemberStatsInput>;
};

type TeamMemberAssignmentState = {
  readonly id: string;
  readonly gameTeamId: string;
  readonly playerId: string;
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
        readonly position: HeroRole;
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
                    position: true,
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
              position: member.position,
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
        gameTeamId: true,
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

    const inputPlayerIds = [...new Set(updates.map((update) => update.playerId))];
    const existingPlayers = await prisma.player.findMany({
      where: {
        id: { in: inputPlayerIds },
      },
      select: {
        id: true,
      },
    });
    const existingPlayerIdSet = new Set(existingPlayers.map((player) => player.id));
    const missingPlayerIds = inputPlayerIds.filter((id) => !existingPlayerIdSet.has(id));
    if (missingPlayerIds.length > 0) {
      return NextResponse.json(
        { error: `존재하지 않는 playerId가 포함되어 있습니다: ${missingPlayerIds.join(", ")}` },
        { status: 400 },
      );
    }
    const allPlayers = await prisma.player.findMany({
      select: {
        id: true,
      },
    });
    const allPlayerIds = allPlayers.map((player) => player.id);

    const affectedGameTeamIds = [...new Set(members.map((member) => member.gameTeamId))];
    const affectedGameTeamMembers = await prisma.gameTeamMember.findMany({
      where: {
        gameTeamId: { in: affectedGameTeamIds },
      },
      select: {
        id: true,
        gameTeamId: true,
        playerId: true,
      },
    });
    const updateByMemberId = new Map(updates.map((update) => [update.gameTeamMemberId, update] as const));

    for (const gameTeamId of affectedGameTeamIds) {
      const teamMemberIds = affectedGameTeamMembers
        .filter((member) => member.gameTeamId === gameTeamId)
        .map((member) => member.id);
      const nextPlayerIds = teamMemberIds
        .map(
          (id) =>
            updateByMemberId.get(id)?.playerId ?? affectedGameTeamMembers.find((member) => member.id === id)?.playerId,
        )
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      const uniquePlayerIds = new Set(nextPlayerIds);
      if (uniquePlayerIds.size !== nextPlayerIds.length) {
        return NextResponse.json(
          {
            error: "같은 팀에 동일한 플레이어를 중복으로 선택할 수 없습니다.",
          },
          { status: 400 },
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      const byGameTeamId = new Map<string, TeamMemberAssignmentState[]>();
      for (const member of affectedGameTeamMembers) {
        const list = byGameTeamId.get(member.gameTeamId) ?? [];
        list.push(member);
        byGameTeamId.set(member.gameTeamId, list);
      }

      for (const [gameTeamId, teamMembers] of byGameTeamId) {
        await applyPlayerAssignments({
          tx,
          gameTeamId,
          teamMembers,
          updateByMemberId,
          allPlayerIds,
        });
      }

      for (const update of updates) {
        await tx.gameTeamMember.update({
          where: { id: update.gameTeamMemberId },
          data: {
            hero: update.hero,
            position: update.position,
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

  if (!update.playerId || update.playerId.trim().length === 0) {
    return "playerId가 비어있습니다.";
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

  if (!isValidHeroRoleKey(update.position)) {
    return "포지션 정보가 올바르지 않습니다.";
  }

  return null;
}

function isValidHeroKey(input: string): input is Hero {
  return Object.hasOwn(HeroPositionMap, input);
}

function isValidHeroRoleKey(input: string): input is HeroRole {
  return Object.hasOwn(HeroRoles, input);
}

async function applyPlayerAssignments({
  tx,
  gameTeamId,
  teamMembers,
  updateByMemberId,
  allPlayerIds,
}: {
  tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
  gameTeamId: string;
  teamMembers: ReadonlyArray<TeamMemberAssignmentState>;
  updateByMemberId: Map<string, UpdateGameTeamMemberStatsInput>;
  allPlayerIds: ReadonlyArray<string>;
}): Promise<void> {
  const currentPlayerByMemberId = new Map(teamMembers.map((member) => [member.id, member.playerId] as const));
  const targetPlayerByMemberId = new Map(
    teamMembers.map((member) => [member.id, updateByMemberId.get(member.id)?.playerId ?? member.playerId] as const),
  );

  const pendingMemberIds = new Set(
    teamMembers
      .filter((member) => targetPlayerByMemberId.get(member.id) !== member.playerId)
      .map((member) => member.id),
  );

  if (pendingMemberIds.size === 0) {
    return;
  }

  const occupiedMemberByPlayerId = new Map(teamMembers.map((member) => [member.playerId, member.id] as const));
  const currentPlayerIds = new Set(teamMembers.map((member) => member.playerId));
  const targetPlayerIds = new Set(teamMembers.map((member) => targetPlayerByMemberId.get(member.id)!));
  const sparePlayerId = allPlayerIds.find((id) => !currentPlayerIds.has(id) && !targetPlayerIds.has(id));

  while (pendingMemberIds.size > 0) {
    let progressed = false;

    for (const memberId of pendingMemberIds) {
      const currentPlayerId = currentPlayerByMemberId.get(memberId)!;
      const targetPlayerId = targetPlayerByMemberId.get(memberId)!;
      const holderMemberId = occupiedMemberByPlayerId.get(targetPlayerId);

      // 타겟 플레이어가 비어 있거나, 아직 미완료 멤버가 점유 중이 아니면 바로 이동 가능.
      if (!holderMemberId || !pendingMemberIds.has(holderMemberId)) {
        await tx.gameTeamMember.update({
          where: { id: memberId },
          data: { playerId: targetPlayerId },
        });
        currentPlayerByMemberId.set(memberId, targetPlayerId);
        occupiedMemberByPlayerId.delete(currentPlayerId);
        occupiedMemberByPlayerId.set(targetPlayerId, memberId);
        pendingMemberIds.delete(memberId);
        progressed = true;
      }
    }

    if (progressed) {
      continue;
    }

    if (!sparePlayerId) {
      throw new Error(`${gameTeamId} 팀의 플레이어 스왑을 처리할 임시 플레이어가 없어 저장할 수 없습니다.`);
    }

    // 순환 스왑(cycle)을 임시 플레이어 한 명으로 끊어서 unique 충돌을 피한다.
    const cycleMemberId = pendingMemberIds.values().next().value as string;
    const cycleCurrentPlayerId = currentPlayerByMemberId.get(cycleMemberId)!;
    await tx.gameTeamMember.update({
      where: { id: cycleMemberId },
      data: { playerId: sparePlayerId },
    });
    currentPlayerByMemberId.set(cycleMemberId, sparePlayerId);
    occupiedMemberByPlayerId.delete(cycleCurrentPlayerId);
    occupiedMemberByPlayerId.set(sparePlayerId, cycleMemberId);
  }
}
