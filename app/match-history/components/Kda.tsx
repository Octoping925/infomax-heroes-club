interface KdaProps {
  readonly deaths: number;
  readonly takedowns: number;
}

export function Kda({ deaths, takedowns }: KdaProps) {
  const kda = takedowns / deaths;

  if (deaths === 0) {
    return <span className="text-xs font-bold text-yellow-500">PERFECT</span>;
  }

  return <span className={`text-xs font-bold ${getKdaColor(kda)}`}>KDA: {kda.toFixed(2)}:1</span>;
}

function getKdaColor(kda: number): string {
  if (kda >= 10) return "text-rose-400"; // rainbow
  if (kda >= 6) return "text-orange-500";
  if (kda >= 3) return "text-blue-500";
  return "text-gray-500";
}
