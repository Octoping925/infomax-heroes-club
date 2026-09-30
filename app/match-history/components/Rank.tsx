import { Chip } from "@/components/Chip";

interface Props {
  readonly rank: number;
  readonly isWinnerTeam: boolean;
  readonly isBestOnTeam: boolean;
}

export function Rank({ rank, isWinnerTeam, isBestOnTeam }: Props) {
  if (isBestOnTeam) {
    if (isWinnerTeam) {
      return (
        <Chip className="bg-[#EB9C00] text-white" bold>
          MVP
        </Chip>
      );
    }

    return (
      <Chip className="bg-[#7D59E8] text-white" bold>
        ACE
      </Chip>
    );
  }

  return <Chip className="bg-[#4c4c53] text-white">{rank}등</Chip>;
}
