export function parseNumber(input: string | null): number | undefined {
  if (input === null) return undefined;
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

export function parseBoolean(input: string | null): boolean | undefined {
  if (input === null) return undefined;
  if (input === "true") return true;
  if (input === "false") return false;
  return undefined;
}
