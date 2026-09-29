"use client";

import { useEffect, useMemo, useState } from "react";
import { HeroTierTable } from "@/components/HeroTierTable";
import type { HeroRole } from "@/domain/hots/models";
import type { HeroMetaAudience } from "@/domain/hots/service/hero-meta-filters";
import type { HeroMetaGrade, HeroMetaRow } from "@/domain/hots/service/hero-meta-tier";
import type { GameMap } from "@/domain/hots/models/map";
import { Tier1 } from "@/app/stats/components/scrim-stat/tier/Tier1";
import { Tier2 } from "@/app/stats/components/scrim-stat/tier/Tier2";
import { Tier3 } from "@/app/stats/components/scrim-stat/tier/Tier3";
import { Tier4 } from "@/app/stats/components/scrim-stat/tier/Tier4";
import { Tier5 } from "@/app/stats/components/scrim-stat/tier/Tier5";
import { HoneyIcon } from "@/app/stats/components/scrim-stat/tier/HoneyIcon";
import { selectVisibleRows, type VisibleRowsSelection } from "./select-visible-rows";
import { selectHoneyPicks } from "./select-honey-picks";
import { OpTier } from "../stats/components/scrim-stat/tier/OpTier";

interface PageResult {
  readonly status: "ready" | "pending" | "error";
  readonly rows: HeroMetaRow[];
  readonly updatedAt: string | null;
  readonly patch: string | null;
  readonly stale?: boolean;
  readonly maps?: ReadonlyArray<{ readonly id: GameMap; readonly name: string }>;
  readonly map?: GameMap | null;
  readonly error?: string;
}

const ROLES = [
  { value: "ALL", label: "전체 역할" },
  { value: "TANKER", label: "탱커" },
  { value: "OFFLANER", label: "투사" },
  { value: "MAIN_DEALER", label: "메인딜러" },
  { value: "SUB_DEALER", label: "서브딜러" },
  { value: "HEALER", label: "힐러" },
] as const satisfies ReadonlyArray<{ value: "ALL" | HeroRole; label: string }>;

const AUDIENCES = [
  { value: "all", label: "전체" },
  { value: "platinum_plus", label: "상위 티어 (플래티넘 이상)" },
] as const satisfies ReadonlyArray<{ value: HeroMetaAudience; label: string }>;

function FilterSelect({
  label,
  value,
  choices,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly choices: ReadonlyArray<{ value: string; label: string }>;
  readonly onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-300">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-white/20 bg-[#141925] px-3 py-2.5 text-white outline-none focus:border-cyan-300"
      >
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TierBadge({ tier, games }: { readonly tier: HeroMetaGrade | null; readonly games: number }) {
  if (!tier) return <span className="text-xs text-slate-400">{games < 100 ? "표본 부족" : "등급 보류"}</span>;

  if (tier === "S") return <OpTier />;
  if (tier === "A") return <Tier1 />;
  if (tier === "B") return <Tier2 />;
  if (tier === "C") return <Tier3 />;
  if (tier === "D") return <Tier4 />;
  return <Tier5 />;
}

function formatRate(value: number | null): string {
  if (value === null) return "-";
  const rounded = Math.round((value + Number.EPSILON) * 10) / 10;
  return `${rounded.toFixed(1)}%`;
}

export function parsePageResult(status: number, body: unknown): PageResult {
  const value = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  if (status >= 400) {
    throw new Error(typeof value.error === "string" ? value.error : "티어 정보를 불러오지 못했습니다.");
  }

  if (!Array.isArray(value.rows)) throw new Error("티어 정보 형식이 올바르지 않습니다.");
  return value as unknown as PageResult;
}

export function TierPageClient() {
  const [audience, setAudience] = useState<HeroMetaAudience>("all");
  const [selectedMap, setSelectedMap] = useState<"ALL" | GameMap>("ALL");
  const [selection, setSelection] = useState<VisibleRowsSelection>({ role: "ALL", search: "", sort: "tier" });
  const [result, setResult] = useState<PageResult | null>(null);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [availableMaps, setAvailableMaps] = useState<ReadonlyArray<{ readonly id: GameMap; readonly name: string }>>(
    [],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadSnapshot() {
      try {
        const mapQuery = selectedMap === "ALL" ? "" : `&map=${encodeURIComponent(selectedMap)}`;
        const response = await fetch(`/api/tier/heroes?audience=${audience}${mapQuery}`, { signal: controller.signal });
        const body = await response.json();
        const next = parsePageResult(response.status, body);
        if (!controller.signal.aborted) {
          setResult(next);
          setAvailableMaps(next.maps ?? []);
          setResultKey(`${audience}:${selectedMap}`);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({
            status: "error",
            rows: [],
            updatedAt: null,
            patch: null,
            error: error instanceof Error ? error.message : "티어 정보를 불러오지 못했습니다.",
          });
          setResultKey(`${audience}:${selectedMap}`);
        }
      }
    }
    void loadSnapshot();
    return () => controller.abort();
  }, [audience, selectedMap]);

  const currentResult = resultKey === `${audience}:${selectedMap}` ? result : null;
  const loading = currentResult === null;
  const rows = useMemo(() => selectVisibleRows(currentResult?.rows ?? [], selection), [currentResult, selection]);
  const honeyPicks = useMemo(() => selectHoneyPicks(currentResult?.rows ?? []), [currentResult]);

  return (
    <>
      <section className="rounded-xl border border-white/15 bg-white/5 p-4 md:p-6" aria-label="통계 조건">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">통계 조건</h3>
            <p className="mt-1 text-sm text-slate-400">하루 한 번 저장한 폭풍 리그 통계를 표시합니다.</p>
          </div>
        </div>
        <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <FilterSelect
            label="플레이어 리그"
            value={audience}
            onChange={(value) => {
              setSelectedMap("ALL");
              setAudience(value as HeroMetaAudience);
            }}
            choices={AUDIENCES}
          />
          <FilterSelect
            label="맵"
            value={selectedMap}
            onChange={(value) => {
              setSelectedMap(value as "ALL" | GameMap);
            }}
            choices={[
              { value: "ALL", label: "전체 맵" },
              ...availableMaps.map((map) => ({ value: map.id, label: map.name })),
            ]}
          />
        </div>
      </section>

      <section className="space-y-4" aria-label="영웅 티어리스트">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">영웅 티어리스트</h3>
            <p className="mt-1 text-sm text-slate-400">승률 중심 점수로 역할 안에서 비교합니다.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              영웅 검색
              <input
                value={selection.search}
                onChange={(event) => setSelection((current) => ({ ...current, search: event.target.value }))}
                placeholder="영웅 이름"
                className="rounded-lg border border-white/20 bg-[#141925] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
              />
            </label>
            <FilterSelect
              label="정렬"
              value={selection.sort}
              onChange={(value) =>
                setSelection((current) => ({ ...current, sort: value as VisibleRowsSelection["sort"] }))
              }
              choices={[
                { value: "tier", label: "티어별 점수" },
                { value: "win", label: "승률" },
                { value: "pick", label: "픽률" },
              ]}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="역할 선택">
          {ROLES.map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => setSelection((current) => ({ ...current, role: role.value }))}
              aria-pressed={selection.role === role.value}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${selection.role === role.value ? "border-cyan-300/80 bg-cyan-300/20 text-cyan-100" : "border-white/20 bg-white/5 text-gray-200 hover:bg-white/10"}`}
            >
              {role.label}
            </button>
          ))}
        </div>

        {currentResult?.updatedAt && (
          <p className="text-xs text-slate-400">
            패치 {currentResult.patch} · 마지막 갱신{" "}
            {new Date(currentResult.updatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST{" "}
            {currentResult.stale && "· 이전 저장 결과"}
          </p>
        )}
        {loading && (
          <output className="rounded-lg border border-white/15 bg-white/5 p-6 text-center text-slate-300">
            티어 정보를 불러오는 중입니다.
          </output>
        )}
        {!loading && currentResult?.status === "pending" && (
          <output className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-6 text-center text-cyan-100">
            데이터 준비 중입니다. 하루 한 번 통계를 수집합니다.
          </output>
        )}
        {!loading && currentResult?.status === "error" && (
          <output className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-6 text-center text-rose-100">
            {currentResult.error ?? "티어 정보를 불러오지 못했습니다."}
          </output>
        )}
        {!loading && currentResult && currentResult.rows.length > 0 && (
          <>
            {rows.length > 0 ? (
              <HeroTierTable
                showRole={selection.role === "ALL"}
                showGames
                rows={rows.map((row, index) => ({
                  hero: row.hero,
                  rank: index + 1,
                  tier: <TierBadge tier={row.tier} games={row.games} />,
                  accessory: honeyPicks.has(row.hero) ? <HoneyIcon /> : undefined,
                  winRate: row.winRate,
                  win: formatRate(row.winRate),
                  pick: formatRate(row.pickRate),
                  ban: formatRate(row.banRate),
                  games: row.games.toLocaleString("ko-KR"),
                  score: row.tierScore?.toFixed(1) ?? "-",
                  onSelect: () => {},
                }))}
              />
            ) : (
              <p className="rounded-lg border border-white/15 bg-white/5 p-6 text-center text-slate-300">
                검색 조건에 맞는 영웅이 없습니다.
              </p>
            )}
          </>
        )}
        {!loading && currentResult?.status === "ready" && (
          <p className="text-xs text-slate-400">
            🐝 꿀픽: 200경기 이상인 영웅 중 같은 역할에서 보정 승률 상위 30%에 들고 밴율이 중간값 이하일 때 표시합니다.
            밴율 데이터가 없으면 픽률을 대신 비교합니다.
          </p>
        )}
      </section>
    </>
  );
}
