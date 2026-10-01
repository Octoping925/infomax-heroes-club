import { fetchPlayerMap } from "@/app/api/stats/utils/player";
import { TopBar } from "@/components/TopBar";
import ManualJsonForm from "./ManualJsonForm";
import ReplayImportForm from "./ReplayImportForm";

export const dynamic = "force-dynamic";

export default async function MatchInputPage() {
  const players = Array.from((await fetchPlayerMap()).values()).toSorted((a, b) =>
    a.nickname.localeCompare(b.nickname, "ko"),
  );

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <TopBar title="📝 내전 경기 입력" value="match" />
      <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
        <ReplayImportForm players={players} />
        <ManualJsonForm players={players} />
      </main>
    </div>
  );
}
