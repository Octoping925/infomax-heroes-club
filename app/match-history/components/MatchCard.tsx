import { useEffect, useState } from "react";
import type { MatchHighlightItem, MatchHistoryItem } from "@/domain/hots/types/match-contract";
import { buildYoutubeEmbedUrl, buildYoutubeTimestampUrl } from "@/domain/hots/utils/youtube";
import dayjs from "dayjs";
import { GameCard } from "./GameCard";
import { useMatchResult } from "../hooks/useMatchResult";
import { formatHighlightTimestamp, MAX_HIGHLIGHT_SECONDS, parseHighlightTimestampInput } from "../utils/highlight-time";

type HighlightSaveResult =
  | { readonly status: "idle" }
  | { readonly status: "saving" }
  | { readonly status: "success"; readonly message: string }
  | { readonly status: "error"; readonly message: string };

type CreateHighlightResponse = {
  readonly success: true;
  readonly highlight: MatchHighlightItem;
  readonly youtubeTimestampUrl: string | null;
};

interface MatchCardProps {
  readonly match: MatchHistoryItem;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
}

export function MatchCard({ match, isExpanded, onToggle }: MatchCardProps) {
  const [highlights, setHighlights] = useState<ReadonlyArray<MatchHighlightItem>>(match.highlights);
  const [highlightTimeInput, setHighlightTimeInput] = useState<string>("");
  const [highlightNoteInput, setHighlightNoteInput] = useState<string>("");
  const [highlightSaveResult, setHighlightSaveResult] = useState<HighlightSaveResult>({ status: "idle" });
  const [isEmbedOpen, setIsEmbedOpen] = useState<boolean>(false);
  const [embedStartSeconds, setEmbedStartSeconds] = useState<number>(0);
  const [embedNonce, setEmbedNonce] = useState<number>(0);

  const {
    team1,
    team2,
    team1Name,
    team2Name,
    team1Wins,
    team2Wins,
    isTeam1Winner,
    isTeam2Winner,
    isDraw,
    getWinnerLabel,
  } = useMatchResult(match);

  useEffect(() => {
    setHighlights(match.highlights);
  }, [match.highlights]);

  useEffect(() => {
    if (!isExpanded) {
      setIsEmbedOpen(false);
    }
  }, [isExpanded]);

  useEffect(() => {
    setIsEmbedOpen(false);
    setEmbedStartSeconds(0);
    setEmbedNonce(0);
  }, [match.id]);

  const embedUrl = match.youtubeUrl ? buildYoutubeEmbedUrl(match.youtubeUrl, embedStartSeconds) : null;

  const handleToggleEmbed = () => {
    if (!embedUrl) {
      return;
    }

    if (!isExpanded) {
      onToggle();
    }

    const shouldOpen = !isEmbedOpen;
    setIsEmbedOpen(shouldOpen);
    if (shouldOpen) {
      setEmbedStartSeconds(0);
      setEmbedNonce((prev) => prev + 1);
    }
  };

  const handlePlayHighlight = (seconds: number) => {
    if (!embedUrl) {
      return;
    }

    if (!isExpanded) {
      onToggle();
    }

    setIsEmbedOpen(true);
    setEmbedStartSeconds(seconds);
    setEmbedNonce((prev) => prev + 1);
  };

  const handleSubmitHighlight = async () => {
    const parsedSeconds = parseHighlightTimestampInput(highlightTimeInput);
    if (parsedSeconds === null) {
      setHighlightSaveResult({
        status: "error",
        message: `시간 형식이 올바르지 않습니다. 0~${MAX_HIGHLIGHT_SECONDS}초, mm:ss, hh:mm:ss 중 하나로 입력해주세요.`,
      });
      return;
    }

    setHighlightSaveResult({ status: "saving" });

    try {
      const response = await fetch(`/api/matches/${match.id}/highlights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seconds: parsedSeconds,
          note: highlightNoteInput,
        }),
      });

      const data: CreateHighlightResponse | { error: string } = await response.json();
      if (!response.ok) {
        const message = "error" in data ? data.error : "하이라이트 저장에 실패했습니다.";
        throw new Error(message);
      }

      const typed = data as CreateHighlightResponse;
      setHighlights((prev) => [...prev, typed.highlight].toSorted((a, b) => a.seconds - b.seconds));
      setHighlightTimeInput("");
      setHighlightNoteInput("");
      setHighlightSaveResult({
        status: "success",
        message: "하이라이트가 등록되었습니다.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setHighlightSaveResult({ status: "error", message });
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-linear-to-b from-white/8 to-white/3 overflow-hidden transition-all hover:border-white/20">
      {/* Header Info */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`px-4 py-1 rounded-full text-md font-bold border ${
              match.type === "LUNCH"
                ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
            }`}
          >
            {match.type === "LUNCH" ? "점심" : "저녁"}
          </span>
          <span className="text-md font-medium text-gray-400">{dayjs(match.playedAt).format("YYYY년 MM월 DD일")}</span>
        </div>
        <div className="flex items-center gap-2">
          {embedUrl ? (
            <button
              type="button"
              onClick={handleToggleEmbed}
              className="px-3 py-1.5 rounded-lg text-sm font-bold border bg-red-500/15 text-red-200 border-red-400/30 hover:bg-red-500/25 transition-all"
            >
              {isEmbedOpen && isExpanded ? "플레이어 닫기" : "풀영상 보기"}
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-white/5 text-gray-400 border-white/10">
              영상 링크 없음
            </span>
          )}

          <button
            onClick={onToggle}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all duration-300 ${
              isExpanded
                ? "bg-white/15 text-gray-200 border-white/20"
                : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            {isExpanded ? "접기" : "상세"}
          </button>
        </div>
      </div>

      {/* Match Content */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 md:items-stretch">
          <div
            className={`rounded-xl border p-3 transition-colors ${
              isTeam1Winner ? "bg-cyan-500/10 border-cyan-400/30" : "bg-white/3 border-white/10"
            } ${isTeam2Winner ? "opacity-65" : "opacity-100"} `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold tracking-[0.18em] text-cyan-300/90">TEAM 1</span>
              {isTeam1Winner && !isDraw && <span className="text-2xl px-2">👑</span>}
            </div>
            <p className="text-base font-black text-white leading-none mb-2">{team1Name}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-2">
              {team1.members.map((m) => (
                <span
                  key={m.id}
                  className={`px-2 py-0.5 rounded text-[13px] font-medium ${
                    m.id === team1.leader.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "bg-white/5 text-gray-400 border border-white/5"
                  }`}
                >
                  {m.nickname}
                </span>
              ))}
            </div>
          </div>

          <div className="min-w-[130px] md:min-w-[150px] rounded-xl px-3 py-2.5 flex md:flex-col items-center justify-center gap-6 md:gap-1">
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-black tabular-nums ${isTeam1Winner ? "text-cyan-300" : "text-gray-500"}`}>
                {team1Wins}
              </span>
              <span className="text-gray-600 font-bold">:</span>
              <span
                className={`text-3xl font-black tabular-nums ${isTeam2Winner ? "text-fuchsia-300" : "text-gray-500"}`}
              >
                {team2Wins}
              </span>
            </div>
            <span
              className={`text-sm px-2.5 py-1 rounded-full border font-bold ${
                isDraw
                  ? "border-white/15 bg-white/5 text-gray-300"
                  : isTeam1Winner
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                    : "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200"
              }`}
            >
              {getWinnerLabel()}
            </span>
          </div>

          <div
            className={`rounded-xl border p-3 transition-colors ${
              isTeam2Winner ? "bg-fuchsia-500/10 border-fuchsia-400/30" : "bg-white/3 border-white/10"
            } ${isTeam1Winner ? "opacity-65" : "opacity-100"} `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold tracking-[0.18em] text-fuchsia-300/90">TEAM 2</span>
              {isTeam2Winner && !isDraw && <span className="text-2xl px-2">👑</span>}
            </div>
            <p className="text-base font-black text-white leading-none mb-2">{team2Name}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-2">
              {team2.members.map((m) => (
                <span
                  key={m.id}
                  className={`px-2 py-0.5 rounded text-[13px] font-medium ${
                    m.id === team2.leader.id
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "bg-white/5 text-gray-400 border border-white/5"
                  }`}
                >
                  {m.nickname}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Games */}
      {isExpanded && (
        <div className="bg-black/20 border-t border-white/10 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          {isEmbedOpen && embedUrl && (
            <div className="px-4 pt-4">
              <div className="rounded-xl border border-red-400/20 bg-black/40 overflow-hidden">
                <div className="px-3 py-2 flex items-center justify-between border-b border-white/10">
                  <span className="text-sm font-semibold text-red-100">유튜브 풀영상 플레이어</span>
                  {match.youtubeUrl && (
                    <a
                      href={buildYoutubeTimestampUrl(match.youtubeUrl, embedStartSeconds)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-red-200/80 hover:text-red-100"
                    >
                      유튜브에서 열기 ↗
                    </a>
                  )}
                </div>
                <div className="aspect-video bg-black">
                  <iframe
                    key={`${match.id}-${embedStartSeconds}-${embedNonce}`}
                    src={embedUrl}
                    title={`${dayjs(match.playedAt).format("YYYY-MM-DD")} 내전 풀영상`}
                    className="w-full h-full"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="px-4 pt-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h4 className="text-sm font-bold text-gray-200">하이라이트 제보</h4>
                <span className="text-xs text-gray-400">총 {highlights.length}개</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-2">
                <input
                  value={highlightTimeInput}
                  onChange={(event) => setHighlightTimeInput(event.target.value)}
                  placeholder="예: 13:24"
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
                <input
                  value={highlightNoteInput}
                  onChange={(event) => setHighlightNoteInput(event.target.value)}
                  placeholder="장면 설명 (선택)"
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
                <button
                  type="button"
                  onClick={handleSubmitHighlight}
                  disabled={highlightSaveResult.status === "saving"}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                    highlightSaveResult.status === "saving"
                      ? "bg-gray-600/40 border-gray-500/40 text-gray-300 cursor-not-allowed"
                      : "bg-cyan-500/20 border-cyan-400/30 text-cyan-100 hover:bg-cyan-500/30"
                  }`}
                >
                  {highlightSaveResult.status === "saving" ? "등록 중..." : "제보"}
                </button>
              </div>

              <p className="text-xs text-gray-500">초 단위 또는 mm:ss / hh:mm:ss 형식으로 입력할 수 있습니다.</p>

              {highlightSaveResult.status === "error" && (
                <p className="text-xs text-red-300">❌ {highlightSaveResult.message}</p>
              )}
              {highlightSaveResult.status === "success" && (
                <p className="text-xs text-emerald-300">✅ {highlightSaveResult.message}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {highlights.length === 0 ? (
                  <span className="text-xs text-gray-500">아직 제보된 하이라이트가 없습니다.</span>
                ) : (
                  highlights.map((highlight) => {
                    const timestampLabel = formatHighlightTimestamp(highlight.seconds);
                    const caption = highlight.note ? `${timestampLabel} · ${highlight.note}` : timestampLabel;

                    if (embedUrl) {
                      return (
                        <button
                          type="button"
                          key={highlight.id}
                          onClick={() => handlePlayHighlight(highlight.seconds)}
                          className="px-2.5 py-1 rounded-full border border-cyan-400/30 bg-cyan-500/15 text-cyan-100 text-xs font-semibold hover:bg-cyan-500/30"
                        >
                          {caption}
                        </button>
                      );
                    }

                    return (
                      <span
                        key={highlight.id}
                        className="px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-gray-300 text-xs font-semibold"
                      >
                        {caption}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {match.games.map((game) => (
            <GameCard key={game.id} game={game} team1Name={team1Name} team2Name={team2Name} />
          ))}
        </div>
      )}
    </div>
  );
}
