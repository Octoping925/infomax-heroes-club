import { MatchHistoryItem } from "@/app/api/matches/route";
import { HeroImage, HeroMap } from "@/domain/hots/constants/hero";
import { Hero } from "@/domain/hots/models/hero";
import { commarize } from "@/utils/commarize";
import { formatNumberOrDash } from "@/utils/format";
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
      className={`p-4 border-t lg:border-t-0 lg:border-l border-white/10 ${accent} ${getTeamBackgroundClass(
        result
      )}`}
    >
      <p className="text-xs text-gray-500 mb-3">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-white/10">
              <th className="py-2 font-medium"></th>
              <th className="py-2 pr-3 font-medium">플레이어</th>
              <th className="py-2 pr-3 font-medium">영웅</th>
              <th className="py-2 pr-3 font-medium">킬 / 데스 / 테이크다운</th>
              <th className="py-2 pr-3 font-medium">킬 관여율</th>
              <th className="py-2 pr-3 font-medium">가한 데미지</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.player.id}
                className="border-b border-white/5 last:border-b-0"
              >
                <td className="py-2 flex justify-center">
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
                  {HeroMap[member.hero as Hero] || member.hero}
                </td>
                <td className="py-2 pr-3">
                  {member.kills} / {member.deaths} / {member.takedowns}
                </td>
                <td className="py-2 pr-3">
                  {(
                    (((member.kills ?? 0) + (member.takedowns ?? 0)) /
                      totalKill) *
                    100
                  ).toFixed(2)}
                </td>
                <td className="py-2 pr-3">
                  {member.heroDamage ? commarize(member.heroDamage) : "-"}
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
