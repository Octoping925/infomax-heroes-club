import { HeroMap, MAPS } from "@domain/hots/constants";
import { Hero, GameMap } from "@domain/hots/models";

/** 파싱된 플레이어 스탯 */
export type ParsedPlayerStat = {
  nickname: string;
  hero: Hero;
  kills: number;
  deaths: number;
  takedowns: number;
  heroDamage: number;
  damageTaken: number;
};

/** 파싱된 팀 정보 */
export type ParsedTeam = {
  teamNumber: number;
  players: ReadonlyArray<ParsedPlayerStat>;
};

/** 파싱된 게임 스탯 */
export type ParsedGameStats = {
  readonly map: GameMap;
  readonly teams: ReadonlyArray<ParsedTeam>;
};

// 한글 영웅 이름 → Hero enum 매핑 (역방향)
const koreanToHeroMap = new Map<string, Hero>(
  Object.entries(HeroMap).map(([key, value]) => [value, key as Hero])
);

// 한글 맵 이름 → GameMap enum 매핑 (역방향)
const koreanToMapMap = new Map<string, GameMap>(
  Object.entries(MAPS).map(([key, value]) => [value, key as GameMap])
);

/**
 * 게임 스탯 텍스트를 파싱합니다.
 * @param text 게임 스탯 텍스트
 * @returns 파싱된 게임 스탯+
 *
 * @throws 파싱 실패 시 Error
 */
export function parseGameStats(text: string): ParsedGameStats {
  const lines = text.split("\n").map((line) => line.trim());

  const map = parseMapName(lines);
  const teams = parseTeams(lines);

  return { map, teams };
}

function parseMapName(lines: string[]): GameMap {
  const mapLine = lines.find(
    (line) => line.startsWith("[") && line.endsWith("]") && !line.includes("(")
  );

  if (!mapLine) {
    throw new Error("맵 이름을 찾을 수 없습니다.");
  }

  const mapName = mapLine.slice(1, -1); // "[영원의 전쟁터]" → "영원의 전쟁터"
  const map = koreanToMapMap.get(mapName);

  if (!map) {
    throw new Error(`알 수 없는 맵 이름: ${mapName}`);
  }

  return map;
}

function parseTeams(lines: string[]): ParsedTeam[] {
  const teams: ParsedTeam[] = [];
  let currentTeamNumber: number | null = null;
  let currentPlayers: ParsedPlayerStat[] = [];
  let currentPlayerData: Partial<ParsedPlayerStat> | null = null;

  for (const line of lines) {
    // 팀 헤더 파싱: <Team 1: Level 19>
    const teamMatch = line.match(/<Team (\d+):/);
    if (teamMatch) {
      // 이전 팀 저장
      if (currentTeamNumber !== null) {
        if (currentPlayerData && isCompletePlayerData(currentPlayerData)) {
          currentPlayers.push(currentPlayerData as ParsedPlayerStat);
        }
        teams.push({
          teamNumber: currentTeamNumber,
          players: currentPlayers,
        });
      }

      currentTeamNumber = parseInt(teamMatch[1], 10);
      currentPlayers = [];
      currentPlayerData = null;
      continue;
    }

    // 플레이어 헤더 파싱: [닉네임 (영웅)]
    const playerMatch = line.match(/^\[(.+?)\s+\((.+?)\)\]$/);
    if (playerMatch) {
      // 이전 플레이어 저장
      if (currentPlayerData && isCompletePlayerData(currentPlayerData)) {
        currentPlayers.push(currentPlayerData as ParsedPlayerStat);
      }

      const nickname = playerMatch[1];
      const heroName = playerMatch[2];
      const hero = koreanToHeroMap.get(heroName);

      if (!hero) {
        throw new Error(`알 수 없는 영웅 이름: ${heroName}`);
      }

      currentPlayerData = { nickname, hero };
      continue;
    }

    // KDA 파싱: Kill: 2 / Death: 2 / Takedown: 5
    const kdaMatch = line.match(
      /Kill:\s*(\d+)\s*\/\s*Death:\s*(\d+)\s*\/\s*Takedown:\s*(\d+)/
    );
    if (kdaMatch && currentPlayerData) {
      currentPlayerData.kills = parseInt(kdaMatch[1], 10);
      currentPlayerData.deaths = parseInt(kdaMatch[2], 10);
      currentPlayerData.takedowns = parseInt(kdaMatch[3], 10);
      continue;
    }

    // 데미지 파싱: 가한 데미지: 52,281 / 공성 데미지: 133,642 / 받은 데미지: 60,100
    const damageMatch = line.match(
      /가한 데미지:\s*([\d,]+)\s*\/.*\/\s*받은 데미지:\s*([\d,]+)/
    );
    if (damageMatch && currentPlayerData) {
      currentPlayerData.heroDamage = parseNumberWithCommas(damageMatch[1]);
      currentPlayerData.damageTaken = parseNumberWithCommas(damageMatch[2]);
      continue;
    }
  }

  // 마지막 팀 저장
  if (currentTeamNumber !== null) {
    if (currentPlayerData && isCompletePlayerData(currentPlayerData)) {
      currentPlayers.push(currentPlayerData as ParsedPlayerStat);
    }
    teams.push({
      teamNumber: currentTeamNumber,
      players: currentPlayers,
    });
  }

  if (teams.length !== 2) {
    throw new Error(`팀이 2개여야 합니다. 현재: ${teams.length}개`);
  }

  return teams;
}

function parseNumberWithCommas(value: string): number {
  return parseInt(value.replace(/,/g, ""), 10);
}

function isCompletePlayerData(data: Partial<ParsedPlayerStat>): boolean {
  return (
    data.nickname !== undefined &&
    data.hero !== undefined &&
    data.kills !== undefined &&
    data.deaths !== undefined &&
    data.takedowns !== undefined &&
    data.heroDamage !== undefined &&
    data.damageTaken !== undefined
  );
}
