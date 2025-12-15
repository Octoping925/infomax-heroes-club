"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import type { MatchHistoryItem } from "@/app/api/matches/route";
import { HeroMap } from "@/domain/hots/constants/hero";
import { MAPS } from "@/domain/hots/constants/maps";
import { Hero } from "@/generated/prisma/client";

type MatchGroup = {
  readonly dateKey: string; // YYYY-MM-DD
  readonly matches: ReadonlyArray<MatchHistoryItem>;
};

/**
 * 역대 match 전적 페이지
 */
export default function MatchHistoryPage() {
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/matches?take=200");
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }
      const result: MatchHistoryItem[] = await response.json();
      setMatches(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <header className="w-full px-6 py-4 border-b border-white/10 backdrop-blur-xl sticky top-0 z-50 bg-[#0a0a12]/90">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-cyan-500/25">
              H
            </div>
            <div>
              <h1 className="text-xl font-bold">역대 내전 전적</h1>
              <p className="text-xs text-gray-500">Match / Game 상세</p>
            </div>
          </div>
          <nav className="flex gap-2">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all"
            >
              홈
            </Link>
            <Link
              href="/stats"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all"
            >
              통계
            </Link>
            <Link
              href="/admin/match"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all"
            >
              경기입력
            </Link>
          </nav>
        </div>
      </header>

      <main className="w-full px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <h2 className="text-lg font-bold">날짜별 내전 목록</h2>
            <p className="text-gray-400 mt-1">
              match를 열면 해당 match의 game들과 팀/영웅/킬데스 스탯이 표시됩니다.
            </p>
          </div>

          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="flex items-center gap-3 text-gray-400">
                <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                로딩 중...
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center py-12">
              <p className="text-red-400">❌ {error}</p>
            </div>
          )}

          {!isLoading && !error && groups.length === 0 && (
            <div className="flex justify-center py-12">
              <p className="text-gray-500">데이터가 없습니다.</p>
            </div>
          )}

          {!isLoading &&
            !error &&
            groups.map((group) => (
              <section key={group.dateKey} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    {group.dateKey}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {group.matches.length}건
                  </span>
                </div>

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
        </div>
      </main>
    </div>
  );
}

type MatchCardProps = {
  readonly match: MatchHistoryItem;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
};

function MatchCard({ match, isExpanded, onToggle }: MatchCardProps) {
  const winnerLabel = getWinnerLabel(match.winnerTeamNumber);
  const matchTypeLabel = match.type === "LUNCH" ? "점심" : "저녁";

  const team1 = match.teams.find((t) => t.teamNumber === 1);
  const team2 = match.teams.find((t) => t.teamNumber === 2);

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-medium border bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
              {matchTypeLabel}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium border bg-white/5 text-gray-300 border-white/10">
              {winnerLabel}
            </span>
            <span className="text-xs text-gray-500">
              {dayjs(match.playedAt).format("YYYY-MM-DD")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
    </div>
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
    <div className={`bg-white/5 rounded-xl p-4 border ${accent}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{title}</p>
        <p className="text-xs text-gray-400">리더: {leaderNickname}</p>
      </div>
      <p className="text-sm text-gray-300 mt-2 truncate">
        {members.length === 0 ? "멤버 정보 없음" : members.join(", ")}
      </p>
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
                    <div className="text-xs text-gray-500">{member.player.name}</div>
                  </td>
                  <td className="py-2 pr-3">
                    {HeroMap[member.hero as Hero] || member.hero}
                  </td>
                  <td className="py-2 pr-3">{formatNumberOrDash(member.kills)}</td>
                  <td className="py-2 pr-3">{formatNumberOrDash(member.deaths)}</td>
                  <td className="py-2 pr-3">{formatNumberOrDash(member.takedowns)}</td>
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


