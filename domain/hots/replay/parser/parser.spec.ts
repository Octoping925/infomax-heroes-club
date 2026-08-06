import { describe, expect, it } from "vitest";
import { createSyntheticReplayHeader } from "../__fixtures__/synthetic/replay-header";
import {
  parseReplayBuffer,
  type ReplayArchive,
  type ReplayArchiveFactory,
} from "./parser";

const OLD_BUILD = 29406;
const CURRENT_BUILD = 94786;
const VERIFIED_COMPATIBLE_BUILD = 97650;

function createArchiveFactory(): ReplayArchiveFactory {
  return (source: Buffer): ReplayArchive => {
    const build = source.readUInt32BE(0);
    const marker = source.subarray(4);

    return {
      header: {
        userDataHeader: {
          content: createSyntheticReplayHeader(build),
        },
      },
      readFile: () => marker,
    };
  };
}

function createReplayBuffer(build: number, marker: string): Buffer {
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32BE(build);
  return Buffer.concat([prefix, Buffer.from(marker)]);
}

describe("parseReplayBuffer", () => {
  it.each([OLD_BUILD, CURRENT_BUILD])(
    "selects the exact bundled protocol for build %i",
    (build) => {
      const result = parseReplayBuffer(
        createReplayBuffer(build, "fixture"),
        createArchiveFactory(),
      );

      expect(result).toMatchObject({
        ok: true,
        build,
        protocolVersion: build,
      });
    },
  );

  it("rejects a missing build without falling back to the latest protocol", () => {
    const result = parseReplayBuffer(
      createReplayBuffer(99999, "missing"),
      createArchiveFactory(),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: "UNSUPPORTED_BUILD",
        build: 99999,
      },
    });
  });

  it("uses only an explicitly verified compatibility protocol for a newer build", () => {
    const result = parseReplayBuffer(
      createReplayBuffer(VERIFIED_COMPATIBLE_BUILD, "verified"),
      createArchiveFactory(),
    );

    expect(result).toMatchObject({
      ok: true,
      build: VERIFIED_COMPATIBLE_BUILD,
      protocolVersion: CURRENT_BUILD,
    });
  });

  it("keeps archive state owned by each replay request", () => {
    const archiveFactory = createArchiveFactory();
    const first = parseReplayBuffer(
      createReplayBuffer(OLD_BUILD, "first"),
      archiveFactory,
    );
    const second = parseReplayBuffer(
      createReplayBuffer(CURRENT_BUILD, "second"),
      archiveFactory,
    );

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      throw new Error("Synthetic supported builds must parse");
    }

    expect(first.readRawFile("replay.details").toString()).toBe("first");
    expect(second.readRawFile("replay.details").toString()).toBe("second");
    expect(first.readRawFile("replay.details").toString()).toBe("first");
  });
});
