import type { MatchHistoryItem } from "@/domain/hots/types/match-contract";
import { HeroImage, HeroMap } from "@/domain/hots/constants";
import Image from "next/image";

type GameTeamBan = MatchHistoryItem["games"][number]["teams"][number]["bans"][number];

interface Props {
  readonly bans: ReadonlyArray<GameTeamBan>;
}

export function Ban({ bans = [] }: Props) {
  return (
    <div className="flex items-center gap-2 mb-6 text-sm font-bold text-gray-400">
      밴
      {bans
        .toSorted((a, b) => a.banOrder - b.banOrder)
        .map((ban) => {
          const heroLabel = HeroMap[ban.hero] ?? ban.hero;
          const heroImage = HeroImage[ban.hero];

          return (
            <div
              key={ban.hero}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10"
            >
              <span className="text-xs text-gray-300 font-bold tabular-nums mr-2">{ban.banOrder}</span>
              {heroImage ? (
                <Image src={heroImage} alt={ban.hero} width={20} height={20} className="rounded-md object-cover" />
              ) : (
                ban.hero
              )}
              <span className="text-xs text-gray-300 font-bold">{heroLabel}</span>
            </div>
          );
        })}
    </div>
  );
}
