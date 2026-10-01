import type { PlayerListItem } from "@/app/api/players/route";

export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly options: ReadonlyArray<{ readonly id: string; readonly label: string }>;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-gray-300">
      <span>{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-white/10 bg-[#141421] px-4 py-3 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 disabled:opacity-50"
      >
        <option value="">선택</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readApiMessage(value: unknown, fallback: string): string {
  if (!isRecord(value)) return fallback;
  if (typeof value.error === "string") return value.error;
  return isRecord(value.error) && typeof value.error.message === "string" ? value.error.message : fallback;
}

export function toSelectOption(player: PlayerListItem): { readonly id: string; readonly label: string } {
  return { id: player.id, label: `${player.nickname} (${player.name})` };
}
