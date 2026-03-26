import { SITE_URL } from "@/config/url";

type QueryValue = string | number | boolean | null | undefined;

export function buildStatsUrl(path: string, params: Record<string, QueryValue> = {}): URL {
  const url = new URL(path, SITE_URL);

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url;
}
