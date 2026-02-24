const HOSTS = new Set(["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]);
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{6,}$/;

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function toUrl(input: string): URL {
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(input);
  return new URL(hasScheme ? input : `https://${input}`);
}

function toVideoId(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!VIDEO_ID_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function extractVideoId(url: URL): string | null {
  const host = normalizeHost(url.hostname);
  const segments = url.pathname.split("/").filter((segment) => segment.length > 0);

  if (host === "youtu.be") {
    return toVideoId(segments[0]);
  }

  if (segments[0] === "watch") {
    return toVideoId(url.searchParams.get("v"));
  }

  if (segments[0] === "shorts" || segments[0] === "embed" || segments[0] === "live") {
    return toVideoId(segments[1]);
  }

  return toVideoId(url.searchParams.get("v"));
}

export function extractYoutubeVideoId(input: string): string | null {
  try {
    const url = toUrl(input.trim());
    const host = normalizeHost(url.hostname);
    if (!HOSTS.has(host)) {
      return null;
    }
    return extractVideoId(url);
  } catch {
    return null;
  }
}

export function normalizeYoutubeUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new Error("유튜브 링크를 입력해주세요.");
  }

  const url = toUrl(trimmed);
  const host = normalizeHost(url.hostname);
  if (!HOSTS.has(host)) {
    throw new Error("유튜브 링크만 등록할 수 있습니다.");
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("유효한 유튜브 영상 링크가 아닙니다.");
  }

  const normalized = new URL("https://www.youtube.com/watch");
  normalized.searchParams.set("v", videoId);
  return normalized.toString();
}

export function normalizeYoutubeUrlOrNull(input: string | null | undefined): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return normalizeYoutubeUrl(trimmed);
}

export function buildYoutubeTimestampUrl(youtubeUrl: string, seconds: number): string {
  try {
    const url = new URL(youtubeUrl);
    const normalizedSeconds = Math.max(0, Math.floor(seconds));
    url.searchParams.set("t", String(normalizedSeconds));
    return url.toString();
  } catch {
    return youtubeUrl;
  }
}

export function buildYoutubeEmbedUrl(youtubeUrl: string, seconds = 0): string | null {
  const videoId = extractYoutubeVideoId(youtubeUrl);
  if (!videoId) {
    return null;
  }

  const normalizedSeconds = Math.max(0, Math.floor(seconds));
  const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  embedUrl.searchParams.set("rel", "0");
  embedUrl.searchParams.set("modestbranding", "1");
  embedUrl.searchParams.set("playsinline", "1");
  if (normalizedSeconds > 0) {
    embedUrl.searchParams.set("start", String(normalizedSeconds));
  }
  return embedUrl.toString();
}
