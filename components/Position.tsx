import { HeroRole } from "@/domain/hots/models";

interface Props {
  readonly position: HeroRole;
  readonly large?: boolean;
}

export function Position({ position, large = false }: Props) {
  return (
    <span
      className={`${large ? "text-sm" : "text-xs"} font-medium px-2 py-0.5 rounded ${getPositionColorClass(position)}`}
    >
      {positionMap[position]}
    </span>
  );
}

function getPositionColorClass(position: HeroRole) {
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

const positionMap: Record<HeroRole, string> = {
  TANKER: "탱커",
  OFFLANER: "투사",
  MAIN_DEALER: "메인딜러",
  SUB_DEALER: "서브딜러",
  HEALER: "힐러",
};
