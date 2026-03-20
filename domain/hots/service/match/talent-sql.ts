import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import type { TalentTier } from "@/domain/hots/models";
import { prisma } from "@/config/prisma";

type SqlExecutor = Pick<typeof prisma, "$executeRaw">;

type GameTeamMemberTalentInsert = {
  readonly gameTeamMemberId: string;
  readonly tier: TalentTier;
  readonly rawCode: string;
  readonly talentKey: string | null;
};

export async function insertGameTeamMemberTalents(
  db: SqlExecutor,
  talents: ReadonlyArray<GameTeamMemberTalentInsert>,
): Promise<void> {
  if (talents.length === 0) {
    return;
  }

  const rows = talents.map((talent) => ({
    id: randomUUID(),
    ...talent,
  }));

  await prisma.gameTeamMemberTalent.createMany({
    data: rows,
  });
}

export async function deleteGameTeamMemberTalents(
  db: SqlExecutor,
  gameTeamMemberIds: ReadonlyArray<string>,
): Promise<void> {
  if (gameTeamMemberIds.length === 0) {
    return;
  }

  await prisma.gameTeamMemberTalent.deleteMany({
    where: {
      gameTeamMemberId: {
        in: gameTeamMemberIds as string[],
      },
    },
  });
}
