import { TopBar } from "@/components/TopBar";
import ReplayImportForm from "./ReplayImportForm";

export default function MatchInputPage() {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <TopBar title="📝 내전 경기 입력" value="match" />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <ReplayImportForm />
      </main>
    </div>
  );
}
