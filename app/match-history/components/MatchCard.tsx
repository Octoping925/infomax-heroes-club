import { useEffect, useState } from "react";
import type { MatchHighlightItem, MatchHistoryItem } from "@/domain/hots/types/match-contract";
import { buildYoutubeEmbedUrl, buildYoutubeTimestampUrl } from "@/domain/hots/utils/youtube";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { MAP_CATALOG } from "@/domain/hots/constants/maps";
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
  const [isHighlightFormOpen, setIsHighlightFormOpen] = useState<boolean>(false);
  const [selectedGameIndex, setSelectedGameIndex] = useState<number>(0);

  const { team1, team2, team1Name, team2Name, team1Wins, team2Wins, isTeam1Winner, isTeam2Winner } =
    useMatchResult(match);

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
    setSelectedGameIndex(0);
  }, [match.id]);

  const embedUrl = match.youtubeUrl ? buildYoutubeEmbedUrl(match.youtubeUrl, embedStartSeconds) : null;

  const handleToggleEmbed = () => {
    if (!embedUrl) {
      return;
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

  const selectedGame = match.games[selectedGameIndex] ?? match.games[0];

  return (
    <div>
      {/* Summary Row */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className={`w-full text-left px-3 md:px-4 py-4.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:grid-cols-[96px_minmax(0,1fr)_108px_minmax(0,1fr)_20px] gap-x-4 gap-y-2 items-center transition-colors hover:bg-white/5 ${
          isExpanded ? "bg-white/5" : ""
        }`}
      >
        <div className="col-span-3 md:col-span-1 flex md:flex-col items-baseline md:items-start gap-x-2 gap-y-0.5">
          <span className="text-lg text-gray-200 tabular-nums">
            {dayjs(match.playedAt).locale("ko").format("YY.MM.DD dd")}
          </span>
          <span className="text-base text-gray-400">{match.type === "LUNCH" ? "점심" : "저녁"} 내전</span>
        </div>

        <TeamPanel side={1} name={team1Name} team={team1} isWinner={isTeam1Winner} isLoser={isTeam2Winner} />

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-3xl font-black tabular-nums leading-none">
            <span className={isTeam1Winner ? "text-cyan-300" : "text-gray-500"}>{team1Wins}</span>
            <span className="text-gray-600 font-normal">:</span>
            <span className={isTeam2Winner ? "text-fuchsia-300" : "text-gray-500"}>{team2Wins}</span>
          </div>
          {/* 게임별 승리 팀 */}
          <div className="flex gap-1">
            {match.games.map((game) => (
              <span
                key={game.id}
                title={`Game ${game.gameNumber} · ${MAP_CATALOG[game.map].nameKo}`}
                className={`w-4.5 h-1.5 rounded-sm ${WINNER_BG[game.winnerTeamNumber ?? 0]}`}
              />
            ))}
          </div>
        </div>

        <TeamPanel side={2} name={team2Name} team={team2} isWinner={isTeam2Winner} isLoser={isTeam1Winner} />

        <span
          aria-hidden
          className={`hidden md:block justify-self-end text-xs text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {/* Expanded Detail */}
      {isExpanded && (
        <div className="bg-black/30 border-t border-white/10 px-3 md:px-4 pt-3.5 pb-4 space-y-3.5 animate-in fade-in slide-in-from-top-4 duration-300">
          {selectedGame && (
            <>
              <div className="flex justify-between">
                <div role="tablist" className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                  {match.games.map((game, index) => {
                    const isSelected = game.id === selectedGame.id;

                    return (
                      <button
                        type="button"
                        role="tab"
                        key={game.id}
                        aria-selected={isSelected}
                        onClick={() => setSelectedGameIndex(index)}
                        className={`shrink-0 px-3 py-2 rounded-lg border border-t-[3px] text-left transition-colors ${
                          WINNER_BORDER_TOP[game.winnerTeamNumber ?? 0]
                        } ${isSelected ? "bg-white/10 border-white/25" : "bg-white/3 border-white/10 hover:bg-white/5"}`}
                      >
                        <span className="block text-base text-gray-400 tabular-nums">
                          G{game.gameNumber} · {formatGameLength(game.gameLength)}
                        </span>
                        <span className={`block text-base font-bold ${isSelected ? "text-white" : "text-gray-400"}`}>
                          {MAP_CATALOG[game.map].nameKo}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {embedUrl && (
                      <button
                        type="button"
                        onClick={handleToggleEmbed}
                        className="px-2.5 py-1 rounded-full text-base font-bold border bg-red-500/15 text-red-200 border-red-400/30 hover:bg-red-500/25 transition-all"
                      >
                        {isEmbedOpen ? "플레이어 닫기" : "▶ 풀영상"}
                      </button>
                    )}
                    <span className="text-base text-gray-400 mx-1">하이라이트 {highlights.length}</span>
                    {highlights.map((highlight) => {
                      const timestampLabel = formatHighlightTimestamp(highlight.seconds);
                      const caption = highlight.note ? `${timestampLabel} · ${highlight.note}` : timestampLabel;

                      if (embedUrl) {
                        return (
                          <button
                            type="button"
                            key={highlight.id}
                            onClick={() => handlePlayHighlight(highlight.seconds)}
                            className="px-2.5 py-1 rounded-full border border-cyan-400/30 bg-cyan-500/15 text-cyan-100 text-base font-semibold hover:bg-cyan-500/30"
                          >
                            {caption}
                          </button>
                        );
                      }

                      return (
                        <span
                          key={highlight.id}
                          className="px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-gray-300 text-base font-semibold"
                        >
                          {caption}
                        </span>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setIsHighlightFormOpen((prev) => !prev)}
                      aria-expanded={isHighlightFormOpen}
                      className="px-2.5 py-1 rounded-full border border-dashed border-white/20 text-gray-400 text-base font-semibold hover:border-white/40 hover:text-gray-200"
                    >
                      {isHighlightFormOpen ? "닫기" : "＋ 제보"}
                    </button>
                  </div>

                  {isEmbedOpen && embedUrl && (
                    <div className="rounded-xl border border-red-400/20 overflow-hidden aspect-video">
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
                  )}
                </div>
              </div>
              <GameCard game={selectedGame} team1Name={team1Name} team2Name={team2Name} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// 키는 승리 팀 번호, 0은 무승부.
const WINNER_BG: Record<number, string> = { 0: "bg-gray-600", 1: "bg-cyan-300", 2: "bg-fuchsia-300" };
const WINNER_BORDER_TOP: Record<number, string> = {
  0: "border-t-gray-600!",
  1: "border-t-cyan-300!",
  2: "border-t-fuchsia-300!",
};

function formatGameLength(seconds: number) {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

const TEAM_STYLE = {
  1: { name: "text-cyan-300", win: "bg-cyan-400/10", align: "" },
  2: { name: "text-fuchsia-300", win: "bg-fuchsia-400/10", align: "items-end text-right" },
} as const;

interface TeamPanelProps {
  readonly side: 1 | 2;
  readonly name: string;
  readonly team: MatchHistoryItem["teams"][number];
  readonly isWinner: boolean;
  readonly isLoser: boolean;
}

// 스코어를 가운데 두고 좌우 대칭이 되도록 2팀은 오른쪽 정렬한다.
function TeamPanel({ side, name, team, isWinner, isLoser }: TeamPanelProps) {
  const style = TEAM_STYLE[side];

  return (
    <div className={`flex flex-col gap-1 min-w-0 ${style.align}`}>
      <div className={`flex items-center gap-1.5 text-xl font-black ${isLoser ? "text-gray-400" : style.name}`}>
        {name}
        {isWinner && <span className={`px-1.5 py-px rounded text-lg ${style.win}`}>승</span>}
      </div>
      <div className={`flex flex-wrap gap-x-2.5 gap-y-0.5 text-base text-gray-400 ${side === 2 ? "justify-end" : ""}`}>
        {team.members.map((m) => (
          <span key={m.id} className={m.id === team.leader.id ? "text-gray-100 font-semibold" : ""}>
            {m.nickname}
          </span>
        ))}
      </div>
    </div>
  );
}
