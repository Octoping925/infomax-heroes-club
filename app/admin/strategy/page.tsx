import StrategyAnalyzer from "./StrategyAnalyzer";
import { prisma } from "@/config/prisma";

export const dynamic = "force-dynamic";

export default async function AdminStrategyPage() {
  const players = await prisma.player.findMany({
    select: {
      id: true,
      name: true,
      nickname: true,
    },
    orderBy: {
      nickname: "asc",
    },
  });

  return <StrategyAnalyzer players={players} />;
}
