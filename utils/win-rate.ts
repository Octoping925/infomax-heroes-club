export function calculateWinRate(win: number, lose: number, draw: number) {
  return (win + draw / 2) / (win + lose + draw);
}
