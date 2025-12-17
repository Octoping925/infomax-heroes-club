export function formatNumberOrDash(value: number | string | null): string {
  return value === null || value === undefined ? "-" : String(value);
}
