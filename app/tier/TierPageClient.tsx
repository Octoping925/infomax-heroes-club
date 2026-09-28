"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HeroTierTable } from "@/components/HeroTierTable";
import { HERO_CATALOG } from "@/domain/hots/constants";
import type { HeroRole } from "@/domain/hots/models";
import type { HeroMetaAudience } from "@/domain/hots/service/hero-meta-filters";
import type { HeroMetaGrade, HeroMetaRow } from "@/domain/hots/service/hero-meta-tier";
import type { GameMap } from "@/domain/hots/models/map";
import { selectVisibleRows, type VisibleRowsSelection } from "./select-visible-rows";

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

const ROLES: ReadonlyArray<{ value: "ALL" | HeroRole; label: string }> = [
  { value: "ALL", label: "전체 역할" },
  { value: "TANKER", label: "탱커" },
  { value: "OFFLANER", label: "투사" },
  { value: "MAIN_DEALER", label: "메인딜러" },
  { value: "SUB_DEALER", label: "서브딜러" },
  { value: "HEALER", label: "힐러" },
];
const AUDIENCES: ReadonlyArray<{ value: HeroMetaAudience; label: string }> = [
  { value: "all", label: "전체" },
  { value: "platinum_plus", label: "상위 티어 (플래티넘 이상)" },
];

function FilterSelect({ label, value, choices, onChange }: {
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
        {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
      </select>
    </label>
  );
}

function TierBadge({ tier, games }: { readonly tier: HeroMetaGrade | null; readonly games: number }) {
  if (!tier) return <span className="text-xs text-slate-400">{games < 100 ? "표본 부족" : "등급 보류"}</span>;
  const color = {
    S: "border-amber-300/70 bg-amber-300/15 text-amber-100",
    A: "border-cyan-300/70 bg-cyan-300/15 text-cyan-100",
    B: "border-emerald-300/70 bg-emerald-300/15 text-emerald-100",
    C: "border-slate-300/50 bg-slate-300/10 text-slate-100",
    D: "border-rose-300/60 bg-rose-300/10 text-rose-100",
  }[tier];
  return <span className={`inline-flex min-w-9 justify-center rounded-md border px-2 py-1 text-sm font-bold ${color}`} aria-label={`${tier} 티어`}>{tier}</span>;
}

function formatRate(value: number | null): string {
  if (value === null) return "-";
  const rounded = Math.round((value + Number.EPSILON) * 10) / 10;
  return `${rounded.toFixed(1)}%`;
}

export function parsePageResult(status: number, body: unknown): PageResult {
  const value = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  if (status >= 400) throw new Error(typeof value.error === "string" ? value.error : "티어 정보를 불러오지 못했습니다.");
  if (!Array.isArray(value.rows)) throw new Error("티어 정보 형식이 올바르지 않습니다.");
  return value as unknown as PageResult;
}

export function TierPageClient() {
  const [audience, setAudience] = useState<HeroMetaAudience>("all");
  const [selectedMap, setSelectedMap] = useState<"ALL" | GameMap>("ALL");
  const [selection, setSelection] = useState<VisibleRowsSelection>({ role: "ALL", search: "", sort: "tier" });
  const [result, setResult] = useState<PageResult | null>(null);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [availableMaps, setAvailableMaps] = useState<ReadonlyArray<{ readonly id: GameMap; readonly name: string }>>([]);
  const [selectedHero, setSelectedHero] = useState<HeroMetaRow["hero"] | null>(null);

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
          setResult({ status: "error", rows: [], updatedAt: null, patch: null, error: error instanceof Error ? error.message : "티어 정보를 불러오지 못했습니다." });
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
  const detail = rows.find((row) => row.hero === selectedHero) ?? null;
  const mapLabel = selectedMap === "ALL" ? "전체 맵" : availableMaps.find((map) => map.id === selectedMap)?.name ?? "선택 맵";
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-6 md:py-12">
      <section className="space-y-4 border-b border-white/10 pb-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Heroes Profile · Global Meta</p>
        <h2 className="text-3xl font-bold tracking-tight md:text-5xl">{mapLabel} 메타 티어</h2>
        <p className="max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
          전 세계 경기 통계를 바탕으로 영웅의 역할별 상대 등급을 확인하세요. S~D 티어는 Heroes Profile이 제공하는 등급이 아니라 이 사이트가 계산한 결과입니다.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <a href="https://www.heroesprofile.com/Global/Hero" target="_blank" rel="noreferrer" className="text-cyan-200 underline underline-offset-4">Heroes Profile 원본 통계</a>
          <Link href="/stats#scrimStats" className="text-slate-200 underline underline-offset-4">동호회 내전 티어 보기</Link>
        </div>
      </section>

      <section className="rounded-xl border border-white/15 bg-white/5 p-4 md:p-6" aria-label="통계 조건">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><h3 className="text-lg font-bold">통계 조건</h3><p className="mt-1 text-sm text-slate-400">하루 한 번 저장한 폭풍 리그 통계를 표시합니다.</p></div>
          <span className="text-xs text-slate-400">전체 지역 · {mapLabel} · 최신 주요 패치</span>
        </div>
        <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <FilterSelect label="플레이어 리그" value={audience} onChange={(value) => { setSelectedHero(null); setSelectedMap("ALL"); setAudience(value as HeroMetaAudience); }} choices={AUDIENCES} />
          <FilterSelect label="맵" value={selectedMap} onChange={(value) => { setSelectedHero(null); setSelectedMap(value as "ALL" | GameMap); }} choices={[{ value: "ALL", label: "전체 맵" }, ...availableMaps.map((map) => ({ value: map.id, label: map.name }))]} />
        </div>
      </section>

      <section className="space-y-4" aria-label="영웅 티어리스트">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h3 className="text-xl font-bold">영웅 티어리스트</h3><p className="mt-1 text-sm text-slate-400">승률 중심 점수로 역할 안에서 비교합니다.</p></div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-slate-400">영웅 검색<input value={selection.search} onChange={(event) => setSelection((current) => ({ ...current, search: event.target.value }))} placeholder="영웅 이름" className="rounded-lg border border-white/20 bg-[#141925] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300" /></label>
            <FilterSelect label="정렬" value={selection.sort} onChange={(value) => setSelection((current) => ({ ...current, sort: value as VisibleRowsSelection["sort"] }))} choices={[{ value: "tier", label: "티어 점수" }, { value: "win", label: "승률" }, { value: "pick", label: "픽률" }]} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="역할 선택">
          {ROLES.map((role) => <button key={role.value} type="button" onClick={() => setSelection((current) => ({ ...current, role: role.value }))} aria-pressed={selection.role === role.value} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${selection.role === role.value ? "border-cyan-300/80 bg-cyan-300/20 text-cyan-100" : "border-white/20 bg-white/5 text-gray-200 hover:bg-white/10"}`}>{role.label}</button>)}
        </div>

        {currentResult?.updatedAt && <p className="text-xs text-slate-400">패치 {currentResult.patch} · 마지막 갱신 {new Date(currentResult.updatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST {currentResult.stale && "· 이전 저장 결과"}</p>}
        {loading && <p className="rounded-lg border border-white/15 bg-white/5 p-6 text-center text-slate-300" role="status">티어 정보를 불러오는 중입니다.</p>}
        {!loading && currentResult?.status === "pending" && <p className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-6 text-center text-cyan-100" role="status">데이터 준비 중입니다. 하루 한 번 통계를 수집합니다.</p>}
        {!loading && currentResult?.status === "error" && <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-6 text-center text-rose-100" role="alert">{currentResult.error ?? "티어 정보를 불러오지 못했습니다."}</p>}
        {!loading && currentResult && currentResult.rows.length > 0 && <>
          {rows.length > 0 ? <HeroTierTable showRole={selection.role === "ALL"} showGames rows={rows.map((row, index) => ({
            hero: row.hero,
            rank: index + 1,
            tier: <TierBadge tier={row.tier} games={row.games} />,
            winRate: row.winRate,
            win: formatRate(row.winRate),
            pick: formatRate(row.pickRate),
            ban: formatRate(row.banRate),
            games: row.games.toLocaleString("ko-KR"),
            score: row.tierScore?.toFixed(1) ?? "-",
            onSelect: () => setSelectedHero(row.hero),
          }))} /> : <p className="rounded-lg border border-white/15 bg-white/5 p-6 text-center text-slate-300">검색 조건에 맞는 영웅이 없습니다.</p>}
        </>}
      </section>

      {detail && <section className="rounded-xl border border-cyan-400/25 bg-cyan-400/5 p-5" aria-label={`${HERO_CATALOG[detail.hero].nameKo} 상세`}>
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Hero detail</p><h3 className="mt-1 text-xl font-bold">{HERO_CATALOG[detail.hero].nameKo}</h3></div><button type="button" onClick={() => setSelectedHero(null)} className="text-sm text-slate-300 hover:text-white" aria-label="영웅 상세 닫기">닫기</button></div>
        <p className="mt-4 text-sm text-slate-200">{detail.tier ? `${ROLES.find((role) => role.value === detail.role)?.label ?? detail.role} 역할에서 ${detail.tier} 등급입니다.` : detail.games < 100 ? "선택 조건의 경기 수가 100회 미만이어서 등급을 보류했습니다." : "등급 가능한 영웅이 이 역할에 5명 미만이어서 등급을 보류했습니다."}</p>
        <p className="mt-2 text-sm text-slate-400">{detail.games.toLocaleString("ko-KR")}경기 · 승률 {formatRate(detail.winRate)} · 픽률 {formatRate(detail.pickRate)} · 밴율 {formatRate(detail.banRate)} · 점수 {detail.tierScore?.toFixed(1) ?? "-"}</p>
      </section>}

      <section className="border-t border-white/10 pt-6 text-sm leading-7 text-slate-400">
        <h3 className="font-semibold text-slate-200">등급 산정 기준</h3>
        <p>100경기 이상인 영웅을 대상으로 역할별 상대 순위를 계산합니다. 보수적으로 보정한 승률 70%, 픽률 20%, 밴율 10%를 반영하며 밴율이 없는 모드는 남은 지표의 비중을 다시 맞춥니다. 상위 약 10%가 S, 다음 20%가 A, 중간 40%가 B, 다음 20%가 C, 하위 10%가 D입니다.</p>
        <p>이 통계는 Heroes Profile에 수집된 리플레이를 기반으로 합니다. 동호회 내전 기록과 모집단이 다릅니다.</p>
      </section>
    </main>
  );
}
