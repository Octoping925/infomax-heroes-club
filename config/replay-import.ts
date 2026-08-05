const MINIMUM_SECRET_BYTES = 32;

export const REPLAY_MAX_BATCH_FILES = 10;
export const REPLAY_FILE_MAX_BYTES = 4_000_000;
export const REPLAY_MPQ_MAX_TABLE_ENTRIES = 1_024;
export const REPLAY_MPQ_MAX_MEMBER_BYTES = 16 * 1024 * 1024;
export const REPLAY_MPQ_MAX_TOTAL_OUTPUT_BYTES = 64 * 1024 * 1024;
export const REPLAY_MPQ_MAX_SECTOR_COUNT = 32_768;
export const REPLAY_DRAFT_TTL_SECONDS = 30 * 60;
export const REPLAY_DRAFT_MAX_TOKEN_BYTES = 200_000;
export const REPLAY_PARSE_RESPONSE_MAX_BYTES = 400_000;
export const REPLAY_MAX_REVIEW_CHOICES_BYTES = 500_000;
export const REPLAY_MAX_CONFIRM_BODY_BYTES = 3_500_000;
export const REPLAY_HEROPROTOCOL_SNAPSHOT = {
  version: "2.0.2",
  commit: "9cc5bccc93a8872b79a877d9f0301917effa5576",
} as const;
export const REPLAY_PARSER_VERSION = `heroprotocol-${REPLAY_HEROPROTOCOL_SNAPSHOT.version}+${REPLAY_HEROPROTOCOL_SNAPSHOT.commit}`;

/**
 * REPLAY_TOKEN_SECRET is an unpadded base64url value containing at least
 * 32 random bytes. Keeping the decoding rule strict prevents a human-readable
 * phrase from accidentally being treated as a high-entropy signing key.
 */
export function getReplayTokenSecret(): Buffer {
  const configured = process.env.REPLAY_TOKEN_SECRET;
  if (!configured || !/^[A-Za-z0-9_-]+$/.test(configured)) {
    throw new ReplayImportConfigurationError();
  }

  const secret = Buffer.from(configured, "base64url");
  if (secret.length < MINIMUM_SECRET_BYTES || secret.toString("base64url") !== configured) {
    throw new ReplayImportConfigurationError();
  }
  return secret;
}

export class ReplayImportConfigurationError extends Error {
  constructor() {
    super("REPLAY_TOKEN_SECRET must be unpadded base64url for at least 32 random bytes");
    this.name = "ReplayImportConfigurationError";
  }
}
