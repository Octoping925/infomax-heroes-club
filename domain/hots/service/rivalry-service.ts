import type {
  RivalryCardResponse,
  RivalryLabel,
  RivalryListResponse,
  RivalryRecentResult,
  RivalryScoreBreakdown,
  RivalrySide,
} from "@/app/api/stats/types";
import { fetchPlayerMap } from "@/app/api/stats/utils/player";
import { buildPlayedAtYearFilter } from "@/app/api/stats/utils/query";
import type { PrismaClient } from "@/generated/prisma/client";
import { clamp, round, sum, sumBy } from "es-toolkit";
import { Hero } from "@domain/hots/models";

type PlayerInfo = {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
};

type H2HMatch = {
  readonly matchId: string;
  readonly playedAt: Date;
  readonly resultForA: "WIN" | "LOSE" | "DRAW";
};

type PairAccumulator = {
  readonly id: string; // `${aId}:${bId}`
  readonly a: PlayerInfo;
  readonly b: PlayerInfo;
  matches: H2HMatch[];
  winsA: number;
  winsB: number;
  draws: number;
  heroCountsA: Map<Hero, number>;
  heroCountsB: Map<Hero, number>;
  perfSamples: {
    kdaGapSumNorm: number;
    kdaSamples: number;
    dmgShareGapSumNorm: number;
    dmgShareSamples: number;
  };
};

type OverallWinRate = {
  /** 0 ~ 1 (draw 제외) */
  readonly winRate: number;
  readonly decisions: number;
};

export type FetchRivalriesParams = {
  readonly minMatches: number;
  readonly limit: number;
  /** 최신 match N개만 고려 (집계 비용 보호) */
  readonly takeMatches: number;
  readonly includeInsufficientSample: boolean;
  readonly year?: number;
};

const DEFAULT_PARAMS: FetchRivalriesParams = {
  minMatches: 3,
  limit: 30,
  takeMatches: 500,
  includeInsufficientSample: false,
};

const MAX_TAKE_MATCHES = 2000;
const MAX_LIMIT = 200;

export function normalizeFetchRivalriesParams(input: Partial<FetchRivalriesParams>): FetchRivalriesParams {
  const minMatches = clamp(input.minMatches ?? DEFAULT_PARAMS.minMatches, 1, 50);
  const limit = clamp(input.limit ?? DEFAULT_PARAMS.limit, 1, MAX_LIMIT);
  const takeMatches = clamp(input.takeMatches ?? DEFAULT_PARAMS.takeMatches, 1, MAX_TAKE_MATCHES);
  const includeInsufficientSample = input.includeInsufficientSample ?? DEFAULT_PARAMS.includeInsufficientSample;
  return { minMatches, limit, takeMatches, includeInsufficientSample, year: input.year };
}

/**
 * 라이벌리 카드 목록을 생성합니다.
 *
 * 정의:
 * - 같은 match에서 A와 B가 서로 다른 GameTeam(실제론 MatchTeam teamNumber로 충분) 이면 A vs B 맞대결 1회
 * - 집계 단위는 match(내전 1건) 입니다.
 */
export async function fetchRivalries(prisma: PrismaClient, params: FetchRivalriesParams): Promise<RivalryListResponse> {
  const normalizedParams = normalizeFetchRivalriesParams(params);
  const playedAt = buildPlayedAtYearFilter(normalizedParams.year);
  const playerMap = await fetchPlayerMap();

  const [matches, overallWinRateByPlayerId] = await Promise.all([
    prisma.match.findMany({
      where: playedAt
        ? {
            playedAt,
          }
        : undefined,
      orderBy: { playedAt: "desc" },
      take: normalizedParams.takeMatches,
      select: {
        id: true,
        playedAt: true,
        winnerTeamNumber: true,
        teams: {
          select: {
            teamNumber: true,
            members: {
              select: {
                playerId: true,
              },
            },
          },
        },
        games: {
          select: {
            teams: {
              select: {
                teamNumber: true,
                members: {
                  select: {
                    playerId: true,
                    hero: true,
                    kills: true,
                    deaths: true,
                    takedowns: true,
                    heroDamage: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    fetchOverallMatchWinRateByPlayerId(prisma, normalizedParams.year),
  ]);

  const pairMap = new Map<string, PairAccumulator>();

  for (const match of matches) {
    const teamPlayers: Record<number, PlayerInfo[]> = { 1: [], 2: [] };
    for (const team of match.teams) {
      for (const member of team.members) {
        teamPlayers[team.teamNumber].push({
          playerId: member.playerId,
          playerName: playerMap.get(member.playerId)!.name,
          playerNickname: playerMap.get(member.playerId)!.nickname,
        });
      }
    }

    // 팀 구성 누락/이상치 방어
    if (teamPlayers[1].length === 0 || teamPlayers[2].length === 0) {
      continue;
    }

    const teamNumberByPlayerId = new Map<string, 1 | 2>();
    for (const p of teamPlayers[1]) teamNumberByPlayerId.set(p.playerId, 1);
    for (const p of teamPlayers[2]) teamNumberByPlayerId.set(p.playerId, 2);

    // match 단위 맞대결: team1 × team2 모든 페어 1회씩
    for (const p1 of teamPlayers[1]) {
      for (const p2 of teamPlayers[2]) {
        const { a, b } = sortPair(p1, p2);
        const pairId = `${a.playerId}:${b.playerId}`;
        const acc = pairMap.get(pairId) ?? createPairAccumulator(pairId, a, b);

        const resultForA = toResultForA(match.winnerTeamNumber, teamNumberByPlayerId.get(a.playerId) ?? null);

        acc.matches.push({
          matchId: match.id,
          playedAt: match.playedAt,
          resultForA,
        });

        updateWinLossCounts(acc, resultForA);
        updateHeroCountsAndPerformance(acc, match.games, a.playerId, b.playerId);

        pairMap.set(pairId, acc);
      }
    }
  }

  const cards: RivalryCardResponse[] = Array.from(pairMap.values(), (acc) =>
    buildRivalryCard(acc, overallWinRateByPlayerId),
  )
    .filter((card) => {
      if (normalizedParams.includeInsufficientSample) return true;
      return card.breakdown.matchesCount >= normalizedParams.minMatches;
    })
    .sort((a, b) => b.score - a.score || b.breakdown.matchesCount - a.breakdown.matchesCount)
    .slice(0, normalizedParams.limit);

  return {
    generatedAt: new Date().toISOString(),
    params: normalizedParams,
    hottest: cards.length > 0 ? cards[0] : null,
    items: cards,
  };
}

function createPairAccumulator(id: string, a: PlayerInfo, b: PlayerInfo): PairAccumulator {
  return {
    id,
    a,
    b,
    matches: [],
    winsA: 0,
    winsB: 0,
    draws: 0,
    heroCountsA: new Map(),
    heroCountsB: new Map(),
    perfSamples: {
      kdaGapSumNorm: 0,
      kdaSamples: 0,
      dmgShareGapSumNorm: 0,
      dmgShareSamples: 0,
    },
  };
}

function updateWinLossCounts(acc: PairAccumulator, resultForA: "WIN" | "LOSE" | "DRAW") {
  if (resultForA === "DRAW") {
    acc.draws += 1;
    return;
  }
  if (resultForA === "WIN") {
    acc.winsA += 1;
    return;
  }
  acc.winsB += 1;
}

function updateHeroCountsAndPerformance(
  acc: PairAccumulator,
  matchGames: {
    teams: {
      teamNumber: number;
      members: {
        playerId: string;
        hero: Hero;
        kills: number;
        deaths: number;
        takedowns: number;
        heroDamage: number;
      }[];
    }[];
  }[],
  aId: string,
  bId: string,
) {
  // 퍼포먼스는 game 단위로 계산 후 match 단위 평균
  const kdaA: number[] = [];
  const kdaB: number[] = [];
  const dmgShareA: number[] = [];
  const dmgShareB: number[] = [];

  for (const game of matchGames) {
    for (const team of game.teams) {
      const teamTotalHeroDamage = sumBy(team.members, (m) => m.heroDamage);

      for (const member of team.members) {
        if (member.playerId !== aId && member.playerId !== bId) {
          continue;
        }

        // hero 카운트 (대표 영웅)
        if (member.playerId === aId) {
          acc.heroCountsA.set(member.hero, (acc.heroCountsA.get(member.hero) ?? 0) + 1);
        } else {
          acc.heroCountsB.set(member.hero, (acc.heroCountsB.get(member.hero) ?? 0) + 1);
        }

        const kda = member.takedowns / Math.max(1, member.deaths);
        if (member.playerId === aId) {
          kdaA.push(kda);
        } else {
          kdaB.push(kda);
        }

        if (teamTotalHeroDamage > 0) {
          const share = member.heroDamage / teamTotalHeroDamage; // 0~1
          if (member.playerId === aId) {
            dmgShareA.push(share);
          } else {
            dmgShareB.push(share);
          }
        }
      }
    }
  }

  const avg = (list: number[]): number | null => {
    if (list.length === 0) return null;
    return sum(list) / list.length;
  };

  const avgKdaA = avg(kdaA);
  const avgKdaB = avg(kdaB);
  const avgShareA = avg(dmgShareA);
  const avgShareB = avg(dmgShareB);

  // 둘 다 값이 있어야 비교(격차) 가능
  if (avgKdaA !== null && avgKdaB !== null) {
    const kdaGapAbs = Math.abs(avgKdaA - avgKdaB);
    // gap 4 이상이면 "큰 차이"로 보고 1로 클램프
    const kdaGapNorm = clamp01(kdaGapAbs / 4);
    acc.perfSamples.kdaGapSumNorm += kdaGapNorm;
    acc.perfSamples.kdaSamples += 1;
  }

  if (avgShareA !== null && avgShareB !== null) {
    const shareGapAbs = Math.abs(avgShareA - avgShareB);
    // dmg share 0.15(15%p) 이상 차이나면 큰 격차
    const shareGapNorm = clamp01(shareGapAbs / 0.15);
    acc.perfSamples.dmgShareGapSumNorm += shareGapNorm;
    acc.perfSamples.dmgShareSamples += 1;
  }
}

function buildRivalryCard(
  acc: PairAccumulator,
  overallWinRateByPlayerId: Map<string, OverallWinRate>,
): RivalryCardResponse {
  const matchesSorted = [...acc.matches].sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
  const lastPlayedAt = matchesSorted[0]?.playedAt ?? new Date(0);

  const winRateA = toWinRate01(acc.winsA, acc.winsB);
  const winRateB = toWinRate01(acc.winsB, acc.winsA);

  const playerA: RivalrySide = {
    playerId: acc.a.playerId,
    playerName: acc.a.playerName,
    playerNickname: acc.a.playerNickname,
    wins: acc.winsA,
    losses: acc.winsB,
    draws: acc.draws,
    winRate: Math.round(winRateA * 100),
  };

  const playerB: RivalrySide = {
    playerId: acc.b.playerId,
    playerName: acc.b.playerName,
    playerNickname: acc.b.playerNickname,
    wins: acc.winsB,
    losses: acc.winsA,
    draws: acc.draws,
    winRate: Math.round(winRateB * 100),
  };

  const recent5 = matchesSorted.slice(0, 5);
  const recentSeq: RivalryRecentResult[] = recent5.map((m) => {
    if (m.resultForA === "DRAW") return "D";
    return m.resultForA === "WIN" ? "A" : "B";
  });

  const recent5Counts = recentSeq.reduce(
    (acc, r) => {
      if (r === "A") acc.winsA += 1;
      else if (r === "B") acc.winsB += 1;
      else acc.draws += 1;
      return acc;
    },
    { winsA: 0, winsB: 0, draws: 0 },
  );

  const balance = 1 - Math.abs(winRateA - winRateB); // 0~1
  const countScore = clamp01((acc.matches.length - 3) / 9); // 3~12 구간
  const recency = computeRecency(matchesSorted);

  const performanceCloseness = computePerformanceCloseness(acc.perfSamples);

  let rawScore = 0.3 * countScore + 0.3 * balance + 0.2 * recency + 0.2 * performanceCloseness;

  // 최근 5경기 박빙(2:3 / 3:2) 가산점
  const closeRecentBonus = isCloseRecentDecisive(recent5Counts) ? 0.03 : 0;
  rawScore = clamp01(rawScore + closeRecentBonus);

  const breakdown: RivalryScoreBreakdown = {
    matchesCount: acc.matches.length,
    countScore: round3(countScore),
    balance: round3(balance),
    recency: round3(recency),
    performanceCloseness: round3(performanceCloseness),
    rawScore: round3(rawScore),
  };

  const score = Math.round(rawScore * 100);

  const labels = buildLabels(acc, winRateA, winRateB, recent5Counts, overallWinRateByPlayerId);

  const comment = buildComment(acc, labels, recent5Counts);

  return {
    id: acc.id,
    score,
    labels,
    playerA,
    playerB,
    recent5: {
      ...recent5Counts,
      sequence: recentSeq,
    },
    topHeroes: {
      playerA: topHeroes(acc.heroCountsA, 2),
      playerB: topHeroes(acc.heroCountsB, 2),
    },
    comment,
    breakdown,
    lastPlayedAt: lastPlayedAt.toISOString(),
  };
}

function buildLabels(
  acc: PairAccumulator,
  winRateA: number, // 0~1
  winRateB: number, // 0~1
  recent5Counts: { winsA: number; winsB: number; draws: number },
  overallWinRateByPlayerId: Map<string, OverallWinRate>,
): RivalryLabel[] {
  const labels: RivalryLabel[] = [];
  const matchesCount = acc.matches.length;
  const winRateDiff = Math.abs(winRateA - winRateB);

  if (matchesCount >= 5 && winRateDiff <= 0.1) {
    labels.push({ type: "DESTINED_RIVAL", text: "숙명의 라이벌" });
  }

  // Nemesis (천적) - 방향성 있음
  const overallA = overallWinRateByPlayerId.get(acc.a.playerId);
  const overallB = overallWinRateByPlayerId.get(acc.b.playerId);

  if (overallA && overallA.decisions >= 5) {
    const vsB = winRateA;
    if (overallA.winRate - vsB >= 0.15) {
      labels.push({
        type: "NEMESIS",
        text: `천적: ${acc.b.playerNickname} → ${acc.a.playerNickname}`,
      });
    }
  }
  if (overallB && overallB.decisions >= 5) {
    const vsA = winRateB;
    if (overallB.winRate - vsA >= 0.15) {
      labels.push({
        type: "NEMESIS",
        text: `천적: ${acc.a.playerNickname} → ${acc.b.playerNickname}`,
      });
    }
  }

  // 박빙 흐름 배지(라벨 타입은 그대로 두고 텍스트만 추가)
  const closeRecent = isCloseRecentDecisive(recent5Counts);
  if (matchesCount >= 5 && closeRecent) {
    labels.push({ type: "DESTINED_RIVAL", text: "최근 5경기 박빙" });
  }

  return labels;
}

function buildComment(
  acc: PairAccumulator,
  labels: RivalryLabel[],
  recent5Counts: { winsA: number; winsB: number; draws: number },
): string {
  const aNick = acc.a.playerNickname;
  const bNick = acc.b.playerNickname;

  const hasNemesis = labels.some((l) => l.type === "NEMESIS");
  if (hasNemesis) {
    // “전체 승률은 높은데, 유독 B를 만나면 약해지는 A(천적)”
    // 방향성 라벨 텍스트 자체가 "천적: B → A" 형식이라, 그대로 활용
    const nemesis = labels.find((l) => l.type === "NEMESIS")?.text;
    if (nemesis) {
      const parts = nemesis.replace("천적: ", "").split(" → ");
      if (parts.length === 2) {
        const from = parts[0];
        const to = parts[1];
        return `전체 승률은 높은데, 유독 ${from}를 만나면 약해지는 ${to}(천적)`;
      }
    }
  }

  // 최근 흐름
  if (recent5Counts.winsB - recent5Counts.winsA >= 2) {
    return `최근 흐름은 ${bNick} 쪽`;
  }
  if (recent5Counts.winsA - recent5Counts.winsB >= 2) {
    return `최근 흐름은 ${aNick} 쪽`;
  }

  // 기본: 균형/우세 표현
  if (Math.abs(acc.winsA - acc.winsB) <= 1) {
    return `승률이 엇비슷한 박빙 구도`;
  }
  const leader = acc.winsA > acc.winsB ? aNick : bNick;
  const chaser = acc.winsA > acc.winsB ? bNick : aNick;
  return `초반엔 ${leader}가 앞서지만 ${chaser}도 따라붙는 중`;
}

function computeRecency(matchesSorted: ReadonlyArray<H2HMatch>): number {
  if (matchesSorted.length === 0) return 0;

  const last = matchesSorted[0];
  const daysSince = (playedAt: Date) => (Date.now() - playedAt.getTime()) / (1000 * 60 * 60 * 24);
  const decay = (days: number) => Math.exp(-days / 60); // 60일 반감 느낌
  const recentByTime = decay(daysSince(last.playedAt));

  // 최근 10경기의 시간 가중 평균(최근 5경기를 더 크게)
  const capped = matchesSorted.slice(0, 10);
  const weighted = capped.reduce(
    (acc, m, idx) => {
      const weight = idx < 5 ? 1 : 0.5;
      const recency = decay(daysSince(m.playedAt));
      return {
        weightedRecencySum: acc.weightedRecencySum + recency * weight,
        weightSum: acc.weightSum + weight,
      };
    },
    { weightedRecencySum: 0, weightSum: 0 },
  );
  const recentBySeries = weighted.weightSum > 0 ? weighted.weightedRecencySum / weighted.weightSum : recentByTime;

  return clamp01(0.6 * recentByTime + 0.4 * recentBySeries);
}

function computePerformanceCloseness(samples: PairAccumulator["perfSamples"]): number {
  const metricGaps: number[] = [];
  if (samples.kdaSamples > 0) {
    metricGaps.push(samples.kdaGapSumNorm / samples.kdaSamples);
  }
  if (samples.dmgShareSamples > 0) {
    metricGaps.push(samples.dmgShareGapSumNorm / samples.dmgShareSamples);
  }
  if (metricGaps.length === 0) return 0.5;

  const gap = clamp01(sum(metricGaps) / metricGaps.length);
  return clamp01(1 - gap);
}

function isCloseRecentDecisive(recent5Counts: { winsA: number; winsB: number; draws: number }): boolean {
  const decisiveGames = recent5Counts.winsA + recent5Counts.winsB;
  return decisiveGames === 5 && Math.abs(recent5Counts.winsA - recent5Counts.winsB) === 1;
}

function topHeroes(map: Map<Hero, number>, topN: number): { hero: Hero; count: number }[] {
  return Array.from(map.entries())
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([hero, count]) => ({ hero, count }));
}

function toResultForA(winnerTeamNumber: number | null, teamNumberA: 1 | 2 | null): "WIN" | "LOSE" | "DRAW" {
  if (winnerTeamNumber === null) return "DRAW";
  if (teamNumberA === null) return "DRAW";
  return winnerTeamNumber === teamNumberA ? "WIN" : "LOSE";
}

function sortPair(p1: PlayerInfo, p2: PlayerInfo): { a: PlayerInfo; b: PlayerInfo } {
  return p1.playerId < p2.playerId ? { a: p1, b: p2 } : { a: p2, b: p1 };
}

function toWinRate01(wins: number, losses: number): number {
  const decisions = wins + losses;
  if (decisions <= 0) return 0.5;
  return wins / decisions;
}

async function fetchOverallMatchWinRateByPlayerId(
  prisma: PrismaClient,
  year?: number,
): Promise<Map<string, OverallWinRate>> {
  const playedAt = buildPlayedAtYearFilter(year);
  const memberships = await prisma.matchTeamMember.findMany({
    where: playedAt
      ? {
          matchTeam: {
            match: {
              playedAt,
            },
          },
        }
      : undefined,
    select: {
      playerId: true,
      matchTeam: {
        select: {
          teamNumber: true,
          match: {
            select: { winnerTeamNumber: true },
          },
        },
      },
    },
  });

  const acc = new Map<string, { wins: number; losses: number }>();
  for (const m of memberships) {
    const winner = m.matchTeam.match.winnerTeamNumber;
    if (winner === null) continue; // draw 제외(결정 경기만)
    const current = acc.get(m.playerId) ?? { wins: 0, losses: 0 };
    if (winner === m.matchTeam.teamNumber) current.wins += 1;
    else current.losses += 1;
    acc.set(m.playerId, current);
  }

  const out = new Map<string, OverallWinRate>();
  for (const [playerId, s] of acc.entries()) {
    const decisions = s.wins + s.losses;
    out.set(playerId, {
      winRate: decisions <= 0 ? 0.5 : s.wins / decisions,
      decisions,
    });
  }
  return out;
}

function clamp01(v: number) {
  return clamp(v, 0, 1);
}

function round3(v: number): number {
  return round(v, 3);
}
