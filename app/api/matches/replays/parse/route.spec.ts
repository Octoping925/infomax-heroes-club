import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  REPLAY_FILE_MAX_BYTES,
  REPLAY_PARSE_RESPONSE_MAX_BYTES,
} from "@/config/replay-import";
import decodedReplay from "@/domain/hots/replay/__fixtures__/synthetic/decoded-replay.json";
import { normalizeDecodedReplay } from "@/domain/hots/replay/normalize-replay";
import { ReplayParseError } from "@/domain/hots/replay/replay-errors";

const mocks = vi.hoisted(() => ({
  parseAndNormalizeReplay: vi.fn(),
  prismaCreate: vi.fn(),
  prismaTransaction: vi.fn(),
}));

vi.mock("@/domain/hots/replay/decode-replay", () => ({
  parseAndNormalizeReplay: mocks.parseAndNormalizeReplay,
}));

vi.mock("@/config/prisma", () => ({
  prisma: {
    game: { create: mocks.prismaCreate },
    $transaction: mocks.prismaTransaction,
  },
}));

import { POST } from "./route";
import { config as proxyConfig, proxy } from "@/proxy";

const SECRET = Buffer.alloc(32, 9).toString("base64url");

describe("POST /api/matches/replays/parse", () => {
  beforeEach(() => {
    process.env.REPLAY_TOKEN_SECRET = SECRET;
    mocks.parseAndNormalizeReplay.mockReturnValue(normalizeDecodedReplay(decodedReplay));
  });

  it("returns one compact signed preview from a raw body without persistence", async () => {
    const source = Buffer.from("synthetic replay");
    const response = await POST(createReplayRequest(source));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.parseAndNormalizeReplay).toHaveBeenCalledOnce();
    expect(mocks.parseAndNormalizeReplay).toHaveBeenCalledWith(source);
    expect(mocks.prismaCreate).not.toHaveBeenCalled();
    expect(mocks.prismaTransaction).not.toHaveBeenCalled();
    expect(body).toMatchObject({
      preview: { map: "CursedHollow", dateKey: "20250508" },
      sourceReplayHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      duplicatePreflight: { status: "unknown" },
    });
    expect(body.draft).toEqual(expect.any(String));
    expect(Buffer.byteLength(JSON.stringify(body))).toBeLessThan(REPLAY_PARSE_RESPONSE_MAX_BYTES);
  });

  it.each([
    ["empty body", Buffer.alloc(0), undefined, 400, "MISSING_REPLAY_BODY"],
    ["oversized actual body", Buffer.alloc(REPLAY_FILE_MAX_BYTES + 1), undefined, 413, "REPLAY_FILE_TOO_LARGE"],
    ["oversized declared body", Buffer.from("small"), REPLAY_FILE_MAX_BYTES + 1, 413, "REPLAY_FILE_TOO_LARGE"],
  ])("rejects an %s before parsing", async (_name, source, declaredSize, status, code) => {
    const response = await POST(createReplayRequest(source, declaredSize));

    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: { code, message: expect.any(String) } });
    expect(mocks.parseAndNormalizeReplay).not.toHaveBeenCalled();
  });

  it("sanitizes parser failures without leaking stacks or decoded events", async () => {
    mocks.parseAndNormalizeReplay.mockImplementation(() => {
      throw new ReplayParseError("INVALID_MPQ", { privateEvent: "secret" });
    });

    const response = await POST(createReplayRequest(Buffer.from("broken")));
    const text = await response.text();

    expect(response.status).toBe(422);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.parse(text)).toEqual({
      error: {
        code: "INVALID_MPQ",
        message: "올바른 히어로즈 리플레이 파일이 아닙니다.",
      },
    });
    expect(text).not.toContain("privateEvent");
    expect(text).not.toContain("stack");
    expect(text).not.toContain("secret");
  });

  it("rejects non-binary content before parsing", async () => {
    const request = createReplayRequest(Buffer.from("not binary"));
    request.headers.set("content-type", "application/json");

    const response = await POST(request);

    expect(response.status).toBe(415);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: { code: "UNSUPPORTED_CONTENT_TYPE", message: expect.any(String) },
    });
    expect(mocks.parseAndNormalizeReplay).not.toHaveBeenCalled();
  });

  it("replaces an oversized preview with a compact no-store error", async () => {
    const preview = normalizeDecodedReplay(decodedReplay);
    mocks.parseAndNormalizeReplay.mockReturnValue({
      ...preview,
      warnings: ["x".repeat(REPLAY_PARSE_RESPONSE_MAX_BYTES)],
    });

    const response = await POST(createReplayRequest(Buffer.from("large preview")));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toEqual({
      error: { code: "REPLAY_RESPONSE_TOO_LARGE", message: expect.any(String) },
    });
    expect(Buffer.byteLength(JSON.stringify(body))).toBeLessThan(REPLAY_PARSE_RESPONSE_MAX_BYTES);
  });

  it("fails closed with a sanitized response when signing is not configured", async () => {
    delete process.env.REPLAY_TOKEN_SECRET;

    const response = await POST(createReplayRequest(Buffer.from("valid")));

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: {
        code: "REPLAY_IMPORT_NOT_CONFIGURED",
        message: "리플레이 업로드 기능이 설정되지 않았습니다.",
      },
    });
  });

  it("is covered by the existing authenticated mutation boundary", async () => {
    process.env.ADMIN_ACCESS_PASSWORD = "configured";
    const request = new NextRequest("http://localhost/api/matches/replays/parse", {
      method: "POST",
      body: Buffer.from("raw"),
      headers: { "content-type": "application/octet-stream" },
    });

    expect(proxyConfig.matcher).toContain("/api/matches/:path*");
    const response = proxy(request);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "관리자 로그인이 필요합니다." });
  });
});

function createReplayRequest(source: Buffer, declaredSize?: number): NextRequest {
  const headers = new Headers({
    "content-type": "application/octet-stream",
  });
  if (declaredSize !== undefined) {
    headers.set("content-length", String(declaredSize));
  }
  return new NextRequest("http://localhost/api/matches/replays/parse", {
    method: "POST",
    body: Uint8Array.from(source),
    headers,
  });
}
