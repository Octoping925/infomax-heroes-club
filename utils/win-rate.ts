export function calculateWinRate(win: number, lose: number, draw: number) {
  const winRate = (win + draw / 2) / (win + lose + draw);
  return Math.round(winRate * 10000) / 100;
}
