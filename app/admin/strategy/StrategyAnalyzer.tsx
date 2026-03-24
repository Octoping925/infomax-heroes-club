"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useState } from "react";
import type { PlayerListItem } from "@/app/api/players/route";
import type {
  StrategyHeroRecommendation,
  StrategyMatchupReport,
  StrategyPlayerMatchup,
  StrategyPlayerReport,
  StrategyReportResponse,
  StrategySelectedMapPlan,
  StrategySide,
  StrategyTeamHeroFocus,
  StrategyTeamMapFocus,
  StrategyTeamReport,
  StrategyTeamRoleCoverage,
  StrategyTeamSynergyPair,
} from "./types";
import { HERO_CATALOG, HeroImage, MAP_CATALOG } from "@/domain/hots/constants";
import type { HeroRole, GameMap, Hero } from "@/domain/hots/models";
import Image from "next/image";

const MAX_TEAM_SIZE = 5;
const MAX_SELECTED_MAPS = 5;

const ROLE_LABELS: Record<HeroRole, string> = {
  TANKER: "탱커",
  OFFLANER: "투사",
  MAIN_DEALER: "메인 딜러",
  SUB_DEALER: "서브 딜러",
  HEALER: "힐러",
};

type Props = {
  readonly players: ReadonlyArray<PlayerListItem>;
};

export default function StrategyAnalyzer({ players }: Props) {
  const router = useRouter();
  const [allyNicknames, setAllyNicknames] = useState<string[]>([]);
  const [enemyNicknames, setEnemyNicknames] = useState<string[]>([]);
  const [selectedMaps, setSelectedMaps] = useState<GameMap[]>([]);
  const [allyQuery, setAllyQuery] = useState("");
  const [enemyQuery, setEnemyQuery] = useState("");
  const [mapQuery, setMapQuery] = useState("");
  const [report, setReport] = useState<StrategyReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const deferredAllyQuery = useDeferredValue(allyQuery);
  const deferredEnemyQuery = useDeferredValue(enemyQuery);
  const deferredMapQuery = useDeferredValue(mapQuery);
  const assignedNicknames = new Set([...allyNicknames, ...enemyNicknames]);
  const selectablePlayers = players.filter((player) => !assignedNicknames.has(player.nickname));
  const allyCandidatePlayers = selectablePlayers.filter((player) => matchesPlayerQuery(player, deferredAllyQuery));
  const enemyCandidatePlayers = selectablePlayers.filter((player) => matchesPlayerQuery(player, deferredEnemyQuery));
  const mapOptions = Object.entries(MAP_CATALOG)
    .map(([map, info]) => ({
      value: map as GameMap,
      label: info.nameKo,
    }))
    .filter((item) => !selectedMaps.includes(item.value))
    .filter((item) => matchesMapQuery(item.label, item.value, deferredMapQuery))
    .toSorted((left, right) => left.label.localeCompare(right.label, "ko"));

  const handleAddPlayer = (side: StrategySide, nickname: string) => {
    if (side === "ALLY") {
      if (allyNicknames.length >= MAX_TEAM_SIZE) {
        setError(`우리 팀은 최대 ${MAX_TEAM_SIZE}명까지 선택할 수 있습니다.`);
        return;
      }
      setAllyNicknames((prev) => [...prev, nickname]);
      setAllyQuery("");
    } else {
      if (enemyNicknames.length >= MAX_TEAM_SIZE) {
        setError(`상대 팀은 최대 ${MAX_TEAM_SIZE}명까지 선택할 수 있습니다.`);
        return;
      }
      setEnemyNicknames((prev) => [...prev, nickname]);
      setEnemyQuery("");
    }

    setError(null);
    setReport(null);
  };

  const handleRemovePlayer = (side: StrategySide, nickname: string) => {
    if (side === "ALLY") {
      setAllyNicknames((prev) => prev.filter((value) => value !== nickname));
    } else {
      setEnemyNicknames((prev) => prev.filter((value) => value !== nickname));
    }
    setError(null);
    setReport(null);
  };

  const handleReset = () => {
    setAllyNicknames([]);
    setEnemyNicknames([]);
    setSelectedMaps([]);
    setAllyQuery("");
    setEnemyQuery("");
    setMapQuery("");
    setError(null);
    setReport(null);
  };

  const handleSwap = () => {
    setAllyNicknames(enemyNicknames);
    setEnemyNicknames(allyNicknames);
    setError(null);
    setReport(null);
  };

  const handleAddMap = (map: GameMap) => {
    if (selectedMaps.length >= MAX_SELECTED_MAPS) {
      setError(`맵은 최대 ${MAX_SELECTED_MAPS}개까지 선택할 수 있습니다.`);
      return;
    }

    setSelectedMaps((prev) => [...prev, map]);
    setMapQuery("");
    setError(null);
    setReport(null);
  };

  const handleRemoveMap = (map: GameMap) => {
    setSelectedMaps((prev) => prev.filter((value) => value !== map));
    setError(null);
    setReport(null);
  };

  const handleGenerateReport = async () => {
    if (allyNicknames.length === 0 || enemyNicknames.length === 0 || selectedMaps.length === 0) {
      setError("우리 팀, 상대 팀, 분석할 맵을 모두 선택해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/strategy-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          allyNicknames,
          enemyNicknames,
          selectedMaps,
        }),
      });

      const data = (await response.json().catch(() => null)) as StrategyReportResponse | { error?: string } | null;
      if (!response.ok) {
        throw new Error(
          data && "error" in data ? (data.error ?? "리포트 생성에 실패했습니다.") : "리포트 생성에 실패했습니다.",
        );
      }

      setReport(data as StrategyReportResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : "리포트 생성에 실패했습니다.";
      setError(message);
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await fetch("/api/admin/session", {
        method: "DELETE",
      });
    } finally {
      router.replace("/admin/login");
      router.refresh();
      setIsLoggingOut(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07111c] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.12),transparent_26%),linear-gradient(180deg,#07111c_0%,#091624_52%,#050912_100%)]" />
      <div className="relative mx-auto px-6 py-8">
        <header className="mb-8 overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-[0_24px_120px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
          <div className="grid gap-8 px-8 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="space-y-5">
              <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100">
                Admin Strategy
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-black leading-tight md:text-5xl">내전 전략 분석 리포트</h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                  우리 팀과 상대 팀 멤버를 넣으면, 누가 어떤 맵과 영웅에서 강했는지, 최근 폼이 어떤지, 어떤 영웅을 먼저
                  밴해야 하는지까지 한 화면에서 확인할 수 있습니다.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <HeaderPill text="공개 네비 미노출" />
                <HeaderPill text="비밀번호 쿠키 보호" />
                <HeaderPill text="맵별 밴/픽 제안" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminLink href="/admin/match" label="경기 입력" />
                <AdminLink href="/admin/match/bans" label="밴 입력" />
                <AdminLink href="/admin/match/stats" label="전적 입력" />
                <AdminLink href="/admin/match/talents" label="특성 입력" />
              </div>

              <div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-black/20 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-white">세션 관리</p>
                  <p className="text-xs text-slate-400">현재 브라우저에 관리자 세션 쿠키가 저장되어 있습니다.</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/20 disabled:opacity-50"
                >
                  {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-8 grid gap-6">
          <div className="space-y-6 rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-200/80">Roster Setup</p>
                <h2 className="mt-2 text-2xl font-bold text-white">로스터 선택</h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  팀 뒤집기
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  초기화
                </button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <RosterPanel
                side="ALLY"
                title="우리 팀"
                subtitle="권장 5인"
                nicknames={allyNicknames}
                query={allyQuery}
                candidates={allyCandidatePlayers}
                onQueryChange={setAllyQuery}
                onPick={(nickname) => handleAddPlayer("ALLY", nickname)}
                onRemove={(nickname) => handleRemovePlayer("ALLY", nickname)}
              />
              <RosterPanel
                side="ENEMY"
                title="상대 팀"
                subtitle="권장 5인"
                nicknames={enemyNicknames}
                query={enemyQuery}
                candidates={enemyCandidatePlayers}
                onQueryChange={setEnemyQuery}
                onPick={(nickname) => handleAddPlayer("ENEMY", nickname)}
                onRemove={(nickname) => handleRemovePlayer("ENEMY", nickname)}
              />
            </div>

            <MapSelectionPanel
              selectedMaps={selectedMaps}
              query={mapQuery}
              options={mapOptions}
              onQueryChange={setMapQuery}
              onPick={handleAddMap}
              onRemove={handleRemoveMap}
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={isLoading}
                className="rounded-2xl bg-linear-to-r from-cyan-300 via-sky-400 to-blue-600 px-6 py-3 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "리포트 생성 중..." : "전략 리포트 생성"}
              </button>
              <p className="text-sm text-slate-400">
                선택된 로스터: 우리 팀 {allyNicknames.length}명 / 상대 팀 {enemyNicknames.length}명 / 맵{" "}
                {selectedMaps.length}개
              </p>
            </div>

            {error && (
              <div className="rounded-[24px] border border-rose-400/30 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
                {error}
              </div>
            )}
          </div>
        </section>

        {report ? (
          <div className="space-y-8">
            <section className="grid gap-6">
              <MatchupHeadline report={report.matchup} generatedAt={report.generatedAt} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.5fr_0.5fr]">
              <SelectedMapPlanBoard plans={report.matchup.selectedMapPlans} />
              <PlayerMatchupCard rows={report.matchup.playerMatchups} />
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <TeamReportColumn title="우리 팀 분석" tone="ally" team={report.allyTeam} />
              <TeamReportColumn title="상대 팀 분석" tone="enemy" team={report.enemyTeam} />
            </section>
          </div>
        ) : (
          <section className="rounded-[32px] border border-dashed border-white/10 bg-white/5 px-8 py-16 text-center backdrop-blur-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-300/70">Report Pending</p>
            <h2 className="mt-3 text-3xl font-bold text-white">
              로스터와 맵을 선택하면 분석 리포트가 여기에 표시됩니다.
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-400">
              같은 사람이 양쪽 팀에 들어가지 않도록 구성하고 분석할 맵을 최대 5개 고른 뒤 리포트를 생성하세요. 맵별
              밴/픽 제안, 맞상대 요약, 팀 시너지, 개별 플레이어 강점이 순서대로 정리됩니다.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

function HeaderPill({ text }: { text: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium text-slate-200">
      {text}
    </span>
  );
}

function AdminLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
    >
      {label}
    </Link>
  );
}

function RosterPanel({
  side,
  title,
  subtitle,
  nicknames,
  query,
  candidates,
  onQueryChange,
  onPick,
  onRemove,
}: {
  readonly side: StrategySide;
  readonly title: string;
  readonly subtitle: string;
  readonly nicknames: ReadonlyArray<string>;
  readonly query: string;
  readonly candidates: ReadonlyArray<PlayerListItem>;
  readonly onQueryChange: (value: string) => void;
  readonly onPick: (nickname: string) => void;
  readonly onRemove: (nickname: string) => void;
}) {
  const isFull = nicknames.length >= MAX_TEAM_SIZE;
  const tone =
    side === "ALLY"
      ? {
          panel: "from-cyan-400/12 to-sky-500/8 border-cyan-300/20",
          chip: "border-cyan-300/20 bg-cyan-400/10 text-cyan-50",
          input: "border-cyan-300/20 bg-cyan-400/6 text-cyan-50 placeholder:text-cyan-100/45 focus:border-cyan-200/40",
          candidate: "border-cyan-300/16 bg-cyan-400/8 hover:border-cyan-200/35 hover:bg-cyan-400/14",
          meta: "text-cyan-100/60",
        }
      : {
          panel: "from-rose-400/10 to-orange-400/10 border-orange-200/20",
          chip: "border-orange-300/20 bg-orange-400/10 text-orange-50",
          input:
            "border-orange-300/20 bg-orange-400/6 text-orange-50 placeholder:text-orange-100/45 focus:border-orange-200/40",
          candidate: "border-orange-300/16 bg-orange-400/8 hover:border-orange-200/35 hover:bg-orange-400/14",
          meta: "text-orange-100/60",
        };

  return (
    <div className={`rounded-[28px] border bg-linear-to-br p-5 ${tone.panel}`}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-white">{title}</p>
          <p className="text-xs text-slate-300">{subtitle}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-200">
          {nicknames.length}/{MAX_TEAM_SIZE}
        </span>
      </div>

      <div className="mb-4 min-h-24 rounded-2xl border border-white/10 bg-black/15 p-3">
        {nicknames.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {nicknames.map((nickname) => (
              <button
                key={nickname}
                type="button"
                onClick={() => onRemove(nickname)}
                className={`rounded-full border px-3 py-2 text-sm font-medium transition hover:brightness-110 cursor-pointer ${tone.chip}`}
              >
                {nickname}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-400">
            아직 선택된 멤버가 없습니다. 아래 검색창에서 바로 골라 추가하세요.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="닉네임 또는 이름 검색"
          className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${tone.input}`}
        />

        {isFull ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-300">
            팀 정원이 찼습니다. 칩을 눌러 기존 멤버를 제거하면 다시 선택할 수 있습니다.
          </div>
        ) : candidates.length > 0 ? (
          <div className="grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {candidates.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => onPick(player.nickname)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${tone.candidate}`}
              >
                <p className="text-sm font-semibold text-white">{player.nickname}</p>
                <p className={`mt-1 text-xs ${tone.meta}`}>{player.name}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-4 text-sm text-slate-400">
            {query.trim().length > 0 ? "검색 결과가 없습니다." : "선택 가능한 플레이어가 없습니다."}
          </div>
        )}
      </div>
    </div>
  );
}

function MapSelectionPanel({
  selectedMaps,
  query,
  options,
  onQueryChange,
  onPick,
  onRemove,
}: {
  readonly selectedMaps: ReadonlyArray<GameMap>;
  readonly query: string;
  readonly options: ReadonlyArray<{ value: GameMap; label: string }>;
  readonly onQueryChange: (value: string) => void;
  readonly onPick: (map: GameMap) => void;
  readonly onRemove: (map: GameMap) => void;
}) {
  const isFull = selectedMaps.length >= MAX_SELECTED_MAPS;

  return (
    <div className="rounded-[28px] border border-white/10 bg-linear-to-br from-violet-400/10 to-fuchsia-500/8 p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-white">분석할 맵</p>
          <p className="text-xs text-slate-300">최대 5개까지 선택해서 맵별 밴/픽 제안을 생성합니다.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-200">
          {selectedMaps.length}/{MAX_SELECTED_MAPS}
        </span>
      </div>

      <div className="mb-4 min-h-24 rounded-2xl border border-white/10 bg-black/15 p-3">
        {selectedMaps.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedMaps.map((map) => (
              <button
                key={map}
                type="button"
                onClick={() => onRemove(map)}
                className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-2 text-sm font-medium text-violet-50 transition hover:brightness-110"
              >
                {getMapName(map)}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-400">
            아직 선택된 맵이 없습니다. 아래에서 원하는 맵을 바로 눌러 추가하세요.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="맵 이름 검색"
          className="w-full rounded-2xl border border-violet-300/20 bg-violet-400/6 px-4 py-3 text-sm text-violet-50 outline-none transition placeholder:text-violet-100/45 focus:border-violet-200/40"
        />

        {isFull ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-300">
            맵 선택이 가득 찼습니다. 선택된 맵 칩을 눌러 제거하면 다시 고를 수 있습니다.
          </div>
        ) : options.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onPick(option.value)}
                className="rounded-2xl border border-violet-300/16 bg-violet-400/8 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-violet-200/35 hover:bg-violet-400/14"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-4 text-sm text-slate-400">
            {query.trim().length > 0 ? "검색 결과가 없습니다." : "선택 가능한 맵이 없습니다."}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchupHeadline({ report, generatedAt }: { report: StrategyMatchupReport; generatedAt: string }) {
  return (
    <div className="rounded-[32px] border border-white/10 bg-linear-to-br from-slate-900/95 to-slate-950/95 p-6 shadow-[0_24px_120px_rgba(0,0,0,0.2)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-200/80">Matchup Core</p>
          <h2 className="mt-2 text-3xl font-bold text-white">매치업 핵심 요약</h2>
        </div>
        <p className="text-xs text-slate-400">{formatDateTime(generatedAt)} 생성</p>
      </div>

      <div className="mt-6 grid gap-4">
        <MetricBox
          label="로스터 맞대결"
          value={`${report.enteredRosterStats.wins}-${report.enteredRosterStats.losses}-${report.enteredRosterStats.draws}`}
          sub={`${report.enteredRosterMatchCount}매치`}
        />
        <MetricBox label="승률" value={`${report.enteredRosterStats.winRate}%`} sub="우리 팀 기준" />
      </div>

      <ul className="mt-6 list-disc list-inside space-y-3">
        {report.summaryLines.map((line) => (
          <li key={line} className="text-sm leading-6 text-slate-200">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetricBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function SelectedMapPlanBoard({ plans }: { plans: ReadonlyArray<StrategySelectedMapPlan> }) {
  return (
    <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-200/80">Map Draft Plans</p>
      <h3 className="mt-2 text-2xl font-bold text-white">선택 맵별 밴/픽 제안</h3>
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {plans.length > 0 ? (
          plans.map((plan) => (
            <div key={plan.map} className="rounded-[28px] border border-white/10 bg-black/15 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-bold text-white">{getMapName(plan.map)}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    우리 팀 {plan.allyAverageWinRate}% / 상대 {plan.enemyAverageWinRate}%
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100">
                  {plan.edge > 0 ? `+${plan.edge}` : plan.edge}%p
                </span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <RecommendationList
                  title="추천 픽"
                  accent="cyan"
                  items={plan.recommendedPicks}
                  emptyText="픽 추천 표본이 없습니다."
                />
                <RecommendationList
                  title="우선 밴"
                  accent="rose"
                  items={plan.recommendedBans}
                  emptyText="밴 추천 표본이 없습니다."
                />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <MiniInfo
                  title="우리 팀 핵심"
                  description={plan.allyStandouts.length > 0 ? plan.allyStandouts.join(", ") : "표본 부족"}
                />
                <MiniInfo
                  title="상대 팀 핵심"
                  description={plan.enemyStandouts.length > 0 ? plan.enemyStandouts.join(", ") : "표본 부족"}
                />
              </div>

              <ul className="mt-4 list-disc list-inside space-y-2">
                {plan.summaryLines.map((line) => (
                  <li key={`${plan.map}-${line}`} className="text-sm leading-6 text-slate-300">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <EmptyList text="선택한 맵 플랜이 없습니다." />
        )}
      </div>
    </div>
  );
}

function RecommendationList({
  title,
  accent,
  items,
  emptyText,
}: {
  readonly title: string;
  readonly accent: "cyan" | "rose";
  readonly items: ReadonlyArray<StrategyHeroRecommendation>;
  readonly emptyText: string;
}) {
  const palette =
    accent === "cyan"
      ? "border-cyan-300/20 bg-cyan-400/10 text-cyan-50"
      : "border-rose-300/20 bg-rose-400/10 text-rose-50";

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <p className="mb-3 text-sm font-semibold text-white">{title}</p>
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={`${title}-${item.hero}`} className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <HeroIcon hero={item.hero} />
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${palette}`}>
                  {item.source === "MAP" ? "맵 표본" : "통산 보정"}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">{item.reason}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyList text={emptyText} />
      )}
    </div>
  );
}

function MiniInfo({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-sm leading-5 text-slate-400">{description}</p>
    </div>
  );
}

function PlayerMatchupCard({ rows }: { rows: ReadonlyArray<StrategyPlayerMatchup> }) {
  return (
    <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-200/80">Player Matchups</p>
      <h3 className="mt-2 text-2xl font-bold text-white">많이 붙는 개인 상성</h3>
      <div className="mt-5 space-y-3">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div
              key={`${row.allyNickname}-${row.enemyNickname}`}
              className="rounded-[24px] border border-white/10 bg-black/15 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-base font-semibold text-white">
                  {row.allyNickname} vs {row.enemyNickname}
                </p>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                {row.allyWins}승 {row.enemyWins}패 {row.draws}무 · 승률 {row.allyWinRate}%
              </p>
            </div>
          ))
        ) : (
          <EmptyList text="선택한 로스터끼리 겹친 개인 맞상대 표본이 없습니다." />
        )}
      </div>
    </div>
  );
}

function TeamReportColumn({
  title,
  tone,
  team,
}: {
  readonly title: string;
  readonly tone: "ally" | "enemy";
  readonly team: StrategyTeamReport;
}) {
  const palette =
    tone === "ally"
      ? "border-cyan-300/20 bg-linear-to-br from-cyan-400/10 to-sky-500/6"
      : "border-orange-300/20 bg-linear-to-br from-orange-400/10 to-rose-500/6";

  return (
    <div className={`rounded-[32px] border p-6 backdrop-blur-xl ${palette}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-200/80">{title}</p>
          <h3 className="mt-2 text-3xl font-bold text-white">{tone === "ally" ? "ALLY" : "ENEMY"} TEAM</h3>
        </div>
        <div className="grid gap-2 text-right">
          <span className="text-xs text-slate-400">통산 평균 승률 {team.averageOverallWinRate}%</span>
          <span className="text-xs text-slate-400">최근 평균 승률 {team.averageRecentWinRate}%</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <InsightPanel title="팀 요약">
          <SimpleTextList lines={team.summaryLines} />
        </InsightPanel>
        <InsightPanel title="포지션 커버">
          <RoleCoverageList rows={team.roleCoverage} />
        </InsightPanel>
        <InsightPanel title="선호 맵">
          <MapFocusList rows={team.preferredMaps} />
        </InsightPanel>
        <InsightPanel title="비선호 맵">
          <MapFocusList rows={team.weakMaps} />
        </InsightPanel>
        <InsightPanel title="팀 시그니처 영웅">
          <HeroFocusList rows={team.signatureHeroes} />
        </InsightPanel>
        <InsightPanel title="팀 시너지">
          <SynergyList rows={team.synergyPairs} />
        </InsightPanel>
      </div>

      <div className="mt-8 space-y-4">
        {team.roster.map((player) => (
          <PlayerCard key={player.playerId} player={player} tone={tone} />
        ))}
      </div>
    </div>
  );
}

function InsightPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/15 p-4">
      <p className="mb-3 text-sm font-semibold text-white">{title}</p>
      {children}
    </div>
  );
}

function SimpleTextList({ lines }: { lines: ReadonlyArray<string> }) {
  return lines.length > 0 ? (
    <ul className="list-disc list-inside space-y-2">
      {lines.map((line) => (
        <li key={line} className="text-sm leading-6 text-slate-300">
          {line}
        </li>
      ))}
    </ul>
  ) : (
    <EmptyList text="요약할 데이터가 없습니다." />
  );
}

function RoleCoverageList({ rows }: { rows: ReadonlyArray<StrategyTeamRoleCoverage> }) {
  return rows.length > 0 ? (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.role} className="flex items-center leading-6 text-slate-300">
          {getRoleLabel(row.role)} ·
          <span className="ml-2 text-slate-400">
            {row.specialists.length > 0 ? row.specialists.join(", ") : "없음"}
          </span>
        </li>
      ))}
    </ul>
  ) : (
    <EmptyList text="포지션 데이터가 없습니다." />
  );
}

function MapFocusList({ rows }: { rows: ReadonlyArray<StrategyTeamMapFocus> }) {
  return rows.length > 0 ? (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.map} className="text-sm leading-6 text-slate-300">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-white">{getMapName(row.map)}</p>
            <span className="text-sm text-slate-300">{row.averageWinRate}%</span>
          </div>
        </li>
      ))}
    </ul>
  ) : (
    <EmptyList text="맵 표본이 충분하지 않습니다." />
  );
}

function HeroFocusList({ rows }: { rows: ReadonlyArray<StrategyTeamHeroFocus> }) {
  return rows.length > 0 ? (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.hero} className="text-sm leading-6 text-slate-300">
          <div className="flex items-center justify-between gap-3">
            <HeroIcon hero={row.hero} />
            <span className="text-sm text-slate-300">{row.averageWinRate}%</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {row.playerNicknames.join(", ")} · 총 {row.totalGames}경기
          </p>
        </li>
      ))}
    </ul>
  ) : (
    <EmptyList text="팀 시그니처 영웅 데이터가 없습니다." />
  );
}

function SynergyList({ rows }: { rows: ReadonlyArray<StrategyTeamSynergyPair> }) {
  return rows.length > 0 ? (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={`${row.playerA}-${row.playerB}`} className="text-sm leading-6 text-slate-300">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-white">
              {row.playerA} - {row.playerB}
            </p>
            <span className="text-sm text-slate-300">{row.sameTeamWinRate}%</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            같은 팀 {row.sameTeamMatches}회 / 함께 나온 매치 {row.encounterMatches}회
          </p>
        </li>
      ))}
    </ul>
  ) : (
    <EmptyList text="시너지 표본이 없습니다." />
  );
}

function PlayerCard({ player, tone }: { player: StrategyPlayerReport; tone: "ally" | "enemy" }) {
  const palette =
    tone === "ally"
      ? "border-cyan-300/16 bg-linear-to-br from-[#102131] to-[#0c1825]"
      : "border-orange-300/16 bg-linear-to-br from-[#23150f] to-[#170f0b]";

  return (
    <article className={`rounded-[28px] border p-5 ${palette}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-2xl font-bold text-white">{player.playerNickname}</div>
        <div className="flex flex-wrap gap-2">
          <StatBadge label="통산" value={`${player.overallStats.winRate}%`} />
          <StatBadge label="최근" value={`${player.recentStats.winRate}%`} />
          <StatBadge label="주 역할" value={player.primaryRole ? getRoleLabel(player.primaryRole) : "-"} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <PlayerListBlock title="시그니처 영웅">
          {player.signatureHeroes.length > 0 ? (
            player.signatureHeroes.map((hero) => (
              <div
                key={`${player.playerId}-${hero.hero}`}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
              >
                <HeroIcon hero={hero.hero} />
                <p className="mt-1 text-xs text-slate-400">{`${hero.totalGames}경기 · ${hero.winRate}% · 평균 DPM ${hero.averageDpm}`}</p>
              </div>
            ))
          ) : (
            <EmptyList text="영웅 표본이 없습니다." />
          )}
        </PlayerListBlock>

        <PlayerListBlock title="강한 맵 / 약한 맵">
          {player.strongMaps.length > 0 ? (
            <>
              {player.strongMaps.map((map) => (
                <PlayerLine
                  key={`${player.playerId}-strong-${map.map}`}
                  title={`강: ${getMapName(map.map)}`}
                  meta={`${map.totalGames}경기 · ${map.winRate}%`}
                />
              ))}
              {player.weakMaps.map((map) => (
                <PlayerLine
                  key={`${player.playerId}-weak-${map.map}`}
                  title={`약: ${getMapName(map.map)}`}
                  meta={`${map.totalGames}경기 · ${map.winRate}%`}
                />
              ))}
            </>
          ) : (
            <EmptyList text="맵 표본이 없습니다." />
          )}
        </PlayerListBlock>

        <PlayerListBlock title="최근 5경기">
          {player.recentGames.length > 0 ? (
            player.recentGames.map((game) => (
              <PlayerLine
                key={`${player.playerId}-${game.gameId}`}
                title={`${getMapName(game.map)}`}
                meta={`${getHeroName(game.hero)} · ${getResultLabel(game.result)}`}
              />
            ))
          ) : (
            <EmptyList text="최근 경기 데이터가 없습니다." />
          )}
        </PlayerListBlock>
      </div>
    </article>
  );
}

function PlayerListBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/15 p-4">
      <p className="mb-3 text-sm font-semibold text-white">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function PlayerLine({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{meta}</p>
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
      <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function EmptyList({ text }: { text: string }) {
  return <p className="text-sm leading-6 text-slate-400">{text}</p>;
}

function matchesPlayerQuery(player: PlayerListItem, query: string): boolean {
  return matchesQuery([player.nickname, player.name], query);
}

function matchesMapQuery(label: string, value: GameMap, query: string): boolean {
  return matchesQuery([label, value], query);
}

function matchesQuery(targets: ReadonlyArray<string>, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  return targets.some((target) => normalizeSearchText(target).includes(normalizedQuery));
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "").trim();
}

function getRoleLabel(role: HeroRole): string {
  return ROLE_LABELS[role] ?? role;
}

function getMapName(map: GameMap): string {
  return MAP_CATALOG[map]?.nameKo ?? map;
}

function getHeroName(hero: Hero): string {
  return HERO_CATALOG[hero]?.nameKo ?? hero;
}

function getResultLabel(result: string): string {
  if (result === "WIN") return "승";
  if (result === "LOSE") return "패";
  return "무";
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function HeroIcon({ hero }: { hero: Hero }) {
  return (
    <div className="flex items-center gap-2">
      <Image src={HeroImage[hero]} alt={hero} width={24} height={24} />
      <p className="text-sm font-medium text-white">{getHeroName(hero)}</p>
    </div>
  );
}
