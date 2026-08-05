import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ReplayImportConfigurationError,
  REPLAY_FILE_MAX_BYTES,
  REPLAY_PARSE_RESPONSE_MAX_BYTES,
} from "@/config/replay-import";
import { parseAndNormalizeReplay } from "@/domain/hots/replay/decode-replay";
import { issueReplayDraft, ReplayDraftError } from "@/domain/hots/replay/replay-draft";
import { ReplayParseError } from "@/domain/hots/replay/replay-errors";

export const runtime = "nodejs";
export const maxDuration = 60;

type ParseErrorCode =
  | "MISSING_REPLAY_BODY"
  | "REPLAY_FILE_TOO_LARGE"
  | "UNSUPPORTED_CONTENT_TYPE"
  | "REPLAY_RESPONSE_TOO_LARGE"
  | "REPLAY_IMPORT_NOT_CONFIGURED"
  | "REPLAY_PARSE_FAILED";

const ERROR_MESSAGES: Readonly<Record<ParseErrorCode, string>> = {
  MISSING_REPLAY_BODY: "리플레이 파일을 선택해 주세요.",
  REPLAY_FILE_TOO_LARGE: "리플레이 파일은 4,000,000 bytes 이하여야 합니다.",
  UNSUPPORTED_CONTENT_TYPE: "리플레이 파일은 바이너리 형식으로 업로드해야 합니다.",
  REPLAY_RESPONSE_TOO_LARGE: "리플레이 결과가 허용된 크기를 초과했습니다.",
  REPLAY_IMPORT_NOT_CONFIGURED: "리플레이 업로드 기능이 설정되지 않았습니다.",
  REPLAY_PARSE_FAILED: "리플레이를 처리하지 못했습니다.",
};

class ReplayRequestError extends Error {
  readonly code: ParseErrorCode;
  readonly status: number;

  constructor(code: ParseErrorCode, status: number) {
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
    const sourceReplayHash = createHash("sha256").update(source).digest("hex");
    const preview = parseAndNormalizeReplay(source);
    const draft = issueReplayDraft({ normalizedReplay: preview, sourceReplayHash });

    return jsonResponse({
      preview,
      draft,
      sourceReplayHash,
      duplicatePreflight: { status: "unknown" as const },
    });
  } catch (error) {
    if (error instanceof ReplayRequestError) {
      return errorResponse(error.code, error.status);
    }
    if (error instanceof ReplayParseError) {
      return jsonResponse(
        { error: { code: error.code, message: error.userMessage } },
        { status: 422 },
      );
    }
    if (error instanceof ReplayImportConfigurationError) {
      return errorResponse("REPLAY_IMPORT_NOT_CONFIGURED", 503);
    }
    if (error instanceof ReplayDraftError && error.code === "DRAFT_TOO_LARGE") {
      return errorResponse("REPLAY_RESPONSE_TOO_LARGE", 422);
    }
    return errorResponse("REPLAY_PARSE_FAILED", 500);
  }
}

function validateContentType(value: string | null): void {
  const mediaType = value?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/octet-stream" && mediaType !== "application/x-blizzard-replay") {
    throw new ReplayRequestError("UNSUPPORTED_CONTENT_TYPE", 415);
  }
}

function validateDeclaredSize(value: string | null): void {
  if (value === null) {
    return;
  }
  if (!/^\d+$/.test(value)) {
    throw new ReplayRequestError("MISSING_REPLAY_BODY", 400);
  }
  const size = Number(value);
  if (size > REPLAY_FILE_MAX_BYTES) {
    throw new ReplayRequestError("REPLAY_FILE_TOO_LARGE", 413);
  }
  if (size === 0) {
    throw new ReplayRequestError("MISSING_REPLAY_BODY", 400);
  }
}

async function readBoundedBody(request: NextRequest): Promise<Buffer> {
  if (!request.body) {
    throw new ReplayRequestError("MISSING_REPLAY_BODY", 400);
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
    if (size > REPLAY_FILE_MAX_BYTES) {
      await reader.cancel();
      throw new ReplayRequestError("REPLAY_FILE_TOO_LARGE", 413);
    }
    chunks.push(Buffer.from(value));
  }
  if (size === 0) {
    throw new ReplayRequestError("MISSING_REPLAY_BODY", 400);
  }
  return Buffer.concat(chunks, size);
}

function errorResponse(code: ParseErrorCode, status: number): NextResponse {
  return jsonResponse({ error: { code, message: ERROR_MESSAGES[code] } }, { status });
}

function jsonResponse(body: unknown, init: { readonly status?: number } = {}): NextResponse {
  const serialized = JSON.stringify(body);
  if (Buffer.byteLength(serialized) > REPLAY_PARSE_RESPONSE_MAX_BYTES) {
    const fallback = JSON.stringify({
      error: {
        code: "REPLAY_RESPONSE_TOO_LARGE",
        message: ERROR_MESSAGES.REPLAY_RESPONSE_TOO_LARGE,
      },
    });
    return new NextResponse(fallback, {
      status: 422,
      headers: responseHeaders(),
    });
  }
  return new NextResponse(serialized, {
    status: init.status ?? 200,
    headers: responseHeaders(),
  });
}

function responseHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  };
}
