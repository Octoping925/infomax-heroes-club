import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { REPLAY_MAX_CONFIRM_BODY_BYTES } from "@/config/replay-import";
import { MatchServiceError } from "@/domain/hots/service/match/errors";

const mocks = vi.hoisted(() => ({
  createMatchFromReplays: vi.fn(),
}));

vi.mock("@/domain/hots/service/match/create-from-replays", () => ({
  createMatchFromReplays: mocks.createMatchFromReplays,
}));

import { config as proxyConfig, proxy } from "@/proxy";
import { POST } from "./route";

const validBody = {
  drafts: [{ token: "signed-draft", gameNumber: 1, orientation: "NORMAL" }],
  playerMappings: { rawPlayer: "player-id" },
  team1LeaderId: "leader-1",
  team2LeaderId: "leader-2",
  type: "LUNCH",
};

describe("POST /api/matches/replays/confirm", () => {
  beforeEach(() => {
    mocks.createMatchFromReplays.mockResolvedValue({
      matchId: "match-1",
      gamesCreated: 1,
      idempotent: false,
    });
  });

  it("creates one match from the reviewed signed drafts", async () => {
    const response = await POST(createJsonRequest(validBody));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      matchId: "match-1",
      gamesCreated: 1,
      alreadyImported: false,
    });
    expect(mocks.createMatchFromReplays).toHaveBeenCalledOnce();
    expect(mocks.createMatchFromReplays).toHaveBeenCalledWith(validBody);
  });

  it("returns the same compact result for an idempotent retry", async () => {
    mocks.createMatchFromReplays.mockResolvedValue({
      matchId: "existing-match",
      gamesCreated: 3,
      idempotent: true,
    });

    const response = await POST(createJsonRequest(validBody));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      matchId: "existing-match",
      gamesCreated: 3,
      alreadyImported: true,
    });
  });

  it.each([
    ["expired or tampered draft", "리플레이 초안이 만료되었거나 올바르지 않습니다. 다시 파싱해 주세요."],
    ["invalid mapping", "플레이어 매핑이 필요합니다: rawPlayer"],
    ["invalid leader", "리더는 첫 게임에서 정의된 각 원래 팀의 멤버여야 합니다."],
    ["invalid type", "type은 LUNCH 또는 DINNER여야 합니다."],
  ])("maps a service validation error for %s", async (_name, message) => {
    mocks.createMatchFromReplays.mockRejectedValue(new MatchServiceError(message));

    const response = await POST(createJsonRequest(validBody));

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: { code: "MATCH_CONFIRM_INVALID", message },
    });
  });

  it("maps a replay overlap to a stable conflict response", async () => {
    const message = "이미 저장된 리플레이와 요청 내용이 충돌합니다.";
    mocks.createMatchFromReplays.mockRejectedValue(new MatchServiceError(message, 409));

    const response = await POST(createJsonRequest(validBody));

    expect(response.status).toBe(409);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: { code: "MATCH_CONFIRM_CONFLICT", message },
    });
  });

  it.each([
    ["missing body", createRequest(undefined), 400, "MISSING_CONFIRM_BODY"],
    ["malformed JSON", createRequest("{"), 400, "INVALID_CONFIRM_JSON"],
    [
      "oversized declared body",
      createRequest("{}", String(REPLAY_MAX_CONFIRM_BODY_BYTES + 1)),
      413,
      "CONFIRM_BODY_TOO_LARGE",
    ],
    ["malformed declared size", createRequest("{}", "not-a-number"), 400, "INVALID_CONTENT_LENGTH"],
    [
      "oversized actual body",
      createRequest(`{"padding":"${"x".repeat(REPLAY_MAX_CONFIRM_BODY_BYTES)}"}`),
      413,
      "CONFIRM_BODY_TOO_LARGE",
    ],
  ])("rejects a %s before domain work", async (_name, request, status, code) => {
    const response = await POST(request);

    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: { code, message: expect.any(String) },
    });
    expect(mocks.createMatchFromReplays).not.toHaveBeenCalled();
  });

  it("rejects unsupported content types before domain work", async () => {
    const request = createJsonRequest(validBody);
    request.headers.set("content-type", "text/plain");

    const response = await POST(request);

    expect(response.status).toBe(415);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: {
        code: "UNSUPPORTED_CONTENT_TYPE",
        message: "요청 본문은 JSON 형식이어야 합니다.",
      },
    });
    expect(mocks.createMatchFromReplays).not.toHaveBeenCalled();
  });

  it("sanitizes unexpected failures", async () => {
    mocks.createMatchFromReplays.mockRejectedValue(
      new Error("private signed-draft stack and database details"),
    );

    const response = await POST(createJsonRequest(validBody));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.parse(text)).toEqual({
      error: {
        code: "MATCH_CONFIRM_FAILED",
        message: "매치 저장에 실패했습니다.",
      },
    });
    expect(text).not.toContain("signed-draft");
    expect(text).not.toContain("database");
    expect(text).not.toContain("stack");
  });

  it("is rejected by the existing auth boundary before domain work", async () => {
    process.env.ADMIN_ACCESS_PASSWORD = "configured";
    const request = createJsonRequest(validBody);

    expect(proxyConfig.matcher).toContain("/api/matches/:path*");
    const response = proxy(request);

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "관리자 로그인이 필요합니다." });
    expect(mocks.createMatchFromReplays).not.toHaveBeenCalled();
  });
});

function createJsonRequest(body: unknown): NextRequest {
  return createRequest(JSON.stringify(body));
}

function createRequest(body: string | undefined, contentLength?: string): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (contentLength !== undefined) {
    headers.set("content-length", contentLength);
  }
  return new NextRequest("http://localhost/api/matches/replays/confirm", {
    method: "POST",
    body,
    headers,
  });
}
