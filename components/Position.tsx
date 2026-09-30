import { HeroRole, HeroRoleLabelMap } from "@/domain/hots/models";
import { Chip } from "./Chip";

interface Props {
  readonly position: HeroRole;
  readonly large?: boolean;
}

export function Position({ position, large = false }: Props) {
  return (
    <Chip textSize={large ? "sm" : "xs"} className={`font-medium ${getPositionStyle(position)}`}>
      {HeroRoleLabelMap[position]}
    </Chip>
  );
}

function getPositionStyle(position: HeroRole) {
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
