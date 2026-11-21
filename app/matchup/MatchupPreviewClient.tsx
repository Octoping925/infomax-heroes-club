"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { PlayerListItem } from "@/app/api/players/route";
import { formatMatchupShareText } from "@/domain/dooray/matchup-message";
import { HERO_CATALOG, HeroImage } from "@/domain/hots/constants";
import { HeroRoleLabelMap } from "@/domain/hots/models";
import type {
  MatchupPreviewResponse,
  MatchupStoryline,
  MatchupTeamSummary,
} from "@/domain/hots/service/matchup-preview";
import type { MatchType } from "@/generated/prisma/client";
import { MatchupPosterGenerator } from "./MatchupPosterGenerator";

const MAX_TEAM_SIZE = 5;

interface Props {
  readonly players: ReadonlyArray<PlayerListItem>;
  readonly isAdmin: boolean;
  readonly initialTeamA: ReadonlyArray<string>;
  readonly initialTeamB: ReadonlyArray<string>;
  readonly initialMatchType: MatchType;
  readonly initialLeaderA: string | null;
  readonly initialLeaderB: string | null;
  readonly initialPreview: MatchupPreviewResponse | null;
}

export function MatchupPreviewClient({
  players,
  isAdmin,
  initialTeamA,
  initialTeamB,
  initialMatchType,
  initialLeaderA,
  initialLeaderB,
  initialPreview,
}: Props) {
  const router = useRouter();
  const [teamA, setTeamA] = useState<string[]>([...initialTeamA]);
  const [teamB, setTeamB] = useState<string[]>([...initialTeamB]);
  const [matchType, setMatchType] = useState<MatchType>(initialMatchType);
  const [leaderA, setLeaderA] = useState<string | null>(initialLeaderA);
  const [leaderB, setLeaderB] = useState<string | null>(initialLeaderB);
  const [activeSide, setActiveSide] = useState<"A" | "B">("A");
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(!initialPreview);
  const [preview, setPreview] = useState<MatchupPreviewResponse | null>(initialPreview);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPoster, setShowPoster] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [announceRoom, setAnnounceRoom] = useState<"club" | "test">("test");
  const [isAnnouncing, setIsAnnouncing] = useState<boolean>(false);

  const buildQueryString = useCallback(
    (
      nextA: ReadonlyArray<string>,
      nextB: ReadonlyArray<string>,
      nextType: MatchType,
      nextLeaderA: string | null,
      nextLeaderB: string | null,
    ) => {
      const params = new URLSearchParams();
      if (nextA.length > 0) params.set("a", nextA.join(","));
      if (nextB.length > 0) params.set("b", nextB.join(","));
      params.set("type", nextType);
      if (nextLeaderA && nextA.includes(nextLeaderA)) params.set("leaderA", nextLeaderA);
      if (nextLeaderB && nextB.includes(nextLeaderB)) params.set("leaderB", nextLeaderB);
      return params.toString();
    },
    [],
  );

  const fetchPreview = useCallback(
    async (
      nextA: ReadonlyArray<string>,
      nextB: ReadonlyArray<string>,
      nextType: MatchType,
      nextLeaderA: string | null,
      nextLeaderB: string | null,
      syncUrl: boolean,
    ) => {
      if (nextA.length === 0 || nextB.length === 0) {
        setError("A팀과 B팀에 각각 1명 이상 선택해주세요.");
        return;
      }

      const qs = buildQueryString(nextA, nextB, nextType, nextLeaderA, nextLeaderB);
      if (syncUrl) {
        router.replace(`/matchup?${qs}`, { scroll: false });
      }

      setIsLoading(true);
      setError(null);
      setFeedback(null);

      try {
        const response = await fetch(`/api/stats/matchup-preview?${qs}`);
        const data = (await response.json().catch(() => null)) as MatchupPreviewResponse | { error?: string } | null;
        if (!response.ok || !data || !("probability" in data)) {
          throw new Error(data && "error" in data && data.error ? data.error : "프리뷰를 불러오지 못했습니다.");
        }
        setPreview(data);
        setIsEditorOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "프리뷰를 불러오지 못했습니다.");
        setPreview(null);
      } finally {
        setIsLoading(false);
      }
    },
    [buildQueryString, router],
  );

  const assignedSet = new Set([...teamA, ...teamB]);

  const handleTogglePlayer = (nickname: string) => {
    if (teamA.includes(nickname)) {
      setTeamA((prev) => prev.filter((item) => item !== nickname));
      if (leaderA === nickname) setLeaderA(null);
      return;
    }
    if (teamB.includes(nickname)) {
      setTeamB((prev) => prev.filter((item) => item !== nickname));
      if (leaderB === nickname) setLeaderB(null);
      return;
    }

    if (activeSide === "A") {
      if (teamA.length >= MAX_TEAM_SIZE) {
        setError(`A팀은 최대 ${MAX_TEAM_SIZE}명까지 선택할 수 있습니다.`);
        return;
      }
      const next = [...teamA, nickname];
      setTeamA(next);
      if (next.length === MAX_TEAM_SIZE && teamB.length < MAX_TEAM_SIZE) {
        setActiveSide("B");
      }
    } else {
      if (teamB.length >= MAX_TEAM_SIZE) {
        setError(`B팀은 최대 ${MAX_TEAM_SIZE}명까지 선택할 수 있습니다.`);
        return;
      }
      setTeamB((prev) => [...prev, nickname]);
    }
    setError(null);
  };

  const handleSwapTeams = () => {
    const nextA = [...teamB];
    const nextB = [...teamA];
    const nextLeaderA = leaderB;
    const nextLeaderB = leaderA;
    setTeamA(nextA);
    setTeamB(nextB);
    setLeaderA(nextLeaderA);
    setLeaderB(nextLeaderB);
    if (preview && nextA.length > 0 && nextB.length > 0) {
      void fetchPreview(nextA, nextB, matchType, nextLeaderA, nextLeaderB, true);
    }
  };

  const handleReset = () => {
    setTeamA([]);
    setTeamB([]);
    setLeaderA(null);
    setLeaderB(null);
    setPreview(null);
    setShowPoster(false);
    setError(null);
    setFeedback(null);
    setIsEditorOpen(true);
    router.replace("/matchup", { scroll: false });
  };

  const getCurrentShareUrl = () => {
    const qs = buildQueryString(teamA, teamB, matchType, leaderA, leaderB);
    if (typeof window === "undefined") return `/matchup?${qs}`;
    return `${window.location.origin}/matchup?${qs}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getCurrentShareUrl());
      setFeedback("매치업 프리뷰 링크를 복사했습니다.");
    } catch {
      setFeedback("클립보드 복사에 실패했습니다.");
    }
  };

  const handleCopyDoorayText = async () => {
    if (!preview) return;
    try {
      const text = formatMatchupShareText(preview, getCurrentShareUrl());
      await navigator.clipboard.writeText(text);
      setFeedback("두레이 공지 문구를 복사했습니다. 채팅방에 바로 붙여넣어 보세요!");
    } catch {
      setFeedback("클립보드 복사에 실패했습니다.");
    }
  };

  const handleSendDoorayBot = async () => {
    if (!preview || !isAdmin) return;
    setIsAnnouncing(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/matchup-announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamANicknames: teamA,
          teamBNicknames: teamB,
          matchType,
          leaderANickname: leaderA,
          leaderBNickname: leaderB,
          room: announceRoom,
        }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error ?? "두레이 공지 전송에 실패했습니다.");
      }
      setFeedback(
        announceRoom === "club"
          ? "동호회 두레이 방으로 매치업 공지를 전송했습니다."
          : "테스트 두레이 방으로 매치업 공지를 전송했습니다.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "두레이 공지 전송에 실패했습니다.");
    } finally {
      setIsAnnouncing(false);
    }
  };

  const adminStrategyHref =
    teamA.length > 0 && teamB.length > 0
      ? `/admin/strategy?ally=${encodeURIComponent(teamA.join(","))}&enemy=${encodeURIComponent(teamB.join(","))}`
      : "/admin/strategy";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 py-7 sm:py-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">내전 매치업 프리뷰</h1>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            팀이 정해졌을 때 예상 승률과 관전 포인트를 확인하고 두레이에 바로 공유하세요.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/stats#teamComposer"
            className="min-h-11 inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            팀 편성 도우미로 이동
          </Link>
          {preview && (
            <button
              type="button"
              onClick={() => setIsEditorOpen((prev) => !prev)}
              aria-pressed={isEditorOpen}
              className="min-h-11 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              {isEditorOpen ? "팀 구성 접기" : "팀 구성 수정"}
            </button>
          )}
        </div>
      </div>

      {isEditorOpen && (
        <section className="mt-6 rounded-[14px] border border-white/10 bg-white/[0.03] p-4 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">팀 로스터 설정</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                아래에서 추가할 팀을 고른 뒤 멤버를 클릭하세요. 선택된 칩을 누르면 팀장으로 지정할 수 있습니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl bg-white/5 p-1">
                {(["LUNCH", "DINNER"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={matchType === type}
                    onClick={() => setMatchType(type)}
                    className={`min-h-9 rounded-lg px-3.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                      matchType === type
                        ? "bg-cyan-500 text-black"
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {type === "LUNCH" ? "점심 내전" : "저녁 내전"}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSwapTeams}
                className="min-h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold text-gray-200 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                팀 뒤집기
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="min-h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold text-gray-300 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                초기화
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TeamDraftSlot
              label="TEAM A"
              accent="cyan"
              active={activeSide === "A"}
              members={teamA}
              leader={leaderA}
              onActivate={() => setActiveSide("A")}
              onToggleLeader={(nickname) => setLeaderA((prev) => (prev === nickname ? null : nickname))}
              onRemove={(nickname) => {
                setTeamA((prev) => prev.filter((item) => item !== nickname));
                if (leaderA === nickname) setLeaderA(null);
              }}
            />
            <TeamDraftSlot
              label="TEAM B"
              accent="amber"
              active={activeSide === "B"}
              members={teamB}
              leader={leaderB}
              onActivate={() => setActiveSide("B")}
              onToggleLeader={(nickname) => setLeaderB((prev) => (prev === nickname ? null : nickname))}
              onRemove={(nickname) => {
                setTeamB((prev) => prev.filter((item) => item !== nickname));
                if (leaderB === nickname) setLeaderB(null);
              }}
            />
          </div>

          <div className="space-y-2 border-t border-white/[0.06] pt-4">
            <p className="text-xs font-medium text-gray-400">
              동호회 멤버 선택 ({activeSide === "A" ? "TEAM A" : "TEAM B"}에 추가 중)
            </p>
            <div className="flex flex-wrap gap-2">
              {players.map((player) => {
                const inA = teamA.includes(player.nickname);
                const inB = teamB.includes(player.nickname);
                const assigned = assignedSet.has(player.nickname);
                return (
                  <button
                    key={player.id}
                    type="button"
                    aria-pressed={assigned}
                    onClick={() => handleTogglePlayer(player.nickname)}
                    className={`min-h-11 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                      inA
                        ? "border-cyan-300/80 bg-cyan-300/15 text-cyan-100"
                        : inB
                          ? "border-amber-300/80 bg-amber-300/15 text-amber-100"
                          : "border-white/15 bg-white/[0.03] text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {player.name} ({player.nickname})
                    {inA ? " · A" : inB ? " · B" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
            <p className="text-xs text-gray-400">
              TEAM A {teamA.length}/{MAX_TEAM_SIZE}명 · TEAM B {teamB.length}/{MAX_TEAM_SIZE}명
            </p>
            <button
              type="button"
              disabled={isLoading || teamA.length === 0 || teamB.length === 0}
              onClick={() => void fetchPreview(teamA, teamB, matchType, leaderA, leaderB, true)}
              className="min-h-11 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "프리뷰 계산 중..." : "매치업 프리뷰 보기"}
            </button>
          </div>
        </section>
      )}

      {error && (
        <div className="mt-4 rounded-[14px] border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {feedback && (
        <div className="mt-4 rounded-[14px] border border-cyan-300/40 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
          {feedback}
        </div>
      )}

      {preview && (
        <div className="mt-6 space-y-6">
          {/* Action & Share Bar */}
          <section className="rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyLink()}
                  className="min-h-11 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                >
                  링크 복사
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopyDoorayText()}
                  className="min-h-11 rounded-lg border border-cyan-300/60 bg-cyan-300/15 px-3.5 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                >
                  두레이 공지 문구 복사
                </button>
                <button
                  type="button"
                  aria-pressed={showPoster}
                  onClick={() => setShowPoster((prev) => !prev)}
                  className={`min-h-11 rounded-lg border px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                    showPoster
                      ? "border-cyan-400 bg-cyan-500/20 text-white"
                      : "border-white/15 bg-white/5 text-gray-200 hover:bg-white/10"
                  }`}
                >
                  {showPoster ? "대진표 PNG 닫기" : "대진표 PNG 저장"}
                </button>
              </div>

              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="두레이 발송 대상 방"
                    value={announceRoom}
                    onChange={(event) => setAnnounceRoom(event.target.value === "club" ? "club" : "test")}
                    className="min-h-11 rounded-md border border-white/15 bg-[#0a0a12] px-3 py-2 text-xs text-white focus:border-cyan-300 focus:outline-none"
                  >
                    <option value="test">두레이 테스트 방</option>
                    <option value="club">동호회 공지 방</option>
                  </select>
                  <button
                    type="button"
                    disabled={isAnnouncing}
                    onClick={() => void handleSendDoorayBot()}
                    className="min-h-11 rounded-lg bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-black transition hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-50"
                  >
                    {isAnnouncing ? "전송 중..." : "두레이 봇 공지"}
                  </button>
                  <Link
                    href={adminStrategyHref}
                    className="min-h-11 inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-gray-200 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                  >
                    관리자 작전판 열기 →
                  </Link>
                </div>
              )}
            </div>
          </section>

          {showPoster && (
            <section className="rounded-[14px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
              <MatchupPosterGenerator preview={preview} />
            </section>
          )}

          {/* Expected Win Probability Panel */}
          <section className="rounded-[14px] border border-white/10 bg-white/[0.03] p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">예상 승률</h2>
                <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs font-semibold text-gray-300">
                  {preview.matchType === "LUNCH" ? "점심 내전" : "저녁 내전"}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                최근 폼 · 통산 승률 · 맞대결 상성 · 팀 시너지 기반
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between tabular-nums">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">TEAM A</span>
                  <span className="ml-2 text-2xl font-bold text-white sm:text-3xl">{preview.probability.teamA}%</span>
                </div>
                <div className="text-right">
                  <span className="mr-2 text-2xl font-bold text-white sm:text-3xl">{preview.probability.teamB}%</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">TEAM B</span>
                </div>
              </div>

              <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-cyan-500 transition-all"
                  style={{ width: `${preview.probability.teamA}%` }}
                />
                <div
                  className="h-full bg-amber-400/80 transition-all"
                  style={{ width: `${preview.probability.teamB}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
              {preview.probability.factors.map((factor) => {
                const isTeamA = factor.teamAEdge > 0;
                const isEven = factor.teamAEdge === 0;
                return (
                  <span
                    key={factor.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs tabular-nums"
                  >
                    <span className="text-gray-400">{factor.label}</span>
                    <span
                      className={
                        isEven
                          ? "font-semibold text-gray-300"
                          : isTeamA
                            ? "font-semibold text-cyan-200"
                            : "font-semibold text-amber-200"
                      }
                    >
                      {isEven
                        ? "동률"
                        : isTeamA
                          ? `A +${factor.teamAEdge}%p`
                          : `B +${Math.abs(factor.teamAEdge)}%p`}
                    </span>
                  </span>
                );
              })}
            </div>
          </section>

          {/* Auto-generated Storylines */}
          <section className="rounded-[14px] border border-white/10 bg-white/[0.03] p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-white">오늘의 관전 포인트</h2>
              <span className="text-xs text-gray-400">{preview.storylines.length}개 자동 추출</span>
            </div>

            {preview.storylines.length > 0 ? (
              <ul className="mt-3 divide-y divide-white/[0.06]">
                {preview.storylines.map((story) => (
                  <StorylineRow key={`${story.kind}-${story.title}`} story={story} />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-gray-400">
                아직 겹친 기록이 적은 신선한 매치업입니다. 오늘 경기 결과가 첫 역사가 됩니다!
              </p>
            )}
          </section>

          {/* Team A vs Team B Comparison */}
          <section className="grid gap-6 lg:grid-cols-2">
            <TeamSummaryPanel team={preview.teamA} accent="cyan" matchType={preview.matchType} />
            <TeamSummaryPanel team={preview.teamB} accent="amber" matchType={preview.matchType} />
          </section>

          {/* Head-to-Head Personal Matchups */}
          <section className="rounded-[14px] border border-white/10 bg-white/[0.03] p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-white">주요 개인 맞대결</h2>
              <span className="text-xs text-gray-400">역대 상대 팀으로 만난 기록</span>
            </div>

            {preview.rivalries.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs font-medium text-gray-400">
                      <th className="py-2 text-left">매치업 (A팀 vs B팀)</th>
                      <th className="py-2 text-right">전적</th>
                      <th className="py-2 text-right">A팀 승률</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] tabular-nums">
                    {preview.rivalries.map((row) => (
                      <tr key={`${row.teamANickname}-${row.teamBNickname}`} className="hover:bg-white/[0.03]">
                        <td className="py-2.5 font-semibold text-white">
                          <span className="text-cyan-200">{row.teamANickname}</span>
                          <span className="mx-2 text-xs font-normal text-gray-500">vs</span>
                          <span className="text-amber-200">{row.teamBNickname}</span>
                        </td>
                        <td className="py-2.5 text-right text-gray-200">
                          {row.teamAWins}승 {row.teamBWins}패{row.draws > 0 ? ` ${row.draws}무` : ""}
                          <span className="ml-1.5 text-xs text-gray-400">({row.matches}회)</span>
                        </td>
                        <td
                          className={`py-2.5 text-right font-semibold ${
                            row.teamAWinRate >= 50 ? "text-emerald-200" : "text-rose-200"
                          }`}
                        >
                          {row.teamAWinRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-400">아직 상대 팀으로 맞붙은 개인 기록이 없습니다.</p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function TeamDraftSlot({
  label,
  accent,
  active,
  members,
  leader,
  onActivate,
  onToggleLeader,
  onRemove,
}: {
  readonly label: string;
  readonly accent: "cyan" | "amber";
  readonly active: boolean;
  readonly members: ReadonlyArray<string>;
  readonly leader: string | null;
  readonly onActivate: () => void;
  readonly onToggleLeader: (nickname: string) => void;
  readonly onRemove: (nickname: string) => void;
}) {
  const borderClass = active
    ? accent === "cyan"
      ? "border-cyan-400/70 bg-cyan-500/[0.06]"
      : "border-amber-300/70 bg-amber-500/[0.06]"
    : "border-white/10 bg-white/[0.02]";

  return (
    <div
      onClick={onActivate}
      className={`cursor-pointer rounded-[14px] border p-4 transition ${borderClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-bold ${accent === "cyan" ? "text-cyan-300" : "text-amber-300"}`}
          >
            {label}
          </span>
          {active && <span className="text-[11px] font-semibold text-gray-300">선택 중</span>}
        </div>
        <span className="text-xs text-gray-400 tabular-nums">
          {members.length}/{MAX_TEAM_SIZE}
        </span>
      </div>

      <div className="mt-3 flex min-h-14 flex-wrap gap-2">
        {members.length > 0 ? (
          members.map((nickname) => {
            const isLeader = leader === nickname;
            return (
              <div
                key={nickname}
                onClick={(event) => event.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 pl-2.5 pr-1.5 py-1 text-xs"
              >
                <button
                  type="button"
                  title="팀장 지정 토글"
                  onClick={() => onToggleLeader(nickname)}
                  className={`font-semibold transition ${isLeader ? "text-amber-200" : "text-white hover:text-cyan-200"}`}
                >
                  {isLeader ? "👑 " : ""}
                  {nickname}
                </button>
                <button
                  type="button"
                  aria-label={`${nickname} 제거`}
                  onClick={() => onRemove(nickname)}
                  className="ml-1 rounded-full px-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  ×
                </button>
              </div>
            );
          })
        ) : (
          <p className="text-xs leading-6 text-gray-400">멤버를 클릭해 {label}에 배치하세요.</p>
        )}
      </div>
    </div>
  );
}

function StorylineRow({ story }: { readonly story: MatchupStoryline }) {
  const badgeClass =
    story.kind === "DUO_HOT" || story.kind === "MATCH_TYPE"
      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
      : story.kind === "DUO_JINX"
        ? "border-rose-400/40 bg-rose-500/15 text-rose-200"
        : "border-cyan-400/40 bg-cyan-500/15 text-cyan-200";

  return (
    <li className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-center gap-2.5">
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass}`}>
          {story.badge}
        </span>
        <span className="text-sm font-semibold text-white">{story.title}</span>
      </div>
      <span className="text-xs text-gray-400 sm:text-right">{story.detail}</span>
    </li>
  );
}

function TeamSummaryPanel({
  team,
  accent,
  matchType,
}: {
  readonly team: MatchupTeamSummary;
  readonly accent: "cyan" | "amber";
  readonly matchType: MatchType;
}) {
  const typeLabel = matchType === "LUNCH" ? "점심" : "저녁";
  const railColor = accent === "cyan" ? "bg-cyan-400" : "bg-amber-400";
  const titleColor = accent === "cyan" ? "text-cyan-300" : "text-amber-300";

  return (
    <article className="overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.03]">
      <div className="flex items-stretch">
        <div className={`w-1.5 shrink-0 ${railColor}`} />
        <div className="min-w-0 flex-1 p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className={`text-base font-bold ${titleColor}`}>TEAM {team.label}</h3>
            <div className="flex flex-wrap gap-3 text-xs text-gray-400 tabular-nums">
              <span>
                최근 <strong className="text-white">{team.averageRecentWinRate}%</strong>
              </span>
              <span>
                통산 <strong className="text-white">{team.averageOverallWinRate}%</strong>
              </span>
              <span>
                {typeLabel} <strong className="text-white">{team.averageMatchTypeWinRate}%</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs font-medium text-gray-400">
                  <th className="py-2 text-left">선수</th>
                  <th className="py-2 text-left">주포지션</th>
                  <th className="py-2 text-left hidden sm:table-cell">주요 영웅</th>
                  <th className="py-2 text-right">최근</th>
                  <th className="py-2 text-right">통산</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] tabular-nums">
                {team.roster.map((player) => (
                  <tr key={player.playerId} className="hover:bg-white/[0.03]">
                    <td className="py-2.5 pr-2">
                      <p className="font-semibold text-white">
                        {player.isLeader ? "👑 " : ""}
                        {player.playerNickname}
                      </p>
                      <p className="text-xs text-gray-400">{player.playerName}</p>
                    </td>
                    <td className="py-2.5 pr-2 text-xs text-gray-200">
                      {player.primaryRole ? HeroRoleLabelMap[player.primaryRole] : "-"}
                    </td>
                    <td className="py-2.5 pr-2 hidden sm:table-cell">
                      {player.topHeroes.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          {player.topHeroes.map((heroItem) => (
                            <span
                              key={heroItem.hero}
                              title={`${HERO_CATALOG[heroItem.hero].nameKo} (${heroItem.games}경기 · ${heroItem.winRate}%)`}
                              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[11px] text-gray-200"
                            >
                              <Image
                                src={HeroImage[heroItem.hero]}
                                alt={HERO_CATALOG[heroItem.hero].nameKo}
                                width={18}
                                height={18}
                                className="rounded"
                              />
                              <span>{HERO_CATALOG[heroItem.hero].nameKo}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`font-semibold ${
                          player.recentStats.totalGames === 0
                            ? "text-gray-500"
                            : player.recentStats.winRate >= 50
                              ? "text-emerald-200"
                              : "text-rose-200"
                        }`}
                      >
                        {player.recentStats.totalGames > 0 ? `${player.recentStats.winRate}%` : "-"}
                      </span>
                      <p className="text-[11px] text-gray-500">{player.recentStats.totalGames}전</p>
                    </td>
                    <td className="py-2.5 pl-2 text-right">
                      <span className="font-semibold text-gray-100">
                        {player.overallStats.totalGames > 0 ? `${player.overallStats.winRate}%` : "-"}
                      </span>
                      <p className="text-[11px] text-gray-500">{player.overallStats.totalGames}전</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-xs text-gray-400">
            <div className="flex flex-wrap gap-1.5">
              {team.roleCoverage.map((coverage) => (
                <span
                  key={coverage.role}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    coverage.count === 0
                      ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                      : "border-white/10 bg-white/[0.03] text-gray-300"
                  }`}
                >
                  {HeroRoleLabelMap[coverage.role]} {coverage.count}
                </span>
              ))}
            </div>
            {team.bestDuo && (
              <span>
                최고 듀오: <strong className="text-gray-200">{team.bestDuo.playerA}·{team.bestDuo.playerB}</strong> (
                {team.bestDuo.winRate}%)
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
