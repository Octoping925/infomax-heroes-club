export function parseNumber(input: string | null): number | undefined {
  if (input === null) return undefined;
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

type ParseClampedIntegerOptions = {
  readonly min: number;
  readonly max: number;
  readonly fallback: number;
  readonly round?: "floor" | "trunc";
};

export function parseClampedInteger(
  input: string | null | undefined,
  { min, max, fallback, round = "floor" }: ParseClampedIntegerOptions,
): number {
  const parsed = parseNumber(input ?? null);
  if (parsed === undefined) {
    return fallback;
  }

  const normalized = round === "trunc" ? Math.trunc(parsed) : Math.floor(parsed);
  return Math.min(Math.max(normalized, min), max);
}

type ParseClampedIntegerParamOptions = ParseClampedIntegerOptions & {
  readonly keys: readonly string[];
};

export function parseClampedIntegerParam(
  searchParams: URLSearchParams,
  { keys, ...options }: ParseClampedIntegerParamOptions,
): number {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value !== null) {
      return parseClampedInteger(value, options);
    }
  }
  return options.fallback;
}

export function parseEnumParam<T extends string>(
  searchParams: URLSearchParams,
  key: string,
  allowedValues: readonly T[],
  fallback: T,
): T {
  const value = searchParams.get(key);
  if (value === null) {
    return fallback;
  }
  return allowedValues.includes(value as T) ? (value as T) : fallback;
}

export function parseBoolean(input: string | null): boolean | undefined {
  if (input === null) return undefined;
  if (input === "true") return true;
  if (input === "false") return false;
  return undefined;
}
