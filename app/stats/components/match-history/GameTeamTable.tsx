import { MatchHistoryItem } from "@/app/api/matches/route";
import { HeroImage } from "@/domain/hots/constants/hero";
import { Hero } from "@/domain/hots/models/hero";
import { commarize } from "@/utils/commarize";
import { sumBy } from "es-toolkit";
import Image from "next/image";

interface GameTeamTableProps {
  title: string;
  result: string | null;
  members: MatchHistoryItem["games"][number]["teams"][number]["members"][number][];
  accent: string;
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
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b border-white/10">
            <th className="py-2 text-left font-medium min-w-12">{title}</th>
            <th className="py-2 pr-3 text-left font-medium">플레이어</th>
            <th className="py-2 pr-3 font-medium">Kill / Death / Takedown</th>
            <th className="py-2 pr-3 font-medium">피해량</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr
              key={member.player.id}
              className="border-b border-white/5 last:border-b-0 overflow-x-scroll"
            >
              <td className="py-2">
                <Image
                  src={HeroImage[member.hero as Hero]}
                  className="rounded-2xl"
                  alt={member.hero}
                  width="32"
                  height="32"
                />
              </td>
              <td className="max-md:ml-3 py-2 pr-3">
                <div className="font-medium text-white">
                  {member.player.nickname}
                </div>
                <div className="text-xs text-gray-500">
                  {member.player.name}
                </div>
              </td>
              <td className="text-center py-2 pr-3">
                <p className="flex max-md:flex-col justify-center">
                  <span className="text-sm font-medium mr-2">
                    {member.kills} / {member.deaths} / {member.takedowns}
                  </span>
                  <span className="text-xs text-gray-400 leading-[20px]">
                    (
                    {Math.round(((member.takedowns ?? 0) / totalKill) * 10000) /
                      100}
                    %)
                  </span>
                </p>
              </td>
              <td className="py-2 pr-3 text-center">
                <div className="flex flex-col gap-1">
                  <span className="tabular-nums text-gray-200">
                    {member.heroDamage ? commarize(member.heroDamage) : "-"}
                  </span>
                  <div>
                    {typeof member.heroDamage === "number" &&
                    maxHeroDamage > 0 ? (
                      <DamageBar
                        damage={member.heroDamage}
                        maxDamage={maxHeroDamage}
                      />
                    ) : (
                      <div className="flex-1 h-3 min-w-[32px]" />
                    )}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface DamageBarProps {
  damage: number;
  maxDamage: number;
}

function DamageBar({ damage, maxDamage }: DamageBarProps) {
  return (
    <div className="flex-1 h-1 bg-white/5 rounded overflow-hidden min-w-[32px]">
      <div
        className="h-full bg-red-500/60"
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
