import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

export const HEROPROTOCOL_SNAPSHOT = {
  version: "2.0.2",
  commit: "9cc5bccc93a8872b79a877d9f0301917effa5576",
} as const;

const require = createRequire(import.meta.url);
const PROTOCOL_DIRECTORY = join(
  process.cwd(),
  "vendor",
  "heroprotocol",
  "lib",
);
const PROTOCOL_FILE_PATTERN = /^protocol(\d+)\.js$/;
const BOOTSTRAP_BUILD = 29406;

export interface ReplayArchive {
  header: {
    userDataHeader: {
      content: Buffer;
    };
  };
  readFile(name: string): Buffer;
}

export type ReplayArchiveFactory = (source: Buffer) => ReplayArchive;

interface ReplayHeader {
  m_version?: {
    m_baseBuild?: number;
  };
  m_elapsedGameLoops?: number;
  [key: string]: unknown;
}

interface ProtocolModule {
  version: number;
  decodeReplayHeader(content: Buffer): ReplayHeader;
  decodeReplayDetails(content: Buffer): unknown;
  decodeReplayAttributesEvents(content: Buffer): unknown;
  decodeReplayTrackerEvents(content: Buffer): Iterable<unknown>;
  [key: string]: unknown;
}

export interface ParsedReplayRuntime {
  ok: true;
  build: number;
  protocolVersion: number;
  header: ReplayHeader;
  readRawFile(name: string): Buffer;
  decodeDetails(): unknown;
  decodeAttributesEvents(): unknown;
  decodeTrackerEvents(): ReadonlyArray<unknown>;
}

export interface ReplayRuntimeFailure {
  ok: false;
  error:
    | { code: "INVALID_REPLAY" }
    | { code: "UNSUPPORTED_BUILD"; build: number };
}

export type ReplayRuntimeResult = ParsedReplayRuntime | ReplayRuntimeFailure;

/**
 * Opens one replay Buffer without retaining archive state between calls.
 * The MPQ implementation is supplied by the hardened archive boundary in U2.
 */
export function parseReplayBuffer(
  source: Buffer,
  openArchive: ReplayArchiveFactory,
): ReplayRuntimeResult {
  try {
    const archive = openArchive(Buffer.from(source));
    const bootstrap = loadExactProtocol(BOOTSTRAP_BUILD);
    if (!bootstrap) {
      return { ok: false, error: { code: "INVALID_REPLAY" } };
    }

    const bootstrapHeader = bootstrap.decodeReplayHeader(
      archive.header.userDataHeader.content,
    );
    const build = bootstrapHeader.m_version?.m_baseBuild;
    if (!Number.isSafeInteger(build) || build === undefined || build <= 0) {
      return { ok: false, error: { code: "INVALID_REPLAY" } };
    }

    const protocol = loadExactProtocol(build);
    if (!protocol) {
      return {
        ok: false,
        error: { code: "UNSUPPORTED_BUILD", build },
      };
    }

    const header = protocol.decodeReplayHeader(
      archive.header.userDataHeader.content,
    );

    return {
      ok: true,
      build,
      protocolVersion: protocol.version,
      header,
      readRawFile(name: string): Buffer {
        return Buffer.from(archive.readFile(name));
      },
      decodeDetails(): unknown {
        return protocol.decodeReplayDetails(archive.readFile("replay.details"));
      },
      decodeAttributesEvents(): unknown {
        return protocol.decodeReplayAttributesEvents(
          archive.readFile("replay.attributes.events"),
        );
      },
      decodeTrackerEvents(): ReadonlyArray<unknown> {
        return Array.from(
          protocol.decodeReplayTrackerEvents(
            archive.readFile("replay.tracker.events"),
          ),
        );
      },
    };
  } catch {
    return { ok: false, error: { code: "INVALID_REPLAY" } };
  }
}

export function getBundledProtocolBuilds(): readonly number[] {
  return readdirSync(PROTOCOL_DIRECTORY)
    .flatMap((file) => {
      const match = PROTOCOL_FILE_PATTERN.exec(file);
      return match ? [Number(match[1])] : [];
    })
    .sort((left, right) => left - right);
}

function loadExactProtocol(build: number): ProtocolModule | null {
  if (!getBundledProtocolBuilds().includes(build)) {
    return null;
  }

  const loaded: unknown = require(join(PROTOCOL_DIRECTORY, `protocol${build}.js`));
  return isProtocolModule(loaded, build) ? loaded : null;
}

function isProtocolModule(value: unknown, build: number): value is ProtocolModule {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.version === build &&
    typeof candidate.decodeReplayHeader === "function" &&
    typeof candidate.decodeReplayDetails === "function" &&
    typeof candidate.decodeReplayAttributesEvents === "function" &&
    typeof candidate.decodeReplayTrackerEvents === "function"
  );
}
