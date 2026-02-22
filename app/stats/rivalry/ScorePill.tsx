interface ScorePillProps {
  readonly label: string;
  readonly value: number;
}

export function ScorePill({ label, value }: ScorePillProps) {
  return (
    <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-sm text-gray-200">{value}</p>
    </div>
  );
}
