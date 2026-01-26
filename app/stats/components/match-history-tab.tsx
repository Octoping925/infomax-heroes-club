"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import type { MatchHistoryItem } from "@/app/api/matches/route";
import { statsQueryKeys } from "@/config/query-keys";
import { MatchCard } from "./match-history/MatchCard";
import { SITE_URL } from "@/config/url";

type MatchGroup = {
  readonly dateKey: string; // YYYY-MM-DD
  readonly matches: ReadonlyArray<MatchHistoryItem>;
};

/**
 * Stats 탭에서 보여주는 역대 match 전적
 */
export function MatchHistoryTab() {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const { data: matches = [], error } = useSuspenseQuery<MatchHistoryItem[]>({
    queryKey: statsQueryKeys.matches.latest(200),
    queryFn: async () => {
      const response = await fetch(`${SITE_URL}/api/matches?take=200`);
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as MatchHistoryItem[];
    },
  });

  const groups: MatchGroup[] = (() => {
    const map = new Map<string, MatchHistoryItem[]>();
    for (const match of matches) {
      const dateKey = dayjs(match.playedAt).format("YYYY-MM-DD");
      const list = map.get(dateKey) ?? [];
      list.push(match);
      map.set(dateKey, list);
    }
    return Array.from(map.entries(), ([dateKey, list]) => ({
      dateKey,
      matches: list,
    }));
  })();

  const toggleMatch = (matchId: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [matchId]: !prev[matchId],
    }));
  };

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
    <div className="flex flex-col gap-4">
      {groups.map((group) =>
        group.matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            isExpanded={Boolean(expandedMap[match.id])}
            onToggle={() => toggleMatch(match.id)}
          />
        ))
      )}
    </div>
  );
}
