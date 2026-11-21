import { cookies } from "next/headers";
import { TopBar } from "@/components/TopBar";
import { prisma } from "@/config/prisma";
import { ADMIN_SESSION_COOKIE_NAME, verifyAdminSessionToken } from "@/config/admin-auth";
import {
  buildMatchupPreview,
  type MatchupPreviewResponse,
} from "@/domain/hots/service/matchup-preview";
import type { MatchType } from "@/generated/prisma/client";
import { MatchupPreviewClient } from "./MatchupPreviewClient";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  readonly a?: string | string[];
  readonly b?: string | string[];
  readonly type?: string | string[];
  readonly leaderA?: string | string[];
  readonly leaderB?: string | string[];
}>;

function readFirst(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseNicknames(raw: string, validNicknames: ReadonlySet<string>): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed || seen.has(trimmed) || !validNicknames.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= 5) break;
  }
  return result;
}

export default async function MatchupPage({ searchParams }: { searchParams: SearchParams }) {
  const [players, cookieStore, resolvedParams] = await Promise.all([
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
    cookies(),
    searchParams,
  ]);

  const isAdmin = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value);
  const validNicknames = new Set(players.map((player) => player.nickname));

  const initialTeamA = parseNicknames(readFirst(resolvedParams.a), validNicknames);
  const teamASet = new Set(initialTeamA);
  const initialTeamB = parseNicknames(readFirst(resolvedParams.b), validNicknames).filter(
    (nickname) => !teamASet.has(nickname),
  );
  const rawType = readFirst(resolvedParams.type).toUpperCase();
  const initialMatchType: MatchType = rawType === "DINNER" ? "DINNER" : "LUNCH";
  const rawLeaderA = readFirst(resolvedParams.leaderA).trim();
  const rawLeaderB = readFirst(resolvedParams.leaderB).trim();
  const initialLeaderA = initialTeamA.includes(rawLeaderA) ? rawLeaderA : null;
  const initialLeaderB = initialTeamB.includes(rawLeaderB) ? rawLeaderB : null;

  let initialPreview: MatchupPreviewResponse | null = null;
  if (initialTeamA.length > 0 && initialTeamB.length > 0) {
    try {
      initialPreview = await buildMatchupPreview(prisma, {
        teamANicknames: initialTeamA,
        teamBNicknames: initialTeamB,
        matchType: initialMatchType,
        leaderANickname: initialLeaderA,
        leaderBNickname: initialLeaderB,
      });
    } catch {
      initialPreview = null;
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <TopBar title="⚔️ 내전 매치업 프리뷰" value="matchup" />
      <MatchupPreviewClient
        players={players}
        isAdmin={isAdmin}
        initialTeamA={initialTeamA}
        initialTeamB={initialTeamB}
        initialMatchType={initialMatchType}
        initialLeaderA={initialLeaderA}
        initialLeaderB={initialLeaderB}
        initialPreview={initialPreview}
      />
    </div>
  );
}
