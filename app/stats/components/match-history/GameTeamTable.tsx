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

  return (
    <div
      className={`p-4 border-t shrink-0 lg:border-t-0 lg:border-l border-white/10 ${accent} ${getTeamBackgroundClass(
        result
      )}`}
    >
      <p className="text-xs text-gray-500 mb-3">{title}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-white/10">
            <th className="py-2 font-medium"></th>
            <th className="py-2 pr-3 font-medium">플레이어</th>
            <th className="py-2 pr-3 font-medium">Kill / Death / Takedown</th>
            <th className="py-2 pr-3 font-medium">가한 데미지</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr
              key={member.player.id}
              className="border-b border-white/5 last:border-b-0 overflow-x-scroll"
            >
              <td className="py-2 text-center max-md:pr-3">
                <Image
                  src={HeroImage[member.hero as Hero]}
                  className="rounded-2xl"
                  alt={member.hero}
                  width="35"
                  height="35"
                />
              </td>
              <td className="py-2 pr-3">
                <div className="font-medium text-white">
                  {member.player.nickname}
                </div>
                <div className="text-xs text-gray-500">
                  {member.player.name}
                </div>
              </td>
              <td className="py-2 pr-3">
                <p className="flex max-md:flex-col">
                  <span className="text-sm font-medium mr-2">
                    {member.kills} / {member.deaths} / {member.takedowns}
                  </span>
                  <span className="text-xs text-gray-400">
                    (
                    {Math.round(((member.takedowns ?? 0) / totalKill) * 10000) /
                      100}
                    %)
                  </span>
                </p>
              </td>
              <td className="py-2 pr-3">
                {member.heroDamage ? commarize(member.heroDamage) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getTeamBackgroundClass(result: string | null): string {
  if (result === "WIN") return "bg-blue-500/10";
  if (result === "LOSE") return "bg-red-500/10";
  return "bg-white/0";
}
