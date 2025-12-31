type HeroStat = {
  hero: string;
  wins: number;
  losses: number;
};

type ScoreOptions = {
  /** 전체 평균 승률(사전확률). 맵 전체/전 체감 평균을 넣는 게 제일 좋음 */
  priorWinRate: number; // p0 (0~1)

  /** 베이지안 사전 강도: "m판 정도의 가상 데이터" */
  priorGames: number; // m (예: 10~30)

  /** Wilson 신뢰수준 z: 95%면 1.96, 90%면 1.645 */
  z?: number;

  /**
   * 혼합 가중치의 민감도: α(n)=n/(n+k)
   * k가 클수록 "표본 적으면 wilson(보수적)" 쪽으로 더 감.
   */
  mixK?: number;
};

type ScoredHero = HeroStat & {
  games: number;
  rawWinRate: number; // w/n
  bayesWinRate: number; // (w + m*p0)/(n+m)
  wilsonLower: number; // conservative lower bound
  score: number; // 정렬용 점수 (3+4 혼합)
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Wilson score interval lower bound for a binomial proportion.
 * Reference: standard Wilson interval formula.
 */
function wilsonLowerBound(wins: number, games: number, z: number): number {
  if (games <= 0) return 0;

  const p = wins / games;
  const z2 = z * z;

  const denom = 1 + z2 / games;
  const center = p + z2 / (2 * games);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * games)) / games);

  const lower = (center - margin) / denom;
  return clamp01(lower);
}

function bayesAdjustedWinRate(
  wins: number,
  games: number,
  priorWinRate: number,
  priorGames: number
): number {
  if (games < 0) throw new Error("games must be >= 0");
  if (priorGames < 0) throw new Error("priorGames must be >= 0");

  const p0 = clamp01(priorWinRate);
  const m = priorGames;

  // (w + m*p0) / (n + m)
  const denom = games + m;
  if (denom === 0) return p0;
  return clamp01((wins + m * p0) / denom);
}

/**
 * 3(베이지안/라플라스) + 4(Wilson lower bound) 혼합 점수
 */
export function scoreHeroes(
  stats: HeroStat[],
  opts: ScoreOptions
): Record<string, ScoredHero> {
  const z = opts.z ?? 1.96; // default 95%
  const mixK = opts.mixK ?? 10; // default: 10판 정도부터 점점 bayes 비중 증가

  return stats
    .map((s) => {
      const wins = Math.max(0, s.wins);
      const losses = Math.max(0, s.losses);
      const games = wins + losses;

      const rawWinRate = games > 0 ? wins / games : 0;
      const bayesWinRate = bayesAdjustedWinRate(
        wins,
        games,
        opts.priorWinRate,
        opts.priorGames
      );
      const wilsonLower = wilsonLowerBound(wins, games, z);

      // α(n) = n / (n + k)
      const alpha = games / (games + mixK);

      // 혼합 점수
      const score = alpha * bayesWinRate + (1 - alpha) * wilsonLower;

      return {
        ...s,
        games,
        rawWinRate: clamp01(rawWinRate),
        bayesWinRate,
        wilsonLower,
        score: clamp01(score),
      };
    })
    .reduce((acc, curr) => {
      acc[curr.hero] = curr;
      return acc;
    }, {} as Record<string, ScoredHero>);
}
