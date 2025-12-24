interface DamageBarProps {
  readonly damage: number;
  readonly maxDamage: number;
  readonly color: string;
}

export function DamageBar({ damage, maxDamage, color }: DamageBarProps) {
  return (
    <div className="w-16 h-1 bg-white/5 rounded overflow-hidden">
      <div
        className={`h-full ${color} transition-colors`}
        style={{
          width: `${Math.max(3, Math.round((damage / maxDamage) * 100))}%`,
        }}
      />
    </div>
  );
}
