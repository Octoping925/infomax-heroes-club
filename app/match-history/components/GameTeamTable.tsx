import { MatchHistoryItem } from "@/app/api/matches/route";
import { HeroImage } from "@/domain/hots/constants";
import { Hero, HeroRole } from "@/domain/hots/models";
import { commarize } from "@/utils/commarize";
import { sumBy } from "es-toolkit";
import Image from "next/image";
import { Kda } from "./Kda";
import { Ban } from "./Ban";
import { DamageBar } from "@/components/DamageBar";

type GameTeamBan =
  MatchHistoryItem["games"][number]["teams"][number]["bans"][number];

type MemberWithRank = MatchHistoryItem["games"][number]["teams"][number]["members"][number] & {
  rank: number;
};

interface GameTeamTableProps {
  readonly title: string;
  readonly result: string | null;
  readonly bans: GameTeamBan[];
  readonly members: MemberWithRank[];
  readonly accent: string;
}

function getPositionLabel(position: HeroRole): string {
  const positionMap: Record<HeroRole, string> = {
    TANKER: "탱커",
    OFFLANER: "투사",
    MAIN_DEALER: "메인딜",
    SUB_DEALER: "서브딜",
    HEALER: "힐러",
  };
  return positionMap[position] ?? position;
}

export function GameTeamTable({
  title,
  result,
  bans,
  members,
  accent,
}: GameTeamTableProps) {
  const totalKill = sumBy(members, (m) => m.kills ?? 0);
  const maxHeroDamage = Math.max(...members.map((m) => m.heroDamage || 0));
  const maxDamageTaken = Math.max(...members.map((m) => m.damageTaken || 0));

  return (
    <div
      className={`p-4 pb-1 border-t shrink-0 lg:border-t-0 lg:border-l border-white/10 ${accent} ${getTeamBackgroundClass(
        result
      )}`}
    >
      <div className="flex items-center justify-between text-sm mb-3 gap-3 text-gray-300 font-bold">
        <span>{title}</span>
        <span>팀 킬: {totalKill}</span>
      </div>

      <div className="flex items-start gap-2 mb-3">
        <Ban bans={bans} />
      </div>

      <div className="overflow-x-auto overflow-y-hidden">
        <table className="w-full text-md min-w-[360px]">
          <thead>
            <tr className="text-sm text-gray-300 tracking-tighter border-b border-white/5">
              <th className="pb-2 text-left font-bold w-8"></th>
              <th className="pb-2 text-left font-bold"></th>
              <th className="pb-2 text-center font-bold w-20">포지션</th>
              <th className="pb-2 text-center font-bold w-16">등수</th>
              <th className="pb-2 text-center font-bold w-30">K/D/T</th>
              <th className="pb-2 text-center font-bold w-20">피해량</th>
              <th className="pb-2 text-center font-bold w-20">받은 피해량</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {members.map((member) => (
              <tr key={member.player.id}>
                <td className="py-2.5">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden">
                    <Image
                      src={HeroImage[member.hero as Hero]}
                      alt={member.hero}
                      width={30}
                      height={30}
                      className="object-cover"
                    />
                  </div>
                </td>
                <td className="py-2.5 px-2">
                  <div className="font-bold text-gray-200 text-sm">
                    {member.player.nickname}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    {member.player.name}
                  </div>
                </td>

                <td className="py-2.5 text-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${getPositionColorClass(member.position)}`}>
                    {getPositionLabel(member.position)}
                  </span>
                </td>

                <td className="py-2.5 text-center">
                  <span className="text-sm font-bold text-gray-300 tabular-nums">
                    {member.rank}등
                  </span>
                </td>

                <td className="py-2.5 text-center">
                  <div className="flex flex-col items-center">
                    <div>
                      <span className="text-sm font-bold text-gray-300 tabular-nums">
                        {member.kills} / {member.deaths} / {member.takedowns}
                      </span>
                      <span className="ml-2 text-xs text-gray-500 font-bold">
                        (
                        {totalKill > 0
                          ? `${Math.round(
                            (member.takedowns! / totalKill) * 100
                          )}%`
                          : "0%"}
                        )
                      </span>
                    </div>
                    <Kda
                      deaths={member.deaths ?? 0}
                      takedowns={member.takedowns ?? 0}
                    />
                  </div>
                </td>
                <td className="py-2.5 text-right">
                  <div className="flex flex-col items-center gap-1">
                    <span className="tabular-nums text-sm font-bold text-gray-300">
                      {member.heroDamage ? commarize(member.heroDamage) : "-"}
                    </span>
                    {typeof member.heroDamage === "number" &&
                      maxHeroDamage > 0 ? (
                      <DamageBar
                        damage={member.heroDamage}
                        maxDamage={maxHeroDamage}
                        color="bg-red-500/50"
                      />
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
                    {typeof member.damageTaken === "number" &&
                      maxDamageTaken > 0 ? (
                      <DamageBar
                        damage={member.damageTaken}
                        maxDamage={maxDamageTaken}
                        color="bg-gray-100/50"
                      />
                    ) : (
                      <div className="w-16 h-1 bg-white/5 rounded" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getTeamBackgroundClass(result: string | null): string {
  if (result === "WIN") return "bg-blue-500/10";
  if (result === "LOSE") return "bg-red-500/10";
  return "bg-white/0";
}

function getPositionColorClass(position: string): string {
  switch (position) {
    case "TANKER":
      return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    case "OFFLANER":
      return "bg-green-500/20 text-green-300 border-green-500/40";
    case "MAIN_DEALER":
      return "bg-red-500/20 text-red-300 border-red-500/40";
    case "SUB_DEALER":
      return "bg-purple-500/20 text-purple-300 border-purple-500/40";
    case "HEALER":
      return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
    default:
      return "bg-gray-500/20 text-gray-300 border-gray-500/40";
  }
}
