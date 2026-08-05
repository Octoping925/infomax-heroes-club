import { describe, expect, it } from "vitest";
import type { ParsedReplayRuntime } from "./parser/parser";
import { decodeReplayRuntime } from "./decode-replay";
import { normalizeDecodedReplay } from "./normalize-replay";

describe("decodeReplayRuntime", () => {
  it("decodes the protocol sections needed by the shared import contract", () => {
    const decoded = decodeReplayRuntime(createRuntime());
    const result = normalizeDecodedReplay(decoded);

    expect(result).toMatchObject({
      build: 94786,
      dateKey: "20250508",
      map: "CursedHollow",
      winnerSide: 0,
      game: {
        gameLength: 1_200,
        team1: { win: true, level: 20 },
        team2: { win: false, level: 19 },
      },
    });
    expect(result.game.team1.players[0]).toMatchObject({
      rawName: "player1",
      hero: "아바투르",
      kills: 1,
      deaths: 2,
      takedowns: 3,
      heroDamage: 12_000,
      dpm: 600,
      talents: ["AbathurPressurizedGlands"],
    });
  });
});

function createRuntime(): ParsedReplayRuntime {
  const handles = Array.from({ length: 10 }, (_, index) => `3-Hero-1-${index + 1}`);
  const playerInitEvents = handles.map((handle, index) => ({
    _eventid: 10,
    m_eventName: "PlayerInit",
    m_intData: [{ m_value: index + 1 }],
    m_stringData: [{ m_value: "Human" }, { m_value: handle }],
  }));
  const talentEvents = handles.map((_, index) => ({
    _eventid: 10,
    m_eventName: "EndOfGameTalentChoices",
    m_intData: [{ m_value: index + 1 }],
    m_stringData: [
      { m_key: "Hero", m_value: "Abathur" },
      { m_key: "Result", m_value: index < 5 ? "Win" : "Loss" },
      { m_key: "Tier 1 Choice", m_value: "AbathurPressurizedGlands" },
    ],
  }));
  const score = (name: string, value: number) => ({
    m_name: name,
    m_values: handles.map(() => [{ m_value: value }]),
  });
  const levels = {
    m_name: "Level",
    m_values: handles.map((_, index) => [{ m_value: index < 5 ? 20 : 19 }]),
  };

  return {
    ok: true,
    build: 94786,
    protocolVersion: 94786,
    header: {
      m_version: { m_baseBuild: 94786 },
      m_elapsedGameLoops: 19_810,
    },
    readRawFile: () => Buffer.alloc(0),
    decodeDetails: () => ({
      m_timeUTC: (Date.parse("2025-05-07T15:30:00.000Z") + 11_644_473_600_000) * 10_000,
      m_title: "저주받은 골짜기",
      m_playerList: handles.map((_, index) => ({
        m_name: `player${index + 1}`,
        m_hero: "아바투르",
        m_teamId: index < 5 ? 0 : 1,
        m_toon: {
          m_region: 3,
          m_programId: "Hero",
          m_realm: 1,
          m_id: index + 1,
        },
      })),
    }),
    decodeAttributesEvents: () => ({ scopes: { 16: {} } }),
    decodeTrackerEvents: () => [
      ...playerInitEvents,
      { _eventid: 10, m_eventName: "GatesOpen", _gameloop: 610 },
      {
        _eventid: 11,
        m_instanceList: [
          score("SoloKill", 1),
          score("Deaths", 2),
          score("Takedowns", 3),
          score("HeroDamage", 12_000),
          levels,
        ],
      },
      ...talentEvents,
    ],
  };
}
