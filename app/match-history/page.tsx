import { TopBar } from "@/components/TopBar";
import { MatchHistory } from "./MatchHistory";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";

export default function MatchHistoryPage() {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <TopBar title="📜 내전 전적" value="match-history" />
      <main className="max-w-7xl mx-auto mt-5">
        <Suspense fallback={<Loading />}>
          <MatchHistory />
        </Suspense>
      </main>
    </div>
  );
}
