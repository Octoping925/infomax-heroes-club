import { MatchHistoryItem } from "@/app/api/matches/route";
import { HeroImage, HeroMap } from "@/domain/hots/constants/hero";
import { Hero } from "@/domain/hots/models/hero";
import Image from "next/image";

type GameTeamBan =
  MatchHistoryItem["games"][number]["teams"][number]["bans"][number];

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
      const heroKey = ban.hero as Hero;
      const heroLabel =
        (HeroMap as Record<string, string>)[ban.hero] ?? ban.hero;
      const heroImage = (HeroImage as Record<string, string | undefined>)[
        ban.hero
      ];

      return {
        heroKey,
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
        const { heroKey, heroLabel, heroImage } = ban;

        return (
          <div
            key={`${ban.banOrder}:${ban.hero}`}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10"
            title={`${ban.banOrder}밴 · ${heroLabel}`}
          >
            <span className="text-xs text-gray-300 font-bold tabular-nums mr-2">
              {ban.banOrder}
            </span>
            {heroImage ? (
              <div className="relative w-5 h-5 rounded-md overflow-hidden">
                <Image
                  src={heroImage}
                  alt={heroLabel}
                  width={20}
                  height={20}
                  className="object-cover"
                />
              </div>
            ) : (
              <span className="text-xs text-gray-300 font-bold">{heroKey}</span>
            )}
            <span className="text-xs text-gray-300 font-bold">{heroLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
