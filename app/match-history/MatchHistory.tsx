"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { MatchHistoryItem } from "@/domain/hots/types/match-contract";
import { statsQueryKeys } from "@/config/query-keys";
import { MatchCard } from "./components/MatchCard";
import { SITE_URL } from "@/config/url";

export function MatchHistory() {
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

  return (
    <div className="flex flex-col gap-4">
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          isExpanded={expandedMap[match.id] ?? false}
          onToggle={() => toggleMatch(match.id)}
        />
      ))}
    </div>
  );
}
