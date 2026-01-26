import { TopBar } from "@/components/TopBar";
import type { Metadata } from "next";
import GlossaryClient from "./components/GlossaryClient";

export const metadata: Metadata = {
  title: "단어장",
  description: "히오스를 처음 하는 사람들을 위한 단어장",
};

export default function GlossaryPage() {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <TopBar title="📚 단어장" value="glossary" />
      <GlossaryClient />
    </div>
  );
}
