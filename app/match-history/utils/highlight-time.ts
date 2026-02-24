export const MAX_HIGHLIGHT_SECONDS = 8 * 60 * 60;

function padTwo(value: number): string {
  return value.toString().padStart(2, "0");
}

export function formatHighlightTimestamp(seconds: number): string {
  const normalized = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  const remainingSeconds = normalized % 60;
  return `${padTwo(hours)}:${padTwo(minutes)}:${padTwo(remainingSeconds)}`;
}

export function parseHighlightTimestampInput(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > MAX_HIGHLIGHT_SECONDS) {
      return null;
    }
    return Math.floor(seconds);
  }

  const segments = trimmed.split(":");
  if (segments.length !== 2 && segments.length !== 3) {
    return null;
  }

  const numbers = segments.map((segment) => Number(segment));
  if (numbers.some((value) => !Number.isFinite(value) || value < 0 || !Number.isInteger(value))) {
    return null;
  }

  const [first, second, third] = numbers;
  let totalSeconds = 0;

  if (numbers.length === 2) {
    if (second >= 60) {
      return null;
    }
    totalSeconds = first * 60 + second;
  } else {
    if (second >= 60 || (third ?? 0) >= 60) {
      return null;
    }
    totalSeconds = first * 3600 + second * 60 + (third ?? 0);
  }

  if (totalSeconds < 0 || totalSeconds > MAX_HIGHLIGHT_SECONDS) {
    return null;
  }

  return totalSeconds;
}
