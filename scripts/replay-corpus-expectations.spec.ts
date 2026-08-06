import { describe, expect, it } from "vitest";
import {
  matchesAcceptedCorrection,
  readAcceptedCorrections,
} from "./replay-corpus-expectations";

const HASH = "a".repeat(64);

describe("replay corpus expectations", () => {
  it("accepts only the exact replay hash and rejection code pair", () => {
    const corrections = readAcceptedCorrections({ [HASH]: "INVALID_TEAM_SIZE" });

    expect(matchesAcceptedCorrection(corrections, HASH, "INVALID_TEAM_SIZE")).toBe(true);
    expect(matchesAcceptedCorrection(corrections, HASH, "INVALID_REPLAY")).toBe(false);
    expect(matchesAcceptedCorrection(corrections, "b".repeat(64), "INVALID_TEAM_SIZE")).toBe(false);
  });

  it("rejects malformed allowlist entries", () => {
    expect(() => readAcceptedCorrections({ short: "INVALID_REPLAY" })).toThrow();
    expect(() => readAcceptedCorrections({ [HASH]: 1 })).toThrow();
  });
});
