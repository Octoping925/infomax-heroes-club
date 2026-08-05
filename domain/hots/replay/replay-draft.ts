import { createHmac, timingSafeEqual } from "node:crypto";
import {
  getReplayTokenSecret,
  REPLAY_DRAFT_MAX_TOKEN_BYTES,
  REPLAY_DRAFT_TTL_SECONDS,
  REPLAY_PARSER_VERSION,
} from "@/config/replay-import";
import type { NormalizedReplay } from "./contracts";

const DRAFT_VERSION = 1;
const SHA_256_PATTERN = /^[a-f0-9]{64}$/;

export type ReplayDraftErrorCode =
  | "INVALID_DRAFT"
  | "INVALID_SIGNATURE"
  | "DRAFT_EXPIRED"
  | "PARSER_VERSION_MISMATCH"
  | "DRAFT_TOO_LARGE";

export interface ReplayDraftClaims {
  readonly version: 1;
  readonly parserVersion: string;
  readonly sourceReplayHash: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly normalizedReplay: NormalizedReplay;
}

export class ReplayDraftError extends Error {
  readonly code: ReplayDraftErrorCode;

  constructor(code: ReplayDraftErrorCode) {
    super(code);
    this.name = "ReplayDraftError";
    this.code = code;
  }
}

export function issueReplayDraft(
  input: {
    readonly normalizedReplay: NormalizedReplay;
    readonly sourceReplayHash: string;
  },
  options: { readonly now?: Date } = {},
): string {
  if (!SHA_256_PATTERN.test(input.sourceReplayHash)) {
    throw new ReplayDraftError("INVALID_DRAFT");
  }

  const issuedAt = toEpochSeconds(options.now ?? new Date());
  const claims: ReplayDraftClaims = {
    version: DRAFT_VERSION,
    parserVersion: REPLAY_PARSER_VERSION,
    sourceReplayHash: input.sourceReplayHash,
    issuedAt,
    expiresAt: issuedAt + REPLAY_DRAFT_TTL_SECONDS,
    normalizedReplay: input.normalizedReplay,
  };
  const payload = Buffer.from(canonicalJson(claims)).toString("base64url");
  const signature = sign(payload, getReplayTokenSecret());
  const token = `${payload}.${signature}`;
  if (Buffer.byteLength(token) > REPLAY_DRAFT_MAX_TOKEN_BYTES) {
    throw new ReplayDraftError("DRAFT_TOO_LARGE");
  }
  return token;
}

export function verifyReplayDraft(
  token: string,
  options: { readonly now?: Date } = {},
): ReplayDraftClaims {
  if (Buffer.byteLength(token) > REPLAY_DRAFT_MAX_TOKEN_BYTES) {
    throw new ReplayDraftError("DRAFT_TOO_LARGE");
  }
  const segments = token.split(".");
  if (segments.length !== 2 || !segments[0] || !segments[1]) {
    throw new ReplayDraftError("INVALID_DRAFT");
  }
  const [payload, suppliedSignature] = segments;
  const expectedSignature = sign(payload, getReplayTokenSecret());
  if (!safeEqual(suppliedSignature, expectedSignature)) {
    throw new ReplayDraftError("INVALID_SIGNATURE");
  }

  const claims = parseClaims(payload);
  if (claims.parserVersion !== REPLAY_PARSER_VERSION) {
    throw new ReplayDraftError("PARSER_VERSION_MISMATCH");
  }
  if (toEpochSeconds(options.now ?? new Date()) >= claims.expiresAt) {
    throw new ReplayDraftError("DRAFT_EXPIRED");
  }
  return claims;
}

function parseClaims(payload: string): ReplayDraftClaims {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!isRecord(parsed)) {
      throw new ReplayDraftError("INVALID_DRAFT");
    }
    if (
      parsed.version !== DRAFT_VERSION ||
      typeof parsed.parserVersion !== "string" ||
      !SHA_256_PATTERN.test(readString(parsed.sourceReplayHash)) ||
      !Number.isSafeInteger(parsed.issuedAt) ||
      !Number.isSafeInteger(parsed.expiresAt) ||
      Number(parsed.expiresAt) <= Number(parsed.issuedAt) ||
      !isRecord(parsed.normalizedReplay)
    ) {
      throw new ReplayDraftError("INVALID_DRAFT");
    }
    return parsed as unknown as ReplayDraftClaims;
  } catch (error) {
    if (error instanceof ReplayDraftError) {
      throw error;
    }
    throw new ReplayDraftError("INVALID_DRAFT");
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  const result = JSON.stringify(value);
  if (result === undefined) {
    throw new ReplayDraftError("INVALID_DRAFT");
  }
  return result;
}

function sign(payload: string, secret: Buffer): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function toEpochSeconds(value: Date): number {
  const timestamp = Math.floor(value.getTime() / 1_000);
  if (!Number.isSafeInteger(timestamp)) {
    throw new ReplayDraftError("INVALID_DRAFT");
  }
  return timestamp;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
