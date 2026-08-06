function encodeVint(value: number): number[] {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Synthetic replay header values must be non-negative integers");
  }

  let remaining = value;
  const bytes: number[] = [];
  let first = (remaining & 0x3f) << 1;
  remaining = Math.floor(remaining / 0x40);

  if (remaining > 0) {
    first |= 0x80;
  }
  bytes.push(first);

  while (remaining > 0) {
    let next = remaining & 0x7f;
    remaining = Math.floor(remaining / 0x80);
    if (remaining > 0) {
      next |= 0x80;
    }
    bytes.push(next);
  }

  return bytes;
}

/**
 * Builds the smallest versioned-data replay header accepted by the Blizzard
 * protocol decoder: an outer header struct containing only m_version, whose
 * nested struct contains only m_baseBuild.
 */
export function createSyntheticReplayHeader(baseBuild: number): Buffer {
  return Buffer.from([
    5,
    ...encodeVint(1),
    ...encodeVint(1),
    5,
    ...encodeVint(1),
    ...encodeVint(5),
    9,
    ...encodeVint(baseBuild),
  ]);
}
