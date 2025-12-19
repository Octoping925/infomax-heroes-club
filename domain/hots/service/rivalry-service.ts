import type {
  RivalryCardResponse,
  RivalryLabel,
  RivalryListResponse,
  RivalryRecentResult,
  RivalryScoreBreakdown,
  RivalrySide,
} from "@/app/api/stats/types";
import type { PrismaClient } from "@/generated/prisma/client";
import { Hero, MatchType } from "@/generated/prisma/client";

type PlayerInfo = {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
};

type H2HMatch = {
  readonly matchId: string;
  readonly playedAt: Date;
  readonly type: MatchType;
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
  lunch: { winsA: number; winsB: number; draws: number };
  dinner: { winsA: number; winsB: number; draws: number };
  heroCountsA: Map<Hero, number>;
  heroCountsB: Map<Hero, number>;
  perfSamples: {
    count: number;
    kdaGapSumNorm: number;
    dmgShareGapSumNorm: number;
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
};

const DEFAULT_PARAMS: FetchRivalriesParams = {
  minMatches: 3,
  limit: 30,
  takeMatches: 500,
  includeInsufficientSample: false,
};

const MAX_TAKE_MATCHES = 2000;
const MAX_LIMIT = 200;

export function normalizeFetchRivalriesParams(
  input: Partial<FetchRivalriesParams>
): FetchRivalriesParams {
  const minMatches = clampInt(
    input.minMatches ?? DEFAULT_PARAMS.minMatches,
    1,
    50
  );
  const limit = clampInt(input.limit ?? DEFAULT_PARAMS.limit, 1, MAX_LIMIT);
  const takeMatches = clampInt(
    input.takeMatches ?? DEFAULT_PARAMS.takeMatches,
    1,
    MAX_TAKE_MATCHES
  );
  const includeInsufficientSample =
    input.includeInsufficientSample ?? DEFAULT_PARAMS.includeInsufficientSample;
  return { minMatches, limit, takeMatches, includeInsufficientSample };
}

/**
 * 라이벌리 카드 목록을 생성합니다.
 *
 * 정의:
 * - 같은 match에서 A와 B가 서로 다른 GameTeam(실제론 MatchTeam teamNumber로 충분) 이면 A vs B 맞대결 1회
 * - 집계 단위는 match(내전 1건) 입니다.
 */
export async function fetchRivalries(input: {
  readonly prisma: PrismaClient;
  readonly params: FetchRivalriesParams;
}): Promise<RivalryListResponse> {
  const params = normalizeFetchRivalriesParams(input.params);

  const [matches, overallWinRateByPlayerId] = await Promise.all([
    input.prisma.match.findMany({
      orderBy: { playedAt: "desc" },
      take: params.takeMatches,
      select: {
        id: true,
        playedAt: true,
        type: true,
        winnerTeamNumber: true,
        teams: {
          select: {
            teamNumber: true,
            members: {
              select: {
                playerId: true,
                player: { select: { name: true, nickname: true } },
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
    fetchOverallMatchWinRateByPlayerId(input.prisma),
  ]);

  const pairMap = new Map<string, PairAccumulator>();

  for (const match of matches) {
    const teamPlayers: Record<number, PlayerInfo[]> = { 1: [], 2: [] };
    for (const team of match.teams) {
      for (const member of team.members) {
        teamPlayers[team.teamNumber].push({
          playerId: member.playerId,
          playerName: member.player.name,
          playerNickname: member.player.nickname,
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
        const acc =
          pairMap.get(pairId) ??
          createPairAccumulator({
            id: pairId,
            a,
            b,
          });

        const resultForA = toResultForA({
          winnerTeamNumber: match.winnerTeamNumber,
          teamNumberA: teamNumberByPlayerId.get(a.playerId) ?? null,
        });

        acc.matches.push({
          matchId: match.id,
          playedAt: match.playedAt,
          type: match.type,
          resultForA,
        });

        updateWinLossCounts(acc, resultForA, match.type);
        updateHeroCountsAndPerformance({
          acc,
          matchGames: match.games,
          aId: a.playerId,
          bId: b.playerId,
        });

        pairMap.set(pairId, acc);
      }
    }
  }

  const cards: RivalryCardResponse[] = Array.from(pairMap.values())
    .map((acc) =>
      buildRivalryCard({
        acc,
        overallWinRateByPlayerId,
        minMatches: params.minMatches,
      })
    )
    .filter((card) => {
      if (params.includeInsufficientSample) return true;
      return card.breakdown.matchesCount >= params.minMatches;
    })
    .sort(
      (a, b) =>
        b.score - a.score || b.breakdown.matchesCount - a.breakdown.matchesCount
    )
    .slice(0, params.limit);

  return {
    generatedAt: new Date().toISOString(),
    params,
    hottest: cards.length > 0 ? cards[0] : null,
    items: cards,
  };
}

function createPairAccumulator(input: {
  readonly id: string;
  readonly a: PlayerInfo;
  readonly b: PlayerInfo;
}): PairAccumulator {
  return {
    id: input.id,
    a: input.a,
    b: input.b,
    matches: [],
    winsA: 0,
    winsB: 0,
    draws: 0,
    lunch: { winsA: 0, winsB: 0, draws: 0 },
    dinner: { winsA: 0, winsB: 0, draws: 0 },
    heroCountsA: new Map(),
    heroCountsB: new Map(),
    perfSamples: { count: 0, kdaGapSumNorm: 0, dmgShareGapSumNorm: 0 },
  };
}

function updateWinLossCounts(
  acc: PairAccumulator,
  resultForA: "WIN" | "LOSE" | "DRAW",
  matchType: MatchType
): void {
  const bucket = matchType === MatchType.LUNCH ? acc.lunch : acc.dinner;
  if (resultForA === "DRAW") {
    acc.draws += 1;
    bucket.draws += 1;
    return;
  }
  if (resultForA === "WIN") {
    acc.winsA += 1;
    bucket.winsA += 1;
    return;
  }
  acc.winsB += 1;
  bucket.winsB += 1;
}

function updateHeroCountsAndPerformance(input: {
  readonly acc: PairAccumulator;
  readonly matchGames: ReadonlyArray<{
    teams: ReadonlyArray<{
      teamNumber: number;
      members: ReadonlyArray<{
        playerId: string;
        hero: Hero;
        kills: number | null;
        deaths: number | null;
        takedowns: number | null;
        heroDamage: number | null;
      }>;
    }>;
  }>;
  readonly aId: string;
  readonly bId: string;
}): void {
  // 퍼포먼스는 game 단위로 계산 후 match 단위 평균
  const kdaA: number[] = [];
  const kdaB: number[] = [];
  const dmgShareA: number[] = [];
  const dmgShareB: number[] = [];

  for (const game of input.matchGames) {
    for (const team of game.teams) {
      const teamTotalHeroDamage = team.members.reduce((sum, m) => {
        return sum + (m.heroDamage ?? 0);
      }, 0);

      for (const member of team.members) {
        if (member.playerId !== input.aId && member.playerId !== input.bId) {
          continue;
        }

        // hero 카운트 (대표 영웅)
        if (member.playerId === input.aId) {
          input.acc.heroCountsA.set(
            member.hero,
            (input.acc.heroCountsA.get(member.hero) ?? 0) + 1
          );
        } else {
          input.acc.heroCountsB.set(
            member.hero,
            (input.acc.heroCountsB.get(member.hero) ?? 0) + 1
          );
        }

        const deaths = member.deaths ?? 0;
        const takedowns = member.takedowns ?? member.kills ?? 0;
        const kda = takedowns / Math.max(1, deaths);
        if (member.playerId === input.aId) {
          kdaA.push(kda);
        } else {
          kdaB.push(kda);
        }

        if (teamTotalHeroDamage > 0 && member.heroDamage !== null) {
          const share = member.heroDamage / teamTotalHeroDamage; // 0~1
          if (member.playerId === input.aId) {
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
    return list.reduce((s, v) => s + v, 0) / list.length;
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
    input.acc.perfSamples.kdaGapSumNorm += kdaGapNorm;
  }

  if (avgShareA !== null && avgShareB !== null) {
    const shareGapAbs = Math.abs(avgShareA - avgShareB);
    // dmg share 0.15(15%p) 이상 차이나면 큰 격차
    const shareGapNorm = clamp01(shareGapAbs / 0.15);
    input.acc.perfSamples.dmgShareGapSumNorm += shareGapNorm;
  }

  input.acc.perfSamples.count += 1;
}

function buildRivalryCard(input: {
  readonly acc: PairAccumulator;
  readonly overallWinRateByPlayerId: Map<string, OverallWinRate>;
  readonly minMatches: number;
}): RivalryCardResponse {
  const matchesSorted = [...input.acc.matches].sort(
    (a, b) => b.playedAt.getTime() - a.playedAt.getTime()
  );
  const lastPlayedAt = matchesSorted[0]?.playedAt ?? new Date(0);

  const winRateA = toWinRate01(input.acc.winsA, input.acc.winsB);
  const winRateB = toWinRate01(input.acc.winsB, input.acc.winsA);

  const playerA: RivalrySide = {
    playerId: input.acc.a.playerId,
    playerName: input.acc.a.playerName,
    playerNickname: input.acc.a.playerNickname,
    wins: input.acc.winsA,
    losses: input.acc.winsB,
    draws: input.acc.draws,
    winRate: Math.round(winRateA * 100),
  };

  const playerB: RivalrySide = {
    playerId: input.acc.b.playerId,
    playerName: input.acc.b.playerName,
    playerNickname: input.acc.b.playerNickname,
    wins: input.acc.winsB,
    losses: input.acc.winsA,
    draws: input.acc.draws,
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
    { winsA: 0, winsB: 0, draws: 0 }
  );

  const balance = 1 - Math.abs(winRateA - winRateB); // 0~1
  const countScore = clamp01((input.acc.matches.length - 3) / 9); // 3~12 구간
  const recency = computeRecency({
    matchesSorted,
  });

  const performanceCloseness = computePerformanceCloseness(
    input.acc.perfSamples
  );

  let rawScore =
    0.3 * countScore +
    0.3 * balance +
    0.2 * recency +
    0.2 * performanceCloseness;

  // 최근 5경기 박빙(2:3 / 3:2) 가산점
  const closeRecentBonus =
    recent5.length >= 5 &&
    Math.abs(recent5Counts.winsA - recent5Counts.winsB) === 1
      ? 0.03
      : 0;
  rawScore = clamp01(rawScore + closeRecentBonus);

  const breakdown: RivalryScoreBreakdown = {
    matchesCount: input.acc.matches.length,
    countScore: round3(countScore),
    balance: round3(balance),
    recency: round3(recency),
    performanceCloseness: round3(performanceCloseness),
    rawScore: round3(rawScore),
  };

  const score = Math.round(rawScore * 100);

  const labels = buildLabels({
    acc: input.acc,
    winRateA,
    winRateB,
    recent5Counts,
    overallWinRateByPlayerId: input.overallWinRateByPlayerId,
  });

  const comment = buildComment({
    acc: input.acc,
    labels,
    recent5Counts,
    winRateA,
    winRateB,
  });

  return {
    id: input.acc.id,
    score,
    labels,
    playerA,
    playerB,
    recent5: {
      ...recent5Counts,
      sequence: recentSeq,
    },
    lunchDinner: {
      lunch: {
        winsA: input.acc.lunch.winsA,
        winsB: input.acc.lunch.winsB,
        draws: input.acc.lunch.draws,
      },
      dinner: {
        winsA: input.acc.dinner.winsA,
        winsB: input.acc.dinner.winsB,
        draws: input.acc.dinner.draws,
      },
    },
    topHeroes: {
      playerA: topHeroes(input.acc.heroCountsA, 2),
      playerB: topHeroes(input.acc.heroCountsB, 2),
    },
    comment,
    breakdown,
    lastPlayedAt: lastPlayedAt.toISOString(),
  };
}

function buildLabels(input: {
  readonly acc: PairAccumulator;
  readonly winRateA: number; // 0~1
  readonly winRateB: number; // 0~1
  readonly recent5Counts: { winsA: number; winsB: number; draws: number };
  readonly overallWinRateByPlayerId: Map<string, OverallWinRate>;
}): RivalryLabel[] {
  const labels: RivalryLabel[] = [];
  const matchesCount = input.acc.matches.length;
  const winRateDiff = Math.abs(input.winRateA - input.winRateB);

  if (matchesCount >= 5 && winRateDiff <= 0.1) {
    labels.push({ type: "DESTINED_RIVAL", text: "숙명의 라이벌" });
  }

  // Nemesis (천적) - 방향성 있음
  const overallA = input.overallWinRateByPlayerId.get(input.acc.a.playerId);
  const overallB = input.overallWinRateByPlayerId.get(input.acc.b.playerId);

  if (overallA && overallA.decisions >= 5) {
    const vsB = input.winRateA;
    if (overallA.winRate - vsB >= 0.15) {
      labels.push({
        type: "NEMESIS",
        text: `천적: ${input.acc.b.playerNickname} → ${input.acc.a.playerNickname}`,
      });
    }
  }
  if (overallB && overallB.decisions >= 5) {
    const vsA = input.winRateB;
    if (overallB.winRate - vsA >= 0.15) {
      labels.push({
        type: "NEMESIS",
        text: `천적: ${input.acc.a.playerNickname} → ${input.acc.b.playerNickname}`,
      });
    }
  }

  // 박빙 흐름 배지(라벨 타입은 그대로 두고 텍스트만 추가)
  const closeRecent =
    input.recent5Counts.winsA + input.recent5Counts.winsB >= 5 &&
    Math.abs(input.recent5Counts.winsA - input.recent5Counts.winsB) === 1;
  if (matchesCount >= 5 && closeRecent) {
    labels.push({ type: "DESTINED_RIVAL", text: "최근 5경기 박빙" });
  }

  return labels;
}

function buildComment(input: {
  readonly acc: PairAccumulator;
  readonly labels: ReadonlyArray<RivalryLabel>;
  readonly recent5Counts: { winsA: number; winsB: number; draws: number };
  readonly winRateA: number;
  readonly winRateB: number;
}): string {
  const aNick = input.acc.a.playerNickname;
  const bNick = input.acc.b.playerNickname;

  const hasNemesis = input.labels.some((l) => l.type === "NEMESIS");
  if (hasNemesis) {
    // “전체 승률은 높은데, 유독 B를 만나면 약해지는 A(천적)”
    // 방향성 라벨 텍스트 자체가 "천적: B → A" 형식이라, 그대로 활용
    const nemesis = input.labels.find((l) => l.type === "NEMESIS")?.text;
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
  if (input.recent5Counts.winsB - input.recent5Counts.winsA >= 2) {
    return `최근 흐름은 ${bNick} 쪽`;
  }
  if (input.recent5Counts.winsA - input.recent5Counts.winsB >= 2) {
    return `최근 흐름은 ${aNick} 쪽`;
  }

  // 점심/저녁 분리 멘트
  const lunch = input.acc.lunch;
  const dinner = input.acc.dinner;
  const lunchDiff = lunch.winsA - lunch.winsB;
  const dinnerDiff = dinner.winsA - dinner.winsB;
  if (lunchDiff >= 2 && dinnerDiff <= -2) {
    return `점심엔 ${aNick}의 독무대, 저녁엔 ${bNick}의 반격`;
  }
  if (lunchDiff <= -2 && dinnerDiff >= 2) {
    return `점심엔 ${bNick}의 독무대, 저녁엔 ${aNick}의 반격`;
  }

  // 기본: 균형/우세 표현
  if (Math.abs(input.acc.winsA - input.acc.winsB) <= 1) {
    return `승률이 엇비슷한 박빙 구도`;
  }
  const leader = input.acc.winsA > input.acc.winsB ? aNick : bNick;
  const chaser = input.acc.winsA > input.acc.winsB ? bNick : aNick;
  return `초반엔 ${leader}가 앞서지만 ${chaser}도 따라붙는 중`;
}

function computeRecency(input: {
  readonly matchesSorted: ReadonlyArray<H2HMatch>;
}): number {
  if (input.matchesSorted.length === 0) return 0;

  const last = input.matchesSorted[0];
  const daysSinceLast =
    (Date.now() - last.playedAt.getTime()) / (1000 * 60 * 60 * 24);
  const recentByTime = Math.exp(-daysSinceLast / 60); // 60일 반감 느낌

  // 최근 10경기 내에서 "최근 5경기"를 더 크게 가중
  const capped = input.matchesSorted.slice(0, 10);
  const maxWeightSum = 5 * 1 + 5 * 0.5; // 7.5
  const weightSum = capped.reduce(
    (sum, _m, idx) => sum + (idx < 5 ? 1 : 0.5),
    0
  );
  const recentByVolume = clamp01(weightSum / maxWeightSum);

  return clamp01(0.6 * recentByTime + 0.4 * recentByVolume);
}

function computePerformanceCloseness(
  samples: PairAccumulator["perfSamples"]
): number {
  if (samples.count <= 0) return 0.5;
  const avgKdaGapNorm = samples.kdaGapSumNorm / samples.count;
  const avgShareGapNorm = samples.dmgShareGapSumNorm / samples.count;
  const gap = clamp01((avgKdaGapNorm + avgShareGapNorm) / 2);
  return clamp01(1 - gap);
}

function topHeroes(
  map: Map<Hero, number>,
  topN: number
): { hero: Hero; count: number }[] {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([hero, count]) => ({ hero, count }));
}

function toResultForA(input: {
  readonly winnerTeamNumber: number | null;
  readonly teamNumberA: 1 | 2 | null;
}): "WIN" | "LOSE" | "DRAW" {
  if (input.winnerTeamNumber === null) return "DRAW";
  if (input.teamNumberA === null) return "DRAW";
  return input.winnerTeamNumber === input.teamNumberA ? "WIN" : "LOSE";
}

function sortPair(
  p1: PlayerInfo,
  p2: PlayerInfo
): { a: PlayerInfo; b: PlayerInfo } {
  return p1.playerId < p2.playerId ? { a: p1, b: p2 } : { a: p2, b: p1 };
}

function toWinRate01(wins: number, losses: number): number {
  const decisions = wins + losses;
  if (decisions <= 0) return 0.5;
  return wins / decisions;
}

async function fetchOverallMatchWinRateByPlayerId(
  prisma: PrismaClient
): Promise<Map<string, OverallWinRate>> {
  const memberships = await prisma.matchTeamMember.findMany({
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

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function clampInt(v: number, min: number, max: number): number {
  const n = Number.isFinite(v) ? Math.floor(v) : min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
