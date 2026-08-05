import { describe, expect, it } from "vitest";
import { createSyntheticMpq } from "./__fixtures__/synthetic/mpq";
import { createSyntheticReplayHeader } from "./__fixtures__/synthetic/replay-header";
import { parseReplayBuffer } from "./parser/parser";
import { ReplayParseError } from "./replay-errors";
import { MAX_MPQ_MEMBER_BYTES, MAX_MPQ_TABLE_ENTRIES, createReplayArchive } from "./validate-mpq";

describe("createReplayArchive", () => {
  it.each([Buffer.alloc(0), Buffer.from("not-an-mpq"), Buffer.from("MPQ\x1b-short", "binary")])(
    "rejects an empty, wrong-magic, or truncated archive",
    (source) => {
      expect(() => createReplayArchive(source)).toThrowError(/INVALID_MPQ/);
    },
  );

  it("rejects table ranges outside the request Buffer", () => {
    const source = createSyntheticMpq([{ name: "replay.details", content: Buffer.from("details") }]);
    source.writeUInt32LE(source.length, 16 + "synthetic-header".length + 16);

    expect(() => createReplayArchive(source)).toThrowError(/INVALID_MPQ/);
  });

  it("rejects member ranges outside the declared archive even when trailing bytes exist", () => {
    const source = createSyntheticMpq([
      { name: "replay.details", content: Buffer.from("details") },
    ]);
    const mpqOffset = 16 + "synthetic-header".length;
    source.writeUInt32LE(64, mpqOffset + 8);
    const archive = createReplayArchive(source);

    expect(() => archive.readFile("replay.details")).toThrowError(/INVALID_MPQ/);
  });

  it("rejects table entry counts above the conservative cap", () => {
    const source = createSyntheticMpq([], {
      hashTableEntries: MAX_MPQ_TABLE_ENTRIES + 1,
    });

    expect(() => createReplayArchive(source)).toThrowError(/MPQ_LIMIT_EXCEEDED/);
  });

  it("reads a request-owned zlib member at the declared boundary", () => {
    const content = Buffer.alloc(64, 7);
    const archive = createReplayArchive(createSyntheticMpq([{ name: "replay.details", content, compression: "zlib" }]));

    expect(archive.readFile("replay.details")).toEqual(content);
  });

  it("connects the U1 Buffer parser to the request-owned MPQ factory", () => {
    const source = createSyntheticMpq([{ name: "replay.details", content: Buffer.from("details") }], {
      userData: createSyntheticReplayHeader(94786),
    });

    expect(parseReplayBuffer(source, createReplayArchive)).toMatchObject({
      ok: true,
      build: 94786,
      protocolVersion: 94786,
    });
  });

  it("stops zlib expansion inside the reader at the declared output size", () => {
    const source = createSyntheticMpq([
      {
        name: "replay.details",
        content: Buffer.alloc(65, 7),
        compression: "zlib",
        declaredSize: 64,
      },
    ]);
    const archive = createReplayArchive(source);

    expect(() => archive.readFile("replay.details")).toThrowError(/MPQ_MEMBER_SIZE_MISMATCH/);
  });

  it("rejects encrypted and unsupported-compression members", () => {
    const encrypted = createReplayArchive(
      createSyntheticMpq([
        {
          name: "replay.details",
          content: Buffer.from("secret"),
          flags: 0x80000000 | 0x01000000 | 0x00010000,
        },
      ]),
    );
    const unsupported = createReplayArchive(
      createSyntheticMpq([
        {
          name: "replay.details",
          content: Buffer.from("data"),
          compression: "unsupported",
        },
      ]),
    );

    try {
      encrypted.readFile("replay.details");
      throw new Error("Expected encrypted member rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(ReplayParseError);
      expect((error as ReplayParseError).code).toBe("MPQ_ENCRYPTED_MEMBER");
    }
    expect(() => unsupported.readFile("replay.details")).toThrowError(/MPQ_UNSUPPORTED_COMPRESSION/);
  });

  it("rejects malformed multi-sector positions before concatenation", () => {
    const positions = Buffer.alloc(8);
    positions.writeUInt32LE(8, 0);
    positions.writeUInt32LE(4, 4);
    const archive = createReplayArchive(
      createSyntheticMpq([
        {
          name: "replay.details",
          content: positions,
          declaredSize: 4_096,
          flags: 0x80000000 | 0x00000200,
        },
      ]),
    );

    expect(() => archive.readFile("replay.details")).toThrowError(/INVALID_MPQ/);
  });

  it("rejects oversized declared members before decompression", () => {
    const archive = createReplayArchive(
      createSyntheticMpq([
        {
          name: "replay.details",
          content: Buffer.from("tiny"),
          compression: "zlib",
          declaredSize: MAX_MPQ_MEMBER_BYTES + 1,
        },
      ]),
    );

    expect(() => archive.readFile("replay.details")).toThrowError(/MPQ_LIMIT_EXCEEDED/);
  });

  it("checks bzip decoded length and the cumulative output budget before returning", () => {
    const source = createSyntheticMpq([
      {
        name: "replay.details",
        content: Buffer.from("encoded"),
        compression: "bzip",
        declaredSize: 9,
      },
    ]);
    const archive = createReplayArchive(source, {
      maxTotalOutputBytes: 9,
      decodeBzip: () => Buffer.alloc(10),
    });

    expect(() => archive.readFile("replay.details")).toThrowError(/MPQ_MEMBER_SIZE_MISMATCH/);
  });

  it("stops the real bzip decoder at the declared output boundary", () => {
    const encoded = Buffer.from(
      "QlpoOTFBWSZTWZaw5OAAAAAIAH/gIAAiAaaYQAwVXmjj6Yu5IpwoSEtYcnAA",
      "base64",
    );
    const archive = createReplayArchive(
      createSyntheticMpq([
        {
          name: "replay.details",
          content: encoded,
          compression: "bzip",
          declaredSize: 9,
        },
      ]),
    );

    expect(() => archive.readFile("replay.details")).toThrowError(/MPQ_MEMBER_SIZE_MISMATCH/);
  });

  it("does not grow cumulative output beyond the request budget", () => {
    const archive = createReplayArchive(
      createSyntheticMpq([
        { name: "replay.details", content: Buffer.alloc(5) },
        { name: "replay.initData", content: Buffer.alloc(5) },
      ]),
      { maxTotalOutputBytes: 9 },
    );

    expect(archive.readFile("replay.details")).toHaveLength(5);
    expect(() => archive.readFile("replay.initData")).toThrowError(/MPQ_LIMIT_EXCEEDED/);
  });
});
