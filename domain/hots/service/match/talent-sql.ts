import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import type { TalentTier } from "@/domain/hots/models";

type GameTeamMemberTalentInsert = {
  readonly gameTeamMemberId: string;
  readonly tier: TalentTier;
  readonly rawCode: string;
  readonly talentKey: string | null;
};

export async function insertGameTeamMemberTalents(
  tx: Prisma.TransactionClient,
  talents: ReadonlyArray<GameTeamMemberTalentInsert>,
): Promise<void> {
  if (talents.length === 0) {
    return;
  }

  await tx.gameTeamMemberTalent.createMany({
    data: talents.map((talent) => ({
      id: randomUUID(),
      ...talent,
    })),
  });
}

export async function deleteGameTeamMemberTalents(
  db: Prisma.TransactionClient,
  gameTeamMemberIds: ReadonlyArray<string>,
): Promise<void> {
  if (gameTeamMemberIds.length === 0) {
    return;
  }

  await db.gameTeamMemberTalent.deleteMany({
    where: {
      gameTeamMemberId: {
        in: gameTeamMemberIds as string[],
      },
    },
  });
}
