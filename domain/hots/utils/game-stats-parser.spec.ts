import { describe, expect, it } from "vitest";
import { parseGameStats } from "./game-stats-parser";

describe("parseGameStats", () => {
  it("게임 스탯 텍스트를 정상 파싱한다", () => {
    const text = `[영원의 전쟁터]\n<Team 1: Level 20>\n[철수 (아나)]\nKill: 2 / Death: 1 / Takedown: 8\n가한 데미지: 12,345 / 공성 데미지: 4,321 / 받은 데미지: 1,111\n<Team 2: Level 19>\n[영희 (제이나)]\nKill: 3 / Death: 2 / Takedown: 7\n가한 데미지: 22,222 / 공성 데미지: 5,000 / 받은 데미지: 2,000`;

    const parsed = parseGameStats(text);

    expect(parsed.map).toBe("BattlefieldOfEternity");
    expect(parsed.teams).toHaveLength(2);
    expect(parsed.teams[0]?.teamNumber).toBe(1);
    expect(parsed.teams[0]?.players[0]).toMatchObject({
      nickname: "철수",
      hero: "Ana",
      kills: 2,
      deaths: 1,
      takedowns: 8,
      heroDamage: 12345,
      damageTaken: 1111,
    });
  });

  it("맵 이름이 없으면 예외를 던진다", () => {
    const text = `<Team 1: Level 20>\n[철수 (아나)]`;
    expect(() => parseGameStats(text)).toThrowError("맵 이름을 찾을 수 없습니다.");
  });

  it("알 수 없는 영웅 이름이면 예외를 던진다", () => {
    const text = `[영원의 전쟁터]\n<Team 1: Level 20>\n[철수 (없는영웅)]\n<Team 2: Level 20>\n[영희 (제이나)]\nKill: 1 / Death: 1 / Takedown: 1\n가한 데미지: 1 / 공성 데미지: 1 / 받은 데미지: 1`;

    expect(() => parseGameStats(text)).toThrowError("알 수 없는 영웅 이름: 없는영웅");
  });

  it("팀 수가 2개가 아니면 예외를 던진다", () => {
    const text = `[영원의 전쟁터]\n<Team 1: Level 20>\n[철수 (아나)]\nKill: 1 / Death: 1 / Takedown: 1\n가한 데미지: 1 / 공성 데미지: 1 / 받은 데미지: 1`;

    expect(() => parseGameStats(text)).toThrowError("팀이 2개여야 합니다. 현재: 1개");
  });
});
