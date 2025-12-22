import { MatchHistoryItem } from "@/app/api/matches/route";
import { HeroImage } from "@/domain/hots/constants/hero";
import { Hero } from "@/domain/hots/models/hero";
import { commarize } from "@/utils/commarize";
import { sumBy } from "es-toolkit";
import Image from "next/image";

interface GameTeamTableProps {
  readonly title: string;
  readonly result: string | null;
  readonly members: MatchHistoryItem["games"][number]["teams"][number]["members"][number][];
  readonly accent: string;
}

export function GameTeamTable({
  title,
  result,
  members,
  accent,
}: GameTeamTableProps) {
  const totalKill = sumBy(members, (m) => m.kills ?? 0);
  const maxHeroDamage = Math.max(...members.map((m) => m.heroDamage || 0));

  return (
    <div
      className={`p-4 pb-1 border-t shrink-0 lg:border-t-0 lg:border-l border-white/10 ${accent} ${getTeamBackgroundClass(
        result
      )}`}
    >
      <div className="text-sm mb-3 gap-3 text-gray-300 font-bold">
        팀 킬: {totalKill}
      </div>

      <div className="overflow-x-auto overflow-y-hidden">
        <table className="w-full text-md min-w-[360px]">
          <thead>
            <tr className="text-xs text-gray-400 tracking-tighter border-b border-white/5">
              <th className="pb-2 text-left font-bold w-10">{title}</th>
              <th className="pb-2 text-left font-bold"></th>
              <th className="pb-2 text-center font-bold">
                Kill / Death / Takedown
              </th>
              <th className="pb-2 text-right font-bold w-24">피해량</th>
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
                      fill
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
                <td className="py-2.5 px-2 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-gray-300 tabular-nums">
                      {member.kills} / {member.deaths} / {member.takedowns}
                    </span>
                    <span className="text-xs text-gray-500 font-bold">
                      (
                      {totalKill > 0
                        ? `${Math.round(
                            ((member.takedowns ?? 0) / totalKill) * 100
                          )}%`
                        : "0%"}
                      )
                    </span>
                  </div>
                </td>
                <td className="py-2.5 pl-2 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="tabular-nums text-sm font-bold text-gray-300">
                      {member.heroDamage ? commarize(member.heroDamage) : "-"}
                    </span>
                    {typeof member.heroDamage === "number" &&
                    maxHeroDamage > 0 ? (
                      <DamageBar
                        damage={member.heroDamage}
                        maxDamage={maxHeroDamage}
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

interface DamageBarProps {
  readonly damage: number;
  readonly maxDamage: number;
}

function DamageBar({ damage, maxDamage }: DamageBarProps) {
  return (
    <div className="w-16 h-1 bg-white/5 rounded overflow-hidden">
      <div
        className="h-full bg-red-500/50 transition-colors"
        style={{
          width: `${Math.max(3, Math.round((damage / maxDamage) * 100))}%`,
        }}
      />
    </div>
  );
}

function getTeamBackgroundClass(result: string | null): string {
  if (result === "WIN") return "bg-blue-500/10";
  if (result === "LOSE") return "bg-red-500/10";
  return "bg-white/0";
}
