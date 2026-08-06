import { NextRequest, NextResponse } from "next/server";
import { REPLAY_MAX_CONFIRM_BODY_BYTES } from "@/config/replay-import";
import { createMatchFromReplays } from "@/domain/hots/service/match/create-from-replays";
import { MatchServiceError } from "@/domain/hots/service/match/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

type ConfirmErrorCode =
  | "MISSING_CONFIRM_BODY"
  | "INVALID_CONFIRM_JSON"
  | "INVALID_CONTENT_LENGTH"
  | "CONFIRM_BODY_TOO_LARGE"
  | "UNSUPPORTED_CONTENT_TYPE"
  | "MATCH_CONFIRM_INVALID"
  | "MATCH_CONFIRM_CONFLICT"
  | "MATCH_CONFIRM_FAILED";

const ERROR_MESSAGES: Readonly<Record<ConfirmErrorCode, string>> = {
  MISSING_CONFIRM_BODY: "저장할 리플레이 정보를 입력해 주세요.",
  INVALID_CONFIRM_JSON: "요청 본문이 올바른 JSON 형식이 아닙니다.",
  INVALID_CONTENT_LENGTH: "요청 본문 크기가 올바르지 않습니다.",
  CONFIRM_BODY_TOO_LARGE: "매치 저장 요청이 허용된 크기를 초과했습니다.",
  UNSUPPORTED_CONTENT_TYPE: "요청 본문은 JSON 형식이어야 합니다.",
  MATCH_CONFIRM_INVALID: "매치 저장 요청이 올바르지 않습니다.",
  MATCH_CONFIRM_CONFLICT: "이미 저장된 리플레이와 요청 내용이 충돌합니다.",
  MATCH_CONFIRM_FAILED: "매치 저장에 실패했습니다.",
};

class ConfirmRequestError extends Error {
  readonly code: ConfirmErrorCode;
  readonly status: number;

  constructor(code: ConfirmErrorCode, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    validateContentType(request.headers.get("content-type"));
    validateDeclaredSize(request.headers.get("content-length"));
    const source = await readBoundedBody(request);
    const input = parseJson(source);
    const result = await createMatchFromReplays(input);

    return jsonResponse({
      matchId: result.matchId,
      gamesCreated: result.gamesCreated,
      alreadyImported: result.idempotent,
    });
  } catch (error) {
    if (error instanceof ConfirmRequestError) {
      return errorResponse(error.code, error.status);
    }
    if (error instanceof MatchServiceError && error.status >= 400 && error.status < 500) {
      const code = error.status === 409 ? "MATCH_CONFIRM_CONFLICT" : "MATCH_CONFIRM_INVALID";
      return jsonResponse(
        { error: { code, message: error.message } },
        { status: error.status },
      );
    }
    return errorResponse("MATCH_CONFIRM_FAILED", 500);
  }
}

function validateContentType(value: string | null): void {
  const mediaType = value?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new ConfirmRequestError("UNSUPPORTED_CONTENT_TYPE", 415);
  }
}

function validateDeclaredSize(value: string | null): void {
  if (value === null) {
    return;
  }
  if (!/^\d+$/.test(value)) {
    throw new ConfirmRequestError("INVALID_CONTENT_LENGTH", 400);
  }
  const size = Number(value);
  if (size > REPLAY_MAX_CONFIRM_BODY_BYTES) {
    throw new ConfirmRequestError("CONFIRM_BODY_TOO_LARGE", 413);
  }
  if (size === 0) {
    throw new ConfirmRequestError("MISSING_CONFIRM_BODY", 400);
  }
}

async function readBoundedBody(request: NextRequest): Promise<Buffer> {
  if (!request.body) {
    throw new ConfirmRequestError("MISSING_CONFIRM_BODY", 400);
  }

  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    size += value.byteLength;
    if (size > REPLAY_MAX_CONFIRM_BODY_BYTES) {
      await reader.cancel();
      throw new ConfirmRequestError("CONFIRM_BODY_TOO_LARGE", 413);
    }
    chunks.push(Buffer.from(value));
  }
  if (size === 0) {
    throw new ConfirmRequestError("MISSING_CONFIRM_BODY", 400);
  }
  return Buffer.concat(chunks, size);
}

function parseJson(source: Buffer): unknown {
  try {
    return JSON.parse(source.toString("utf8"));
  } catch {
    throw new ConfirmRequestError("INVALID_CONFIRM_JSON", 400);
  }
}

function errorResponse(code: ConfirmErrorCode, status: number): NextResponse {
  return jsonResponse({ error: { code, message: ERROR_MESSAGES[code] } }, { status });
}

function jsonResponse(body: unknown, init: { readonly status?: number } = {}): NextResponse {
  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store" },
  });
}
