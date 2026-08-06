const SHA_256_PATTERN = /^[a-f0-9]{64}$/;

export function readAcceptedCorrections(value: unknown): Readonly<Record<string, string>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("리플레이 교정 allowlist는 객체여야 합니다.");
  }
  const entries = Object.entries(value);
  if (entries.some(([hash, code]) => !SHA_256_PATTERN.test(hash) || typeof code !== "string")) {
    throw new Error("리플레이 교정 allowlist 항목이 올바르지 않습니다.");
  }
  return Object.fromEntries(entries);
}

export function matchesAcceptedCorrection(
  corrections: Readonly<Record<string, string>>,
  sourceReplayHash: string,
  rejectionCode: string,
): boolean {
  return corrections[sourceReplayHash] === rejectionCode;
}
