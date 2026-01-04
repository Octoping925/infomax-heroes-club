import { TopBar } from "@/components/TopBar";
import { StatsPageLayout } from "./components/StatsPage";
import { prisma } from "@/config/prisma";

/**
 * 통계 대시보드 페이지
 */
export default async function StatsPage() {
  const players = await prisma.player.findMany({
    select: {
      id: true,
      name: true,
      nickname: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <TopBar title="📊 내전 통계 대시보드" value="stats" />
      <StatsPageLayout players={players} />
    </div>
  );
}
