import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const nodeRequire = createRequire(import.meta.url);
const PROTOCOL_DIRECTORY = join(
  process.cwd(),
  "vendor",
  "heroprotocol",
  "lib",
);
const PROTOCOL_FILE_PATTERN = /^protocol(\d+)\.js$/;
const BOOTSTRAP_BUILD = 29406;
const BUNDLED_PROTOCOL_BUILD_SET = new Set(
  readdirSync(PROTOCOL_DIRECTORY).flatMap((file) => {
    const match = PROTOCOL_FILE_PATTERN.exec(file);
    return match ? [Number(match[1])] : [];
  }),
);

/**
 * Builds proven against the local replay corpus to use the pinned 94786 wire
 * schema. This is deliberately an allowlist, not a "latest protocol" fallback:
 * every new build remains unsupported until corpus verification adds it here.
 */
export const VERIFIED_PROTOCOL_COMPATIBILITY: Readonly<Record<number, number>> = {
  95301: 94786,
  95817: 94786,
  95918: 94786,
  96477: 94786,
  96881: 94786,
};

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
  decodeTrackerEvents(): Iterable<unknown>;
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
    const archive = openArchive(source);
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

    const protocolBuild = VERIFIED_PROTOCOL_COMPATIBILITY[build] ?? build;
    const protocol = loadExactProtocol(protocolBuild);
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
      decodeTrackerEvents(): Iterable<unknown> {
        return protocol.decodeReplayTrackerEvents(
          archive.readFile("replay.tracker.events"),
        );
      },
    };
  } catch {
    return { ok: false, error: { code: "INVALID_REPLAY" } };
  }
}

function loadExactProtocol(build: number): ProtocolModule | null {
  if (!BUNDLED_PROTOCOL_BUILD_SET.has(build)) {
    return null;
  }

  const loaded: unknown = loadProtocolModule(build);
  return isProtocolModule(loaded, build) ? loaded : null;
}

function loadProtocolModule(build: number): unknown {
  if (typeof __webpack_require__ !== "undefined") {
    // Webpack must see this relative template to include every pinned protocol.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(`../../../../vendor/heroprotocol/lib/protocol${build}.js`);
  }
  return nodeRequire(join(PROTOCOL_DIRECTORY, `protocol${build}.js`));
}

declare const __webpack_require__: unknown;

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
