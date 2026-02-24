import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    match: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/config/prisma", () => ({
  prisma: mockPrisma,
}));

import { GET, PUT } from "./route";

function createContext(matchId: string): { params: Promise<{ matchId: string }> } {
  return { params: Promise.resolve({ matchId }) };
}

function createJsonRequest(body: unknown): NextRequest {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("/api/matches/[matchId] route", () => {
  beforeEach(() => {
    mockPrisma.match.findUnique.mockReset();
    mockPrisma.match.update.mockReset();
  });

  it("GET은 메타 정보를 반환한다", async () => {
    mockPrisma.match.findUnique.mockResolvedValue({
      id: "m1",
      youtubeUrl: "https://www.youtube.com/watch?v=abcDEF12345",
      highlights: [
        {
          id: "h1",
          seconds: 84,
          note: "한타",
          createdAt: new Date("2026-02-24T00:00:00.000Z"),
        },
      ],
    });

    const response = await GET({} as NextRequest, createContext("m1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toEqual({
      matchId: "m1",
      youtubeUrl: "https://www.youtube.com/watch?v=abcDEF12345",
      highlights: [
        {
          id: "h1",
          seconds: 84,
          note: "한타",
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

  it("PUT은 youtubeUrl 필드가 없으면 400을 반환한다", async () => {
    const response = await PUT(createJsonRequest({}), createContext("m1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "youtubeUrl 필드를 전달해주세요." });
  });

  it("PUT은 유효하지 않은 유튜브 링크를 거부한다", async () => {
    const response = await PUT(createJsonRequest({ youtubeUrl: "https://example.com/abc" }), createContext("m1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "유튜브 링크만 등록할 수 있습니다." });
    expect(mockPrisma.match.update).not.toHaveBeenCalled();
  });

  it("PUT은 내전이 없으면 404를 반환한다", async () => {
    mockPrisma.match.findUnique.mockResolvedValue(null);

    const response = await PUT(createJsonRequest({ youtubeUrl: "https://youtu.be/abcDEF12345" }), createContext("m1"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "존재하지 않는 내전입니다." });
    expect(mockPrisma.match.update).not.toHaveBeenCalled();
  });

  it("PUT은 유튜브 링크를 정규화해 저장한다", async () => {
    mockPrisma.match.findUnique.mockResolvedValue({ id: "m1" });
    mockPrisma.match.update.mockResolvedValue({ id: "m1" });

    const response = await PUT(
      createJsonRequest({ youtubeUrl: "https://youtu.be/abcDEF12345?t=32" }),
      createContext("m1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      matchId: "m1",
      youtubeUrl: "https://www.youtube.com/watch?v=abcDEF12345",
    });
    expect(mockPrisma.match.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { youtubeUrl: "https://www.youtube.com/watch?v=abcDEF12345" },
    });
  });

  it("PUT은 공백 링크를 null로 저장한다", async () => {
    mockPrisma.match.findUnique.mockResolvedValue({ id: "m1" });
    mockPrisma.match.update.mockResolvedValue({ id: "m1" });

    const response = await PUT(createJsonRequest({ youtubeUrl: "   " }), createContext("m1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, matchId: "m1", youtubeUrl: null });
    expect(mockPrisma.match.update).toHaveBeenCalledWith({ where: { id: "m1" }, data: { youtubeUrl: null } });
  });
});
