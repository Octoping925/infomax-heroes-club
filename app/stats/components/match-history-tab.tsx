"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import type { MatchHistoryItem } from "@/app/api/matches/route";
import { statsQueryKeys } from "@/config/query-keys";
import { MatchCard } from "./match-history/MatchCard";

type MatchGroup = {
  readonly dateKey: string; // YYYY-MM-DD
  readonly matches: ReadonlyArray<MatchHistoryItem>;
};

/**
 * Stats 탭에서 보여주는 역대 match 전적
 */
export function MatchHistoryTab() {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const {
    data: matches = [],
    isPending,
    error,
  } = useQuery<MatchHistoryItem[]>({
    queryKey: statsQueryKeys.matches.latest(200),
    queryFn: async () => {
      const response = await fetch("/api/matches?take=200");
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as MatchHistoryItem[];
    },
  });

  const groups = useMemo<MatchGroup[]>(() => {
    const map = new Map<string, MatchHistoryItem[]>();
    for (const match of matches) {
      const dateKey = dayjs(match.playedAt).format("YYYY-MM-DD");
      const list = map.get(dateKey) ?? [];
      list.push(match);
      map.set(dateKey, list);
    }
    return Array.from(map.entries()).map(([dateKey, list]) => ({
      dateKey,
      matches: list,
    }));
  }, [matches]);

  const toggleMatch = (matchId: string): void => {
    setExpandedMap((prev) => ({
      ...prev,
      [matchId]: !prev[matchId],
    }));
  };

  if (isPending) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          로딩 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-red-400">❌ {error.message}</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-500">데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      {groups.map((group) => (
        <section key={group.dateKey} className="space-y-3">
          <div className="space-y-3">
            {group.matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                isExpanded={Boolean(expandedMap[match.id])}
                onToggle={() => toggleMatch(match.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
