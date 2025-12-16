"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import type { MatchHistoryItem } from "@/app/api/matches/route";
import { HeroMap } from "@/domain/hots/constants/hero";
import { MAPS } from "@/domain/hots/constants/maps";
import { Hero } from "@/generated/prisma/client";
import { statsQueryKeys } from "@/config/query-keys";

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

type MatchCardProps = {
  readonly match: MatchHistoryItem;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
};

function MatchCard({ match, isExpanded, onToggle }: MatchCardProps) {
  const winnerLabel = getWinnerLabel(match.winnerTeamNumber);

  const team1 = match.teams.find((t) => t.teamNumber === 1);
  const team2 = match.teams.find((t) => t.teamNumber === 2);

  return (
    <main className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-col gap-2">
              <span className="text-center px-3 py-1 rounded-full text-md font-medium border bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                {match.type === "LUNCH" ? "점심" : "저녁"}
              </span>
              <span className="text-center px-3 py-1 rounded-full text-md font-medium border bg-white/5 text-gray-300 border-white/10">
                {winnerLabel}
              </span>
              <span className="text-md font-semibold text-gray-400 uppercase tracking-wider">
                {dayjs(match.playedAt).format("YYYY-MM-DD")}
              </span>
            </div>
          </div>
          <div className="ml-12 grid grid-cols-1 md:grid-cols-2 gap-3">
            <TeamSummaryCard
              title="팀 1"
              leaderNickname={team1?.leader.nickname ?? "-"}
              members={team1?.members.map((m) => m.nickname) ?? []}
              accent="border-cyan-500/30"
            />
            <TeamSummaryCard
              title="팀 2"
              leaderNickname={team2?.leader.nickname ?? "-"}
              members={team2?.members.map((m) => m.nickname) ?? []}
              accent="border-purple-500/30"
            />
          </div>
        </div>

        <button
          onClick={onToggle}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            isExpanded
              ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
              : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          {isExpanded ? "닫기" : "열기"}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-white/10 p-5 space-y-4">
          {match.games.length === 0 ? (
            <p className="text-gray-500">game 데이터가 없습니다.</p>
          ) : (
            match.games.map((game) => <GameCard key={game.id} game={game} />)
          )}
        </div>
      )}
    </main>
  );
}

type TeamSummaryCardProps = {
  readonly title: string;
  readonly leaderNickname: string;
  readonly members: ReadonlyArray<string>;
  readonly accent: string;
};

function TeamSummaryCard({
  title,
  leaderNickname,
  members,
  accent,
}: TeamSummaryCardProps) {
  return (
    <div className={`w-36 bg-white/5 rounded-xl p-4 border ${accent}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>
      </div>
      {members.map((member) => (
        <p key={member} className="text-xs text-gray-300 mt-2 truncate">
          {leaderNickname === member ? `${member} - 👑` : member}
        </p>
      ))}
    </div>
  );
}

type GameCardProps = {
  readonly game: MatchHistoryItem["games"][number];
};

function GameCard({ game }: GameCardProps) {
  const winnerLabel = getWinnerLabel(game.winnerTeamNumber);
  const mapName = MAPS[game.map as keyof typeof MAPS] ?? game.map;

  const team1 = game.teams.find((t) => t.teamNumber === 1);
  const team2 = game.teams.find((t) => t.teamNumber === 2);

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">
            Game {game.gameNumber} · {mapName}
          </p>
          <p className="text-xs text-gray-500 mt-1">{winnerLabel}</p>
        </div>
        <div className="text-xs text-gray-400">
          {team1?.result ? `T1: ${team1.result}` : ""}{" "}
          {team2?.result ? ` / T2: ${team2.result}` : ""}
        </div>
      </div>

      <div className="border-t border-white/10 grid grid-cols-1 lg:grid-cols-2">
        <GameTeamTable
          title="팀 1"
          result={team1?.result ?? null}
          members={team1?.members ?? []}
          accent="border-cyan-500/30"
        />
        <GameTeamTable
          title="팀 2"
          result={team2?.result ?? null}
          members={team2?.members ?? []}
          accent="border-purple-500/30"
        />
      </div>
    </div>
  );
}

type GameTeamTableProps = {
  readonly title: string;
  readonly result: string | null;
  readonly members: ReadonlyArray<
    MatchHistoryItem["games"][number]["teams"][number]["members"][number]
  >;
  readonly accent: string;
};

function GameTeamTable({ title, result, members, accent }: GameTeamTableProps) {
  return (
    <div
      className={`p-4 border-t lg:border-t-0 lg:border-l border-white/10 ${accent} ${getTeamBackgroundClass(
        result
      )}`}
    >
      <p className="text-xs text-gray-500 mb-3">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-white/10">
              <th className="py-2 pr-3 font-medium">플레이어</th>
              <th className="py-2 pr-3 font-medium">영웅</th>
              <th className="py-2 pr-3 font-medium">킬</th>
              <th className="py-2 pr-3 font-medium">데스</th>
              <th className="py-2 pr-3 font-medium">테이크다운</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td className="py-3 text-gray-500" colSpan={5}>
                  멤버 정보 없음
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr
                  key={member.player.id}
                  className="border-b border-white/5 last:border-b-0"
                >
                  <td className="py-2 pr-3">
                    <div className="font-medium text-white">
                      {member.player.nickname}
                    </div>
                    <div className="text-xs text-gray-500">
                      {member.player.name}
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    {HeroMap[member.hero as Hero] || member.hero}
                  </td>
                  <td className="py-2 pr-3">
                    {formatNumberOrDash(member.kills)}
                  </td>
                  <td className="py-2 pr-3">
                    {formatNumberOrDash(member.deaths)}
                  </td>
                  <td className="py-2 pr-3">
                    {formatNumberOrDash(member.takedowns)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getWinnerLabel(winnerTeamNumber: number | null): string {
  if (winnerTeamNumber === null) return "무승부";
  return `팀 ${winnerTeamNumber} 승`;
}

function formatNumberOrDash(value: number | null): string {
  return value === null ? "-" : String(value);
}

function getTeamBackgroundClass(result: string | null): string {
  if (result === "WIN") return "bg-blue-500/10";
  if (result === "LOSE") return "bg-red-500/10";
  return "bg-white/0";
}
