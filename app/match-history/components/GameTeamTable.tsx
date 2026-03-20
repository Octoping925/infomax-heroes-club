import type { MatchHistoryItem } from "@/domain/hots/types/match-contract";
import { HeroImage } from "@/domain/hots/constants";
import { HOTS_TALENT_TIERS } from "@/domain/hots/models";
import { commarize } from "@/utils/commarize";
import { round, sumBy } from "es-toolkit";
import Image from "next/image";
import { Kda } from "./Kda";
import { Ban } from "./Ban";
import { DamageBar } from "@/components/DamageBar";
import { Rank } from "./Rank";
import { Position } from "@/components/Position";

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
  readonly accent: string;
}

export function GameTeamTable({ title, level, result, bans, members, accent }: GameTeamTableProps) {
  const totalKill = sumBy(members, (m) => m.kills);
  const maxHeroDamage = Math.max(...members.map((m) => m.heroDamage));
  const maxDamageTaken = Math.max(...members.map((m) => m.damageTaken));

  return (
    <div
      className={`p-4 pb-1 border-t shrink-0 lg:border-t-0 lg:border-l border-white/10 ${accent} ${getTeamBackgroundClass(result)}`}
    >
      <div className="flex items-center justify-between text-sm mb-3 gap-3 text-gray-300 font-bold">
        <span>
          {title} {level ? `- 레벨 ${level}` : ""}
        </span>
        <span>팀 킬: {totalKill}</span>
      </div>

      <Ban bans={bans} />

      <div className="overflow-x-auto">
        <table className="w-full text-md min-w-[500px]">
          <thead>
            <tr className="text-sm text-gray-300 tracking-tighter border-b border-white/5">
              <th className="pb-2 text-left font-bold w-8"></th>
              <th className="pb-2 text-left font-bold w-auto min-w-26"></th>
              <th className="pb-2 text-center font-bold w-22">포지션</th>
              <th className="pb-2 text-center font-bold w-26">OP Score</th>
              <th className="pb-2 text-center font-bold w-38">K/D/T</th>
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
                    <div className="font-bold text-gray-200 text-sm whitespace-nowrap">{member.player.nickname}</div>
                    <div className="text-xs text-gray-500 font-medium">{member.player.name}</div>
                    {member.talents.length > 0 && <TalentStrip talents={member.talents} />}
                  </td>

                  <td className="py-2.5 text-center">
                    <Position position={member.position} />
                  </td>

                  <td className="py-2.5 text-center">
                    <span className="text-xs text-gray-300 font-bold tabular-nums mx-2">
                      {round(member.rankScore, 1)}
                    </span>
                    <Rank rank={member.rank} isWinnerTeam={result === "WIN"} isBestOnTeam={isBestOnTeam} />
                  </td>

                  <td className="py-2.5 text-center">
                    <div className="flex flex-col items-center">
                      <div>
                        <span className="text-xs md:text-sm font-bold text-gray-300 tabular-nums">
                          {member.kills} / {member.deaths} / {member.takedowns}
                        </span>
                        <span className="ml-2 text-xs md:text-sm text-gray-500 font-bold">
                          ({totalKill > 0 ? `${Math.round((member.takedowns / totalKill) * 100)}%` : "0%"})
                        </span>
                      </div>
                      <Kda deaths={member.deaths} takedowns={member.takedowns} />
                    </div>
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex flex-col items-center gap-1">
                      <span className="tabular-nums text-sm font-bold text-gray-300">
                        {member.heroDamage ? commarize(member.heroDamage) : "-"}
                      </span>
                      {typeof member.heroDamage === "number" && maxHeroDamage > 0 ? (
                        <DamageBar damage={member.heroDamage} maxDamage={maxHeroDamage} color="bg-red-500/50" />
                      ) : (
                        <div className="w-16 h-1 bg-white/5 rounded" />
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex flex-col items-center gap-1">
                      <span className="tabular-nums text-sm font-bold text-gray-300">
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
  return "bg-white/0";
}

function TalentStrip({
  talents,
}: {
  readonly talents: MatchHistoryItem["games"][number]["teams"][number]["members"][number]["talents"];
}) {
  const talentByTier = new Map(talents.map((talent) => [talent.tier, talent] as const));

  return (
    <div className="mt-1.5 flex flex-wrap gap-0.5">
      {HOTS_TALENT_TIERS.map((tier) => {
        const talent = talentByTier.get(tier);
        const label = talent?.talentKey ?? talent?.rawCode ?? `${tier} 특성`;

        return (
          <div
            key={tier}
            className="relative h-5 w-5 overflow-hidden rounded border border-white/10 bg-white/5"
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
