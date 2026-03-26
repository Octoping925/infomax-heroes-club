import { TopBar } from "@/components/TopBar";
import { StatsPageLayout } from "./components/StatsPage";
import { prisma } from "@/config/prisma";
import { getKoreanYear } from "@/app/api/stats/utils/query";

/**
 * 통계 대시보드 페이지
 */
export default async function StatsPage() {
  const [players, matches] = await Promise.all([
    prisma.player.findMany({
      select: {
        id: true,
        name: true,
        nickname: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.match.findMany({
      select: {
        playedAt: true,
      },
      orderBy: {
        playedAt: "desc",
      },
    }),
  ]);

  const availableYears = Array.from(new Set(matches.map((match) => getKoreanYear(match.playedAt))));

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <TopBar title="📊 내전 통계 대시보드" value="stats" />
      <StatsPageLayout players={players} availableYears={availableYears} />
    </div>
  );
}
