import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    match: {
      findUnique: vi.fn(),
    },
    matchHighlight: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/config/prisma", () => ({
  prisma: mockPrisma,
}));

import { GET, POST } from "./route";

function createContext(matchId: string): { params: Promise<{ matchId: string }> } {
  return { params: Promise.resolve({ matchId }) };
}

function createJsonRequest(body: unknown): NextRequest {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("/api/matches/[matchId]/highlights route", () => {
  beforeEach(() => {
    mockPrisma.match.findUnique.mockReset();
    mockPrisma.matchHighlight.create.mockReset();
  });

  it("GET은 하이라이트 목록을 반환한다", async () => {
    mockPrisma.match.findUnique.mockResolvedValue({
      id: "m1",
      youtubeUrl: "https://www.youtube.com/watch?v=abcDEF12345",
      highlights: [
        {
          id: "h1",
          seconds: 120,
          note: "첫 한타",
          createdAt: new Date("2026-02-24T00:00:00.000Z"),
        },
      ],
    });

    const response = await GET({} as NextRequest, createContext("m1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      matchId: "m1",
      youtubeUrl: "https://www.youtube.com/watch?v=abcDEF12345",
      highlights: [
        {
          id: "h1",
          seconds: 120,
          note: "첫 한타",
          createdAt: "2026-02-24T00:00:00.000Z",
        },
      ],
    });
  });

  it("GET은 내전이 없으면 404를 반환한다", async () => {
    mockPrisma.match.findUnique.mockResolvedValue(null);

    const response = await GET({} as NextRequest, createContext("missing"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "존재하지 않는 내전입니다." });
  });

  it("POST는 유효하지 않은 seconds 값을 거부한다", async () => {
    const response = await POST(createJsonRequest({ seconds: -1, note: "테스트" }), createContext("m1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "seconds는 0 이상 28800 이하의 정수여야 합니다." });
    expect(mockPrisma.match.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.matchHighlight.create).not.toHaveBeenCalled();
  });

  it("POST는 내전이 없으면 404를 반환한다", async () => {
    mockPrisma.match.findUnique.mockResolvedValue(null);

    const response = await POST(createJsonRequest({ seconds: 120, note: "테스트" }), createContext("m1"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "존재하지 않는 내전입니다." });
    expect(mockPrisma.matchHighlight.create).not.toHaveBeenCalled();
  });

  it("POST는 하이라이트를 생성하고 타임스탬프 링크를 반환한다", async () => {
    mockPrisma.match.findUnique.mockResolvedValue({
      id: "m1",
      youtubeUrl: "https://www.youtube.com/watch?v=abcDEF12345",
    });
    mockPrisma.matchHighlight.create.mockResolvedValue({
      id: "h1",
      seconds: 84,
      note: "한타",
      createdAt: new Date("2026-02-24T12:34:56.000Z"),
    });

    const response = await POST(createJsonRequest({ seconds: 84.9, note: "  한타  " }), createContext("m1"));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mockPrisma.matchHighlight.create).toHaveBeenCalledWith({
      data: {
        matchId: "m1",
        seconds: 84,
        note: "한타",
      },
      select: {
        id: true,
        seconds: true,
        note: true,
        createdAt: true,
      },
    });
    expect(body).toEqual({
      success: true,
      highlight: {
        id: "h1",
        seconds: 84,
        note: "한타",
        createdAt: "2026-02-24T12:34:56.000Z",
      },
      youtubeTimestampUrl: "https://www.youtube.com/watch?v=abcDEF12345&t=84",
    });
  });

  it("POST는 영상 링크가 없으면 youtubeTimestampUrl을 null로 반환한다", async () => {
    mockPrisma.match.findUnique.mockResolvedValue({
      id: "m1",
      youtubeUrl: null,
    });
    mockPrisma.matchHighlight.create.mockResolvedValue({
      id: "h2",
      seconds: 30,
      note: null,
      createdAt: new Date("2026-02-24T12:35:00.000Z"),
    });

    const response = await POST(createJsonRequest({ seconds: 30 }), createContext("m1"));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      success: true,
      highlight: {
        id: "h2",
        seconds: 30,
        note: null,
        createdAt: "2026-02-24T12:35:00.000Z",
      },
      youtubeTimestampUrl: null,
    });
  });
});
