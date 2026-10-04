import type { MatchHistoryItem } from "@/domain/hots/types/match-contract";
import { HeroImage } from "@/domain/hots/constants";
import { HeroRoleLabelMap, HOTS_TALENT_TIERS, Talent } from "@/domain/hots/models";
import { commarize } from "@/utils/commarize";
import { round, sumBy } from "es-toolkit";
import Image from "next/image";
import { Kda } from "./Kda";
import { Ban } from "./Ban";
import { DamageBar } from "@/components/DamageBar";
import { Rank } from "./Rank";

type GameTeamBan = MatchHistoryItem["games"][number]["teams"][number]["bans"][number];

type MemberWithRank = MatchHistoryItem["games"][number]["teams"][number]["members"][number] & {
  rank: number;
};

interface GameTeamTableProps {
  readonly title: string;
  readonly level: number | undefined;
  readonly result: string | null;
  readonly bans: GameTeamBan[];
  readonly members: MemberWithRank[];
  readonly side: 1 | 2;
}

const SIDE_STYLE = {
  1: { name: "text-cyan-300", won: "bg-cyan-400/10 text-cyan-300 border-transparent", bar: "bg-cyan-400/60" },
  2: {
    name: "text-fuchsia-300",
    won: "bg-fuchsia-400/10 text-fuchsia-300 border-transparent",
    bar: "bg-fuchsia-400/60",
  },
} as const;

const RESULT_LABEL: Record<string, string> = { WIN: "승", LOSE: "패" };

export function GameTeamTable({ title, level, result, bans, members, side }: GameTeamTableProps) {
  const style = SIDE_STYLE[side];
  const totalKill = sumBy(members, (m) => m.kills);
  const maxHeroDamage = Math.max(...members.map((m) => m.heroDamage));
  const maxDamageTaken = Math.max(...members.map((m) => m.damageTaken));

  return (
    <div className={`p-4 pb-1 min-w-0 rounded-xl border border-white/10 ${getTeamBackgroundClass(result)}`}>
      <div className="flex items-center gap-2.5 mb-3">
        <span className={`text-base font-black ${style.name}`}>{title}</span>
        <span
          className={`px-1.5 py-0.5 rounded text-base font-black border ${
            result === "WIN" ? style.won : "text-gray-400 border-white/10"
          }`}
        >
          {(result && RESULT_LABEL[result]) ?? "무"}
        </span>
        <span className="text-base text-gray-400 font-medium tabular-nums">
          {level ? `Lv ${level} · ` : ""}
          {totalKill}킬
        </span>
      </div>

      <Ban bans={bans} />

      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-md min-w-[540px] whitespace-nowrap">
          <thead>
            <tr className="text-base text-gray-300 tracking-tighter border-b border-white/5">
              <th className="pb-2 text-left font-bold w-8"></th>
              <th className="pb-2 text-left font-bold w-auto min-w-40"></th>
              <th className="pb-2 text-center font-bold w-26">OP Score</th>
              <th className="pb-2 text-center font-bold w-36">K/D/T</th>
              <th className="pb-2 text-center font-bold w-20">피해량</th>
              <th className="pb-2 text-center font-bold w-20">받은 피해량</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {members.map((member) => {
              const isBestOnTeam = Math.min(...members.map((m) => m.rank)) === member.rank;

              return (
                <tr key={member.player.id}>
                  <td className="py-2.5">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden">
                      <Image
                        src={HeroImage[member.hero]}
                        alt={member.hero}
                        width={30}
                        height={30}
                        className="object-cover"
                      />
                    </div>
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="font-bold text-gray-200 text-base whitespace-nowrap">{member.player.nickname}</div>
                    <div className="text-sm text-gray-500 font-medium">
                      {member.player.name} · {HeroRoleLabelMap[member.position]}
                    </div>
                    {member.talents.length > 0 && <TalentStrip talents={member.talents} />}
                  </td>

                  <td className="py-2.5 text-center">
                    <span className="text-sm text-gray-300 font-bold tabular-nums mx-2">
                      {round(member.rankScore, 1)}
                    </span>
                    <Rank rank={member.rank} isWinnerTeam={result === "WIN"} isBestOnTeam={isBestOnTeam} />
                  </td>

                  <td className="py-2.5 text-center">
                    <div className="flex flex-col items-center">
                      <div>
                        <span className="text-sm md:text-base font-bold text-gray-300 tabular-nums">
                          {member.kills} / {member.deaths} / {member.takedowns}
                        </span>
                        <span className="ml-2 text-sm md:text-base text-gray-500 font-bold">
                          ({totalKill > 0 ? `${Math.round((member.takedowns / totalKill) * 100)}%` : "0%"})
                        </span>
                      </div>
                      <Kda deaths={member.deaths} takedowns={member.takedowns} />
                    </div>
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex flex-col items-center gap-1">
                      <span className="tabular-nums text-base font-bold text-gray-300">
                        {member.heroDamage ? commarize(member.heroDamage) : "-"}
                      </span>
                      {typeof member.heroDamage === "number" && maxHeroDamage > 0 ? (
                        <DamageBar damage={member.heroDamage} maxDamage={maxHeroDamage} color={style.bar} />
                      ) : (
                        <div className="w-16 h-1 bg-white/5 rounded" />
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex flex-col items-center gap-1">
                      <span className="tabular-nums text-base font-bold text-gray-300">
                        {member.damageTaken ? commarize(member.damageTaken) : "-"}
                      </span>
                      {maxDamageTaken > 0 ? (
                        <DamageBar damage={member.damageTaken} maxDamage={maxDamageTaken} color="bg-gray-100/50" />
                      ) : (
                        <div className="w-16 h-1 bg-white/5 rounded" />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getTeamBackgroundClass(result: string | null) {
  if (result === "WIN") return "bg-blue-500/10";
  if (result === "LOSE") return "bg-red-500/10";
  return "bg-white/3";
}

function TalentStrip({ talents }: { readonly talents: ReadonlyArray<Talent> }) {
  const talentByTier = new Map(talents.map((talent) => [talent.tier, talent] as const));

  return (
    <div className="mt-1.5 flex gap-0.5">
      {HOTS_TALENT_TIERS.map((tier) => {
        const talent = talentByTier.get(tier);
        const label = talent?.talentKey ?? talent?.rawCode ?? `${tier} 특성`;

        return (
          <div
            key={tier}
            className="relative h-6 w-6 shrink-0 overflow-hidden rounded border border-white/10 bg-white/5"
            title={`${tier}레벨: ${label}`}
          >
            {talent?.imagePath ? (
              <Image src={talent.imagePath} alt={label} fill sizes="22px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[9px] font-black text-gray-500">
                {tier}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
