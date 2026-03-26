"use client";

import type { TeamingPairStatResponse, TeamingPlayerProfileResponse, TeamingWindowStats } from "@/app/api/stats/types";
import { HeroRoles, type HeroRole } from "@/domain/hots/models";
import { useTeamComposerData } from "../../hooks/useTeamComposerData";
import { useMemo, useState } from "react";
import { chooseCombinations } from "@/utils/combination";
import { round } from "es-toolkit";
import { formatStatsYear, useStatsYear } from "../../hooks/useStatsYearFilter";

const ROLE_ORDER = Object.values(HeroRoles);
const ROLE_LABEL: Record<HeroRole, string> = {
  TANKER: "탱커",
  OFFLANER: "투사",
  MAIN_DEALER: "메인딜러",
  SUB_DEALER: "서브딜러",
  HEALER: "힐러",
};

type TeamSuggestion = {
  readonly teamA: string[];
  readonly teamB: string[];
  readonly strategyLabel: string;
  readonly score: number;
  readonly pairPenalty: number;
  readonly rolePenalty: number;
  readonly healerPenalty: number;
  readonly winRatePenalty: number;
};

type TeamPenaltyParts = Omit<TeamSuggestion, "strategyLabel" | "score">;

type Strategy = {
  readonly label: string;
  readonly weights: {
    readonly pair: number;
    readonly role: number;
    readonly healer: number;
    readonly winRate: number;
  };
};

const RECOMMENDATION_STRATEGIES: readonly Strategy[] = [
  {
    label: "추천 1 (같이 안 해본 조합 가중)",
    weights: { pair: 1.9, role: 1.4, healer: 1, winRate: 0.9 },
  },
  {
    label: "추천 2 (승률 밸런스 가중)",
    weights: { pair: 0.9, role: 1.4, healer: 1, winRate: 1.9 },
  },
  {
    label: "추천 3 (포지션 균형 가중)",
    weights: { pair: 0.9, role: 1.9, healer: 1.4, winRate: 0.8 },
  },
];

export function TeamComposerTab() {
  const { data, error } = useTeamComposerData();
  const { selectedYear } = useStatsYear();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[] | null>(null);

  const playerById = useMemo(
    () => new Map(data.players.map((player) => [player.playerId, player] as const)),
    [data.players],
  );

  const pairByKey = useMemo(() => {
    return new Map(data.pairs.map((pair) => [toPairKey(pair.playerAId, pair.playerBId), pair] as const));
  }, [data.pairs]);

  const effectiveSelectedPlayerId = useMemo(() => {
    if (selectedPlayerId && playerById.has(selectedPlayerId)) {
      return selectedPlayerId;
    }
    return data.players[0]?.playerId ?? null;
  }, [data.players, playerById, selectedPlayerId]);

  const effectiveCandidateIds = useMemo(() => {
    const normalized = normalizeCandidateIds(selectedCandidateIds, playerById);
    if (normalized.length > 0) {
      return normalized;
    }

    const defaults = data.defaultCandidateIds.filter((playerId) => playerById.has(playerId));
    if (defaults.length >= 4) {
      return defaults;
    }

    return data.players
      .filter((player) => player.totalMatches > 0)
      .slice(0, 10)
      .map((player) => player.playerId);
  }, [data.defaultCandidateIds, data.players, playerById, selectedCandidateIds]);

  const selectedPlayer = effectiveSelectedPlayerId ? (playerById.get(effectiveSelectedPlayerId) ?? null) : null;

  const teammateRows = useMemo(() => {
    if (!selectedPlayer) return [];

    return data.players
      .filter((player) => player.playerId !== selectedPlayer.playerId)
      .map((other) => {
        const pair = pairByKey.get(toPairKey(selectedPlayer.playerId, other.playerId));
        return {
          other,
          allTime: pair?.allTime ?? emptyWindowStats(),
          recent6: pair?.recent6 ?? emptyWindowStats(),
        };
      })
      .toSorted((a, b) => {
        if (a.recent6.sameTeamRate !== b.recent6.sameTeamRate) {
          return b.recent6.sameTeamRate - a.recent6.sameTeamRate;
        }
        if (a.allTime.sameTeamRate !== b.allTime.sameTeamRate) {
          return b.allTime.sameTeamRate - a.allTime.sameTeamRate;
        }
        return a.other.playerNickname.localeCompare(b.other.playerNickname);
      });
  }, [data.players, pairByKey, selectedPlayer]);

  const suggestions = useMemo(() => {
    if (effectiveCandidateIds.length < 4 || effectiveCandidateIds.length % 2 !== 0) {
      return [];
    }

    const knownCandidates = effectiveCandidateIds.filter((playerId) => playerById.has(playerId));
    if (knownCandidates.length < 4 || knownCandidates.length % 2 !== 0) {
      return [];
    }

    const evaluated = buildTeamSplits(knownCandidates).map((split) =>
      evaluateTeamSplit(split.teamA, split.teamB, playerById, pairByKey),
    );

    const usedSplitKeys = new Set<string>();
    const recommendations: TeamSuggestion[] = [];

    for (const strategy of RECOMMENDATION_STRATEGIES) {
      const ranked = evaluated
        .map((penalty) => ({
          ...penalty,
          strategyLabel: strategy.label,
          score: calculateWeightedScore(penalty, strategy.weights),
        }))
        .toSorted((a, b) => a.score - b.score);

      const picked = ranked.find((candidate) => !usedSplitKeys.has(toSplitKey(candidate.teamA, candidate.teamB)));
      const selected = picked ?? ranked[0];
      if (!selected) continue;

      usedSplitKeys.add(toSplitKey(selected.teamA, selected.teamB));
      recommendations.push(selected);
    }

    return recommendations;
  }, [effectiveCandidateIds, pairByKey, playerById]);

  const isOddSelection = effectiveCandidateIds.length % 2 !== 0;
  const isTooFewSelection = effectiveCandidateIds.length < 4;

  if (error) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-red-400">❌ {error.message}</p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-white/20 bg-black/35 p-5 space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-white">팀 편성 도우미</h3>
        <p className="text-sm text-gray-300">
          {formatStatsYear(selectedYear)} 전체/최근 최대 {data.recentMatchCount}회 기준 동팀 경험과 포지션 성향을 함께
          보며 팀을 맞출 수 있습니다.
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">포지션 성향</h4>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.players
            .filter((player) => player.totalMatches > 0)
            .map((player) => (
              <article key={player.playerId} className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-white">{player.playerNickname}</p>
                  <span className="text-xs text-cyan-200 text-right">
                    주포지션 {player.primaryRole ? ROLE_LABEL[player.primaryRole] : "-"} / 유연성 {player.flexibility}
                    <br />
                    최근승률 {player.recentWinRate.toFixed(1)}% ({player.recentGames}경기)
                  </span>
                </div>
                <div className="space-y-1.5">
                  {player.roleStats.map((roleStat) => (
                    <div key={`${player.playerId}-${roleStat.role}`} className="text-xs text-gray-200">
                      <div className="flex items-center justify-between">
                        <span>{ROLE_LABEL[roleStat.role]}</span>
                        <span>
                          {roleStat.games}회 ({roleStat.rate.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-cyan-400/80"
                          style={{ width: `${Math.min(roleStat.rate, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">동팀 경험 조회</h4>
          <select
            value={effectiveSelectedPlayerId ?? ""}
            onChange={(event) => setSelectedPlayerId(event.target.value)}
            className="rounded-md border border-white/30 bg-black/50 px-3 py-1.5 text-sm text-white outline-none focus:border-cyan-300"
          >
            {data.players.map((player) => (
              <option key={player.playerId} value={player.playerId}>
                {player.playerNickname}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto rounded-lg border border-white/15 bg-white/4">
          <table className="min-w-[780px] w-full text-sm">
            <thead className="bg-white/8 text-gray-300">
              <tr>
                <th className="px-3 py-2 text-left">상대</th>
                <th className="px-3 py-2 text-right">역대 같이 팀</th>
                <th className="px-3 py-2 text-right">역대 비율</th>
                <th className="px-3 py-2 text-right">최근 {data.recentMatchCount} 같이 팀</th>
                <th className="px-3 py-2 text-right">최근 {data.recentMatchCount} 비율</th>
                <th className="px-3 py-2 text-left">상대 주포지션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {teammateRows.map((row) => (
                <tr key={row.other.playerId} className="hover:bg-white/5">
                  <td className="px-3 py-2 font-semibold text-white">{row.other.playerNickname}</td>
                  <td className="px-3 py-2 text-right text-gray-100">
                    {row.allTime.sameTeamMatches}/{row.allTime.encounterMatches}
                  </td>
                  <td className="px-3 py-2 text-right text-cyan-200">{row.allTime.sameTeamRate.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right text-gray-100">
                    {row.recent6.sameTeamMatches}/{row.recent6.encounterMatches}
                  </td>
                  <td className="px-3 py-2 text-right text-amber-200">{row.recent6.sameTeamRate.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-gray-200">
                    {row.other.primaryRole ? ROLE_LABEL[row.other.primaryRole] : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">모의 팀 편성</h4>
        <p className="text-sm text-gray-300">
          같이 많이 안 한 조합을 우선하면서, 힐러/탱커 과밀 배치를 감점해 균형 팀을 제안합니다.
        </p>
        <div className="flex flex-wrap gap-2">
          {data.players
            .filter((player) => player.totalMatches > 0)
            .map((player) => {
              const active = effectiveCandidateIds.includes(player.playerId);
              return (
                <button
                  type="button"
                  key={player.playerId}
                  onClick={() => {
                    setSelectedCandidateIds((current) => {
                      const base = normalizeCandidateIds(current, playerById);
                      if (base.includes(player.playerId)) {
                        return base.filter((id) => id !== player.playerId);
                      }
                      return [...base, player.playerId];
                    });
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "border-cyan-300 bg-cyan-400/20 text-cyan-100"
                      : "border-white/20 bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {player.playerNickname}
                </button>
              );
            })}
        </div>

        <p className="text-sm text-gray-300">선택 인원: {effectiveCandidateIds.length}명</p>

        {isTooFewSelection && <p className="text-amber-300 text-sm">최소 4명 이상 선택해야 모의 편성이 가능합니다.</p>}
        {isOddSelection && <p className="text-amber-300 text-sm">팀을 2개로 나누기 위해 짝수 인원으로 맞춰주세요.</p>}
        {!isTooFewSelection && !isOddSelection && suggestions.length === 0 && (
          <p className="text-amber-300 text-sm">편성 결과를 계산하지 못했습니다. 인원 구성을 다시 선택해 주세요.</p>
        )}

        {suggestions.length > 0 && (
          <div className="grid gap-3 lg:grid-cols-3">
            {suggestions.map((suggestion, index) => (
              <article
                key={`${suggestion.teamA.join("-")}|${suggestion.teamB.join("-")}`}
                className={`rounded-lg border p-3 space-y-2 ${
                  index === 0 ? "border-cyan-300/60 bg-cyan-500/10" : "border-white/15 bg-white/5"
                }`}
              >
                <p className="font-semibold text-white">{suggestion.strategyLabel}</p>
                <div className="text-xs text-gray-300">
                  총점 {suggestion.score.toFixed(2)} / 동팀반복 {suggestion.pairPenalty.toFixed(2)} / 포지션{" "}
                  {suggestion.rolePenalty.toFixed(2)} / 힐러과밀 {suggestion.healerPenalty.toFixed(2)} / 승률밸런스{" "}
                  {suggestion.winRatePenalty.toFixed(2)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-white/10 bg-black/30 p-2">
                    <p className="text-xs text-gray-400 mb-1">Team A</p>
                    <ul className="space-y-1">
                      {suggestion.teamA.map((playerId) => (
                        <li key={playerId} className="text-sm text-white">
                          {renderPlayerBadge(playerById.get(playerId))}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/30 p-2">
                    <p className="text-xs text-gray-400 mb-1">Team B</p>
                    <ul className="space-y-1">
                      {suggestion.teamB.map((playerId) => (
                        <li key={playerId} className="text-sm text-white">
                          {renderPlayerBadge(playerById.get(playerId))}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function normalizeCandidateIds(candidateIds: string[] | null, playerById: Map<string, TeamingPlayerProfileResponse>) {
  if (!candidateIds || candidateIds.length === 0) {
    return [];
  }

  return Array.from(new Set(candidateIds.filter((playerId) => playerById.has(playerId))));
}

function evaluateTeamSplit(
  teamA: string[],
  teamB: string[],
  playerById: Map<string, TeamingPlayerProfileResponse>,
  pairByKey: Map<string, TeamingPairStatResponse>,
): TeamPenaltyParts {
  const pairPenalty = getTeamPairPenalty(teamA, pairByKey) + getTeamPairPenalty(teamB, pairByKey);
  const teamARolePenalty = getRoleBalancePenalty(teamA, playerById);
  const teamBRolePenalty = getRoleBalancePenalty(teamB, playerById);
  const crossRolePenalty = getCrossTeamRoleGapPenalty(teamA, teamB, playerById);
  const rolePenalty = teamARolePenalty + teamBRolePenalty + crossRolePenalty;
  const healerPenalty =
    getHealerConcentrationPenalty(teamA, playerById) + getHealerConcentrationPenalty(teamB, playerById);
  const winRatePenalty = getWinRateBalancePenalty(teamA, teamB, playerById);
  return {
    teamA,
    teamB,
    pairPenalty,
    rolePenalty,
    healerPenalty,
    winRatePenalty,
  };
}

function calculateWeightedScore(
  penalties: TeamPenaltyParts,
  weights: {
    pair: number;
    role: number;
    healer: number;
    winRate: number;
  },
): number {
  return (
    penalties.pairPenalty * weights.pair +
    penalties.rolePenalty * weights.role +
    penalties.healerPenalty * weights.healer +
    penalties.winRatePenalty * weights.winRate
  );
}

function getTeamPairPenalty(team: string[], pairByKey: Map<string, TeamingPairStatResponse>): number {
  let totalPenalty = 0;
  let pairCount = 0;

  for (let i = 0; i < team.length; i += 1) {
    for (let j = i + 1; j < team.length; j += 1) {
      const pair = pairByKey.get(toPairKey(team[i], team[j]));
      if (!pair) continue;

      const allRate = pair.allTime.sameTeamRate / 100;
      const recentRate = pair.recent6.sameTeamRate / 100;
      const allCountScore = Math.min(pair.allTime.sameTeamMatches / 8, 1);
      const recentCountScore = Math.min(pair.recent6.sameTeamMatches / 2, 1);
      totalPenalty += allRate * 0.8 + recentRate * 1.3 + allCountScore * 0.6 + recentCountScore * 0.8;
      pairCount += 1;
    }
  }

  if (pairCount === 0) return 0;
  return totalPenalty / pairCount;
}

function getRoleBalancePenalty(team: string[], playerById: Map<string, TeamingPlayerProfileResponse>): number {
  const roleCounts = new Map<HeroRole, number>();
  for (const playerId of team) {
    const role = playerById.get(playerId)?.primaryRole;
    if (!role) continue;
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }

  let penalty = 0;
  for (const role of ROLE_ORDER) {
    const count = roleCounts.get(role) ?? 0;
    if (count <= 1) continue;

    const overflow = count - 1;
    const weight = role === "HEALER" ? 1.8 : role === "TANKER" ? 1.2 : 0.8;
    penalty += overflow * weight;
  }

  return penalty;
}

function getCrossTeamRoleGapPenalty(
  teamA: string[],
  teamB: string[],
  playerById: Map<string, TeamingPlayerProfileResponse>,
): number {
  const roleCountsA = countPrimaryRoles(teamA, playerById);
  const roleCountsB = countPrimaryRoles(teamB, playerById);

  let penalty = 0;
  for (const role of ROLE_ORDER) {
    const diff = Math.abs((roleCountsA.get(role) ?? 0) - (roleCountsB.get(role) ?? 0));
    const weight = role === "HEALER" ? 1.4 : role === "TANKER" ? 1.1 : 0.7;
    penalty += diff * weight;
  }

  return penalty;
}

function getHealerConcentrationPenalty(team: string[], playerById: Map<string, TeamingPlayerProfileResponse>): number {
  const healers = team
    .map((playerId) => playerById.get(playerId))
    .filter((player): player is TeamingPlayerProfileResponse => player?.primaryRole === "HEALER");

  if (healers.length <= 1) return healers.length === 0 ? 1.5 : 0;

  const inflexibleHealers = healers.filter((healer) => healer.flexibility <= 1).length;
  return (healers.length - 1) * 2.2 + inflexibleHealers * 1.8;
}

function getWinRateBalancePenalty(
  teamA: string[],
  teamB: string[],
  playerById: Map<string, TeamingPlayerProfileResponse>,
): number {
  const avgA = getTeamTrendWinRate(teamA, playerById);
  const avgB = getTeamTrendWinRate(teamB, playerById);
  const averageGapPenalty = Math.abs(avgA - avgB) / 12;

  const hotA = countPlayersByTrend(teamA, playerById, "HOT");
  const hotB = countPlayersByTrend(teamB, playerById, "HOT");
  const coldA = countPlayersByTrend(teamA, playerById, "COLD");
  const coldB = countPlayersByTrend(teamB, playerById, "COLD");
  const distributionPenalty = Math.abs(hotA - hotB) * 0.9 + Math.abs(coldA - coldB) * 0.9;

  return averageGapPenalty + distributionPenalty;
}

function getTeamTrendWinRate(team: string[], playerById: Map<string, TeamingPlayerProfileResponse>): number {
  const players = team
    .map((playerId) => playerById.get(playerId))
    .filter((player): player is TeamingPlayerProfileResponse => Boolean(player));

  if (players.length === 0) return 0;
  const total = players.reduce((sum, player) => sum + getPlayerTrendWinRate(player), 0);
  return total / players.length;
}

function countPlayersByTrend(
  team: string[],
  playerById: Map<string, TeamingPlayerProfileResponse>,
  trend: "HOT" | "COLD",
): number {
  return team
    .map((playerId) => playerById.get(playerId))
    .filter((player): player is TeamingPlayerProfileResponse => Boolean(player))
    .filter((player) => {
      const winRate = getPlayerTrendWinRate(player);
      if (trend === "HOT") return winRate >= 60;
      return winRate <= 40;
    }).length;
}

function getPlayerTrendWinRate(player: TeamingPlayerProfileResponse): number {
  if (player.recentGames >= 2) {
    return player.recentWinRate;
  }
  return player.allTimeWinRate;
}

function countPrimaryRoles(
  team: string[],
  playerById: Map<string, TeamingPlayerProfileResponse>,
): Map<HeroRole, number> {
  const counts = new Map<HeroRole, number>();
  for (const playerId of team) {
    const role = playerById.get(playerId)?.primaryRole;
    if (!role) continue;
    counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  return counts;
}

function buildTeamSplits(playerIds: string[]): Array<{ teamA: string[]; teamB: string[] }> {
  const teamSize = playerIds.length / 2;
  const [fixed, ...rest] = playerIds;

  if (playerIds.length <= 14) {
    const combinations = chooseCombinations(rest, teamSize - 1);
    return combinations.map((combination) => {
      const teamA = [fixed, ...combination];
      const teamASet = new Set(teamA);
      const teamB = playerIds.filter((playerId) => !teamASet.has(playerId));
      return { teamA, teamB };
    });
  }

  const splits: Array<{ teamA: string[]; teamB: string[] }> = [];
  const seen = new Set<string>();
  const maxSample = 4000;

  for (let attempt = 0; attempt < maxSample; attempt += 1) {
    const shuffled = rest.toSorted(() => Math.random() - 0.5);
    const teamA = [fixed, ...shuffled.slice(0, teamSize - 1)].toSorted();
    const teamAKey = teamA.join("|");
    if (seen.has(teamAKey)) continue;

    seen.add(teamAKey);
    const teamASet = new Set(teamA);
    const teamB = playerIds.filter((playerId) => !teamASet.has(playerId));
    splits.push({ teamA, teamB });
  }

  return splits;
}

function emptyWindowStats(): TeamingWindowStats {
  return {
    encounterMatches: 0,
    sameTeamMatches: 0,
    sameTeamRate: 0,
  };
}

function toPairKey(playerAId: string, playerBId: string): string {
  return playerAId < playerBId ? `${playerAId}|${playerBId}` : `${playerBId}|${playerAId}`;
}

function toSplitKey(teamA: string[], teamB: string[]): string {
  return `${teamA.join("|")}__${teamB.join("|")}`;
}

function renderPlayerBadge(player: TeamingPlayerProfileResponse | undefined): string {
  if (!player) return "알 수 없음";
  const roleText = player.primaryRole ? ROLE_LABEL[player.primaryRole] : "-";
  const trendWinRate = getPlayerTrendWinRate(player);
  return `${player.playerName.slice(1)} (${roleText}, 승률 ${round(trendWinRate, 0)}%)`;
}
