import StrategyAnalyzer from "./StrategyAnalyzer";
import type { StrategyReportResponse } from "./types";
import { prisma } from "@/config/prisma";
import { MAP_CATALOG } from "@/domain/hots/constants";
import type { GameMap } from "@/domain/hots/models";
import { buildStrategyReport } from "@/domain/hots/service/strategy-report";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  readonly ally?: string | string[];
  readonly enemy?: string | string[];
  readonly maps?: string | string[];
}>;

function readFirst(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseUniqueFromSet<T extends string>(raw: string, allowed: ReadonlySet<T>, limit: number): T[] {
  if (!raw) return [];
  const seen = new Set<T>();
  const result: T[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim() as T;
    if (!trimmed || seen.has(trimmed) || !allowed.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= limit) break;
  }
  return result;
}

export default async function AdminStrategyPage({ searchParams }: { searchParams: SearchParams }) {
  const [players, resolvedParams] = await Promise.all([
    prisma.player.findMany({
      select: {
        id: true,
        name: true,
        nickname: true,
      },
      orderBy: {
        nickname: "asc",
      },
    }),
    searchParams,
  ]);

  const validNicknames = new Set(players.map((player) => player.nickname));
  const validMaps = new Set(Object.keys(MAP_CATALOG) as GameMap[]);

  const initialAllyNicknames = parseUniqueFromSet(readFirst(resolvedParams.ally), validNicknames, 5);
  const allySet = new Set(initialAllyNicknames);
  const initialEnemyNicknames = parseUniqueFromSet(readFirst(resolvedParams.enemy), validNicknames, 5).filter(
    (nickname) => !allySet.has(nickname),
  );
  const initialSelectedMaps = parseUniqueFromSet(readFirst(resolvedParams.maps), validMaps, 5);

  let initialReport: StrategyReportResponse | null = null;
  if (
    initialAllyNicknames.length > 0 &&
    initialEnemyNicknames.length > 0 &&
    initialSelectedMaps.length > 0
  ) {
    try {
      initialReport = await buildStrategyReport(prisma, {
        allyNicknames: initialAllyNicknames,
        enemyNicknames: initialEnemyNicknames,
        selectedMaps: initialSelectedMaps,
      });
    } catch {
      initialReport = null;
    }
  }

  return (
    <StrategyAnalyzer
      players={players}
      initialAllyNicknames={initialAllyNicknames}
      initialEnemyNicknames={initialEnemyNicknames}
      initialSelectedMaps={initialSelectedMaps}
      initialReport={initialReport}
    />
  );
}
