export function formatNumberOrDash(value: number | string | null): string {
  return value === null || value === undefined ? "-" : String(value);
}

export function formatNumber(value: number, decimals: number = 1) {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(decimals);
}
