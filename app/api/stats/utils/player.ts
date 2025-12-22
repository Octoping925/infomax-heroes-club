import { prisma } from "@/config/prisma";

export type PlayerMap = Map<
  string,
  {
    id: string;
    name: string;
    nickname: string;
  }
>;

export async function fetchPlayerMap(): Promise<PlayerMap> {
  const players = await prisma.player.findMany({
    select: {
      id: true,
      name: true,
      nickname: true,
    },
  });

  return new Map(players.map((p) => [p.id, p]));
}
