type LunchDinnerUnit = "all" | "lunch" | "dinner";

interface LunchDinnerOptionProps {
  readonly unit: LunchDinnerUnit;
  readonly setUnit: (unit: LunchDinnerUnit) => void;
}

export function LunchDinnerOption({ unit, setUnit }: LunchDinnerOptionProps) {
  return (
    <div className="flex items-center justify-end gap-3 mb-4">
      <label htmlFor="winrate-unit-select" className="text-gray-300 text-sm font-medium">
        구분
      </label>
      <select
        id="winrate-unit-select"
        value={unit}
        onChange={(e) => setUnit(e.target.value as "all" | "lunch" | "dinner")}
        className="bg-white/10 border border-white/20 rounded-md px-3 py-1.5 text-white focus:ring-2 shadow-sm hover:bg-white/20"
      >
        <option value="all">전체</option>
        <option value="lunch">점심</option>
        <option value="dinner">저녁</option>
      </select>
    </div>
  );
}
