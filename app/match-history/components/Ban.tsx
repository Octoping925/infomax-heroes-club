import { MatchHistoryItem } from "@/app/api/matches/route";
import { HeroImage, HeroMap } from "@/domain/hots/constants";
import Image from "next/image";

type GameTeamBan = MatchHistoryItem["games"][number]["teams"][number]["bans"][number];

interface Props {
  readonly bans: ReadonlyArray<GameTeamBan>;
}

export function Ban({ bans }: Props) {
  if (!bans || bans.length === 0) {
    return null;
  }

  const banData = bans
    .toSorted((a, b) => a.banOrder - b.banOrder)
    .map((ban) => {
      const heroLabel = HeroMap[ban.hero] ?? ban.hero;
      const heroImage = HeroImage[ban.hero];

      return {
        heroKey: ban.hero,
        heroLabel,
        heroImage,
        banOrder: ban.banOrder,
        hero: ban.hero,
      };
    });

  return (
    <div className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-500">
      밴
      {banData.map((ban) => {
        const { heroLabel, heroImage } = ban;

        return (
          <div
            key={`${ban.banOrder}:${ban.hero}`}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10"
            title={`${ban.banOrder}밴 · ${heroLabel}`}
          >
            <span className="text-xs text-gray-300 font-bold tabular-nums mr-2">{ban.banOrder}</span>
            {heroImage ? (
              <div className="relative w-5 h-5 rounded-md overflow-hidden">
                <Image src={heroImage} alt={heroLabel} width={20} height={20} className="object-cover" />
              </div>
            ) : (
              <span className="text-xs text-gray-300 font-bold">{ban.hero}</span>
            )}
            <span className="text-xs text-gray-300 font-bold">{heroLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
