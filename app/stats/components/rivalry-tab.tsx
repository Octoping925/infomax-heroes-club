"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import type { RivalryCardResponse } from "@/app/api/stats/types";
import { HeroMap } from "@/domain/hots/constants/hero";
import { type RivalryParams } from "@/config/query-keys";
import { useRivalries } from "../hooks/useRivalries";
import { Title } from "./Title";

const DEFAULT_PARAMS: RivalryParams = {
  minMatches: 3,
  limit: 30,
  takeMatches: 500,
  includeInsufficientSample: false,
};

export function RivalryTab() {
  const [params, setParams] = useState<RivalryParams>(DEFAULT_PARAMS);
  const { data, isPending, error } = useRivalries(params);

  const hottest = data?.hottest ?? null;
  const items = data?.items ?? [];

  const note = useMemo(() => {
    return (
      <>
        <p className="text-gray-400">
          <span className="text-white">매치 1건</span>을 1회 맞대결로 보고,{" "}
          <span className="text-white">승률 균형(50:50)</span> +{" "}
          <span className="text-white">최근 경기 가중</span> +{" "}
          <span className="text-white">퍼포먼스 격차(작을수록 가산)</span>로 점수를
          계산합니다.
        </p>
        <p className="text-xs text-gray-500">
          표본이 적은 페어는 기본적으로 제외되며(최소 {params.minMatches}회),
          옵션으로 포함할 수 있습니다.
        </p>
      </>
    );
  }, [params.minMatches]);

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

  if (!data || (data.hottest === null && data.items.length === 0)) {
    return (
      <div className="space-y-6">
        {note}
        <RivalryControls params={params} setParams={setParams} />
        <div className="flex justify-center py-12">
          <p className="text-gray-500">조건에 맞는 라이벌 데이터가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <Title title="라이벌리" description="가장 뜨거운 1:1 구도를 찾아봅니다." />
      <div className="space-y-2">{note}</div>
      <RivalryControls params={params} setParams={setParams} />

      {hottest && (
        <section className="space-y-3">
          <Title title="가장 뜨거운 라이벌" />
          <RivalryCard card={hottest} variant="hottest" />
        </section>
      )}

      <section className="space-y-3">
        <Title title="라이벌 카드" description={`총 ${items.length}개`} />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {items.map((card) => (
            <RivalryCard key={card.id} card={card} variant="normal" />
          ))}
        </div>
      </section>
    </section>
  );
}

function RivalryControls(input: {
  readonly params: RivalryParams;
  readonly setParams: React.Dispatch<React.SetStateAction<RivalryParams>>;
}) {
  const { params, setParams } = input;
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-400">최소 맞대결(매치) 수</span>
        <input
          type="number"
          min={1}
          max={50}
          value={params.minMatches}
          onChange={(e) =>
            setParams((prev) => ({ ...prev, minMatches: Number(e.target.value) }))
          }
          className="w-40 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-cyan-500/60"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-400">표시 개수</span>
        <input
          type="number"
          min={1}
          max={200}
          value={params.limit}
          onChange={(e) =>
            setParams((prev) => ({ ...prev, limit: Number(e.target.value) }))
          }
          className="w-32 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-cyan-500/60"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-400">분석 대상 최신 매치 수</span>
        <input
          type="number"
          min={50}
          max={2000}
          value={params.takeMatches}
          onChange={(e) =>
            setParams((prev) => ({ ...prev, takeMatches: Number(e.target.value) }))
          }
          className="w-44 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-cyan-500/60"
        />
      </label>

      <label className="flex items-center gap-2 select-none">
        <input
          type="checkbox"
          checked={params.includeInsufficientSample}
          onChange={(e) =>
            setParams((prev) => ({ ...prev, includeInsufficientSample: e.target.checked }))
          }
          className="accent-cyan-500"
        />
        <span className="text-sm text-gray-300">표본 부족도 포함</span>
      </label>
    </div>
  );
}

function RivalryCard(input: {
  readonly card: RivalryCardResponse;
  readonly variant: "hottest" | "normal";
}) {
  const { card, variant } = input;

  const a = card.playerA;
  const b = card.playerB;
  const total = card.breakdown.matchesCount;
  const lead =
    a.wins === b.wins ? "tie" : a.wins > b.wins ? "A" : "B";

  const heroNamesA = card.topHeroes.playerA
    .map((h) => `${HeroMap[h.hero] ?? String(h.hero)}(${h.count})`)
    .join(", ");
  const heroNamesB = card.topHeroes.playerB
    .map((h) => `${HeroMap[h.hero] ?? String(h.hero)}(${h.count})`)
    .join(", ");

  return (
    <article
      className={[
        "rounded-2xl border backdrop-blur-xl p-5",
        variant === "hottest"
          ? "bg-gradient-to-br from-cyan-500/10 via-white/5 to-purple-500/10 border-cyan-500/30"
          : "bg-white/5 border-white/10",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-white truncate">
              {a.playerNickname} <span className="text-gray-400">vs</span>{" "}
              {b.playerNickname}
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
          <p className="text-sm text-gray-200">
            {dayjs(card.lastPlayedAt).format("YYYY-MM-DD")}
          </p>
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
              ) : lead === "A" ? (
                <span className="text-green-400">{a.playerNickname} 우세</span>
              ) : (
                <span className="text-green-400">{b.playerNickname} 우세</span>
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
                    r === "A"
                      ? "bg-cyan-400/90"
                      : r === "B"
                        ? "bg-purple-400/90"
                        : "bg-gray-500/80",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-xl border border-white/10 bg-black/10 p-4">
          <p className="text-xs text-gray-400">점심/저녁 분리 전적</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500">점심</p>
              <p className="text-sm text-gray-200">
                {card.lunchDinner.lunch.winsA}:{card.lunchDinner.lunch.winsB}
                {card.lunchDinner.lunch.draws > 0
                  ? ` (무 ${card.lunchDinner.lunch.draws})`
                  : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">저녁</p>
              <p className="text-sm text-gray-200">
                {card.lunchDinner.dinner.winsA}:{card.lunchDinner.dinner.winsB}
                {card.lunchDinner.dinner.draws > 0
                  ? ` (무 ${card.lunchDinner.dinner.draws})`
                  : ""}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-black/10 p-4">
          <p className="text-xs text-gray-400">대표 영웅 (상대전 Top2)</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-gray-200">
              <span className="text-cyan-300">{a.playerNickname}</span>:{" "}
              <span className="text-gray-300">{heroNamesA || "-"}</span>
            </p>
            <p className="text-sm text-gray-200">
              <span className="text-purple-300">{b.playerNickname}</span>:{" "}
              <span className="text-gray-300">{heroNamesB || "-"}</span>
            </p>
          </div>
        </section>
      </div>

      <details className="mt-4">
        <summary className="text-xs text-gray-400 cursor-pointer select-none">
          점수 구성 보기
        </summary>
        <div className="mt-2 text-xs text-gray-400 grid grid-cols-2 lg:grid-cols-5 gap-2">
          <ScorePill label="횟수" value={card.breakdown.countScore} />
          <ScorePill label="균형" value={card.breakdown.balance} />
          <ScorePill label="최근성" value={card.breakdown.recency} />
          <ScorePill
            label="퍼포먼스(격차↓)"
            value={card.breakdown.performanceCloseness}
          />
          <ScorePill label="raw" value={card.breakdown.rawScore} />
        </div>
      </details>
    </article>
  );
}

function ScorePill(input: { readonly label: string; readonly value: number }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
      <p className="text-[11px] text-gray-500">{input.label}</p>
      <p className="text-sm text-gray-200">{input.value}</p>
    </div>
  );
}


