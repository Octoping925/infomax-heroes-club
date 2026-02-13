import { describe, expect, it } from "vitest";
import { buildRankedPlayerMap, calculatePlayerRankings } from "./score";
import { PlayerStats } from "./types";

function createPlayer(input: Partial<PlayerStats> & Pick<PlayerStats, "id" | "position">): PlayerStats {
  return {
    id: input.id,
    position: input.position,
    kills: input.kills ?? 0,
    deaths: input.deaths ?? 0,
    takedowns: input.takedowns ?? 0,
    heroDamage: input.heroDamage ?? 0,
    siegeDamage: input.siegeDamage ?? 0,
    healingDone: input.healingDone ?? 0,
    experienceContribution: input.experienceContribution ?? 0,
    damageTaken: input.damageTaken ?? 0,
    timeCCdEnemyHeroes: input.timeCCdEnemyHeroes ?? 0,
    timeSpentDead: input.timeSpentDead ?? 0,
    mercCampCaptures: input.mercCampCaptures ?? 0,
    watchTowerCaptures: input.watchTowerCaptures ?? 0,
  };
}

describe("match/score", () => {
  it("calculatePlayerRankings는 점수 순으로 정렬하고 rank를 부여한다", () => {
    const players: PlayerStats[] = [
      createPlayer({
        id: "p1",
        position: "MAIN_DEALER",
        heroDamage: 100000,
        takedowns: 20,
        kills: 8,
        deaths: 1,
        experienceContribution: 20000,
      }),
      createPlayer({
        id: "p2",
        position: "HEALER",
        healingDone: 90000,
        takedowns: 15,
        deaths: 2,
      }),
      createPlayer({
        id: "p3",
        position: "TANKER",
        damageTaken: 120000,
        timeCCdEnemyHeroes: 90,
        takedowns: 12,
        deaths: 3,
      }),
    ];

    const ranked = calculatePlayerRankings(players);

    expect(ranked).toHaveLength(3);
    expect(ranked[0]?.rank).toBe(1);
    expect(ranked[1]?.rank).toBe(2);
    expect(ranked[2]?.rank).toBe(3);
    expect(ranked[0]?.totalScore).toBeGreaterThanOrEqual(ranked[1]?.totalScore ?? 0);
  });

  it("buildRankedPlayerMap은 id 기반 조회가 가능하다", () => {
    const rankedMap = buildRankedPlayerMap([
      createPlayer({ id: "p1", position: "MAIN_DEALER", heroDamage: 10000 }),
      createPlayer({ id: "p2", position: "HEALER", healingDone: 10000 }),
    ]);

    expect(rankedMap.size).toBe(2);
    expect(rankedMap.get("p1")?.id).toBe("p1");
  });

  it("입력이 비어 있으면 빈 배열을 반환한다", () => {
    expect(calculatePlayerRankings([])).toEqual([]);
    expect(buildRankedPlayerMap([]).size).toBe(0);
  });
});
