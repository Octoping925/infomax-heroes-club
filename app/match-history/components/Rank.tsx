interface Props {
  readonly rank: number;
  readonly isWinnerTeam: boolean;
  readonly isBestOnTeam: boolean;
}

export function Rank({ rank, isWinnerTeam, isBestOnTeam }: Props) {
  if (isBestOnTeam) {
    if (isWinnerTeam) {
      return <Mvp />;
    }

    return <Ace />;
  }

  return <Chip rank={rank} />;
}

function Chip({ rank }: { readonly rank: number }) {
  return <span className="text-sm px-2 py-0.5 rounded bg-[#4c4c53] text-white">{rank}등</span>;
}

function Mvp() {
  return <span className="text-sm font-bold px-2 py-0.5 rounded bg-[#EB9C00] text-white">MVP</span>;
}

function Ace() {
  return <span className="text-sm font-bold px-2 py-0.5 rounded bg-[#7D59E8] text-white">ACE</span>;
}
