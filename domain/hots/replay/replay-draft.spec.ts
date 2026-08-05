import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  REPLAY_DRAFT_MAX_TOKEN_BYTES,
  REPLAY_DRAFT_TTL_SECONDS,
  REPLAY_MAX_BATCH_FILES,
  REPLAY_MAX_CONFIRM_BODY_BYTES,
  REPLAY_MAX_REVIEW_CHOICES_BYTES,
  REPLAY_PARSER_VERSION,
} from "@/config/replay-import";
import decodedReplay from "./__fixtures__/synthetic/decoded-replay.json";
import { normalizeDecodedReplay } from "./normalize-replay";
import {
  issueReplayDraft,
  ReplayDraftError,
  verifyReplayDraft,
} from "./replay-draft";

const SECRET = Buffer.alloc(32, 7).toString("base64url");
const SOURCE_HASH = "a".repeat(64);
const NOW = new Date("2026-08-05T00:00:00.000Z");

describe("replay drafts", () => {
  beforeEach(() => {
    process.env.REPLAY_TOKEN_SECRET = SECRET;
  });

  it("round-trips a canonical normalized replay and its provenance", () => {
    const normalizedReplay = normalizeDecodedReplay(decodedReplay);
    const token = issueReplayDraft({ normalizedReplay, sourceReplayHash: SOURCE_HASH }, { now: NOW });

    expect(verifyReplayDraft(token, { now: NOW })).toEqual({
      version: 1,
      parserVersion: REPLAY_PARSER_VERSION,
      sourceReplayHash: SOURCE_HASH,
      issuedAt: Math.floor(NOW.getTime() / 1_000),
      expiresAt: Math.floor(NOW.getTime() / 1_000) + REPLAY_DRAFT_TTL_SECONDS,
      normalizedReplay,
    });
  });

  it("rejects changed payloads and signatures", () => {
    const token = issueReplayDraft(
      { normalizedReplay: normalizeDecodedReplay(decodedReplay), sourceReplayHash: SOURCE_HASH },
      { now: NOW },
    );
    const [payload, signature] = token.split(".");
    const changedPayload = `${payload?.slice(0, -1)}${payload?.endsWith("A") ? "B" : "A"}`;
    const changedSignature = `${signature?.slice(0, -1)}${signature?.endsWith("A") ? "B" : "A"}`;

    expectDraftError(`${changedPayload}.${signature}`, "INVALID_SIGNATURE");
    expectDraftError(`${payload}.${changedSignature}`, "INVALID_SIGNATURE");
  });

  it("rejects a validly signed draft from another parser version", () => {
    const token = issueReplayDraft(
      { normalizedReplay: normalizeDecodedReplay(decodedReplay), sourceReplayHash: SOURCE_HASH },
      { now: NOW },
    );
    const [payload] = token.split(".");
    const claims = JSON.parse(Buffer.from(payload!, "base64url").toString("utf8"));
    claims.parserVersion = "obsolete-parser";
    const changedPayload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    const signature = createHmac("sha256", Buffer.from(SECRET, "base64url"))
      .update(changedPayload)
      .digest("base64url");

    expectDraftError(`${changedPayload}.${signature}`, "PARSER_VERSION_MISMATCH");
  });

  it("rejects expired drafts", () => {
    const token = issueReplayDraft(
      { normalizedReplay: normalizeDecodedReplay(decodedReplay), sourceReplayHash: SOURCE_HASH },
      { now: NOW },
    );
    const afterExpiry = new Date(NOW.getTime() + REPLAY_DRAFT_TTL_SECONDS * 1_000);

    expectDraftError(token, "DRAFT_EXPIRED", afterExpiry);
  });

  it("fails closed when the dedicated secret is missing, short, or not base64url", () => {
    for (const value of [undefined, Buffer.alloc(31).toString("base64url"), "not+a/base64url=="]) {
      if (value === undefined) {
        delete process.env.REPLAY_TOKEN_SECRET;
      } else {
        process.env.REPLAY_TOKEN_SECRET = value;
      }
      expect(() => issueReplayDraft({
        normalizedReplay: normalizeDecodedReplay(decodedReplay),
        sourceReplayHash: SOURCE_HASH,
      }, { now: NOW })).toThrowError("REPLAY_TOKEN_SECRET");
    }
  });

  it("keeps ten bounded drafts and all bounded choices below the confirm-body budget", () => {
    const body = JSON.stringify({
      drafts: Array.from(
        { length: REPLAY_MAX_BATCH_FILES },
        () => "x".repeat(REPLAY_DRAFT_MAX_TOKEN_BYTES),
      ),
      choices: "x".repeat(REPLAY_MAX_REVIEW_CHOICES_BYTES),
    });

    expect(Buffer.byteLength(body)).toBeLessThan(REPLAY_MAX_CONFIRM_BODY_BYTES);
  });
});

function expectDraftError(token: string, code: string, now: Date = NOW): void {
  try {
    verifyReplayDraft(token, { now });
    throw new Error(`Expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(ReplayDraftError);
    expect((error as ReplayDraftError).code).toBe(code);
  }
}
