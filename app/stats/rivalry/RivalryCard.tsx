import Image from "next/image";
import { ScorePill } from "./ScorePill";
import { HeroImage } from "@/domain/hots/constants";
import { RivalryCardResponse } from "@/app/api/stats/types";
import dayjs from "dayjs";

interface RivalryCardProps {
  readonly card: RivalryCardResponse;
  readonly variant: "hottest" | "normal";
}

export function RivalryCard({ card, variant }: RivalryCardProps) {
  const a = card.playerA;
  const b = card.playerB;
  const total = card.breakdown.matchesCount;
  const lead = a.wins === b.wins ? "tie" : a.wins > b.wins ? "A" : "B";

  return (
    <article
      className={[
        "rounded-2xl border backdrop-blur-xl p-5",
        variant === "hottest"
          ? "bg-linear-to-br from-cyan-500/10 via-white/5 to-purple-500/10 border-cyan-500/30"
          : "bg-white/5 border-white/10",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-white truncate">
              {a.playerNickname} <span className="text-gray-400">vs</span> {b.playerNickname}
            </h3>
            <span className="px-2 py-1 rounded-full text-xs border border-white/10 bg-white/5 text-gray-200">
              점수 {card.score}
            </span>
            {card.labels.map((l, idx) => (
              <span
                key={`${l.type}-${idx}`}
                className="px-2 py-1 rounded-full text-xs border border-white/10 bg-white/5 text-gray-300"
              >
                {l.text}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-300">{card.comment}</p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400">최근 경기</p>
          <p className="text-sm text-gray-200">{dayjs(card.lastPlayedAt).format("YYYY-MM-DD")}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-xl border border-white/10 bg-black/10 p-4">
          <p className="text-xs text-gray-400">전체 전적</p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <p className="text-base font-semibold text-white">
              {total}전 {a.wins}승 {b.wins}패 {a.draws}무
            </p>
            <p className="text-sm">
              {lead === "tie" ? (
                <span className="text-gray-300">호각</span>
              ) : (
                <span className="text-green-400">{lead === "A" ? a.playerNickname : b.playerNickname} 우세</span>
              )}
            </p>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            승률 {a.playerNickname} {a.winRate}% · {b.playerNickname} {b.winRate}%
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-black/10 p-4">
          <p className="text-xs text-gray-400">최근 5경기 흐름</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-200">
              {card.recent5.winsA}:{card.recent5.winsB}
              {card.recent5.draws > 0 ? ` (무 ${card.recent5.draws})` : ""}
            </p>
            <div className="flex items-center gap-1">
              {card.recent5.sequence.map((r, idx) => (
                <span
                  key={`${card.id}-r5-${idx}`}
                  title={r === "A" ? a.playerNickname : r === "B" ? b.playerNickname : "무승부"}
                  className={[
                    "w-3 h-3 rounded-full border border-white/10",
                    r === "A" ? "bg-cyan-400/90" : r === "B" ? "bg-purple-400/90" : "bg-gray-500/80",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-4">
        <section className="rounded-xl border border-white/10 bg-black/10 p-4">
          <p className="text-xs text-gray-400">대표 영웅 (상대전 Top2)</p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1 text-sm text-gray-200">
              <span className="text-cyan-300">{a.playerNickname}</span>:{" "}
              {card.topHeroes.playerA.map((h) => (
                <span key={h.hero} className="mr-1 flex items-center gap-1">
                  <Image src={HeroImage[h.hero]} alt={h.hero} width={24} height={24} />
                  <span className="text-sm text-gray-300">{h.count}판</span>
                </span>
              )) || "-"}
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-200">
              <span className="text-purple-300">{b.playerNickname}</span>:{" "}
              {card.topHeroes.playerB.map((h) => (
                <span key={h.hero} className="mr-3 flex items-center gap-1">
                  <Image src={HeroImage[h.hero]} alt={h.hero} width={24} height={24} />
                  <span className="text-sm text-gray-300">{h.count}판</span>
                </span>
              )) || "-"}
            </div>
          </div>
        </section>
      </div>

      <details className="mt-4">
        <summary className="text-xs text-gray-400 cursor-pointer select-none">점수 구성 보기</summary>
        <div className="mt-2 text-xs text-gray-400 grid grid-cols-2 lg:grid-cols-5 gap-2">
          <ScorePill label="횟수" value={card.breakdown.countScore} />
          <ScorePill label="균형" value={card.breakdown.balance} />
          <ScorePill label="최근성" value={card.breakdown.recency} />
          <ScorePill label="퍼포먼스(격차↓)" value={card.breakdown.performanceCloseness} />
          <ScorePill label="raw" value={card.breakdown.rawScore} />
        </div>
      </details>
    </article>
  );
}
