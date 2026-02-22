import { RivalryParams } from "@/config/query-keys";
import { Dispatch, SetStateAction } from "react";

interface RivalryControlsProps {
  readonly params: RivalryParams;
  readonly setParams: Dispatch<SetStateAction<RivalryParams>>;
}

export function RivalryControls({ params, setParams }: RivalryControlsProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-400">최소 맞대결(내전) 수</span>
        <input
          type="number"
          min={1}
          max={50}
          value={params.minMatches}
          onChange={(e) =>
            setParams((prev) => ({
              ...prev,
              minMatches: Number(e.target.value),
            }))
          }
          className="w-40 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-cyan-500/60"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-400">표시 개수</span>
        <input
          type="number"
          min={1}
          max={200}
          value={params.limit}
          onChange={(e) => setParams((prev) => ({ ...prev, limit: Number(e.target.value) }))}
          className="w-32 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-cyan-500/60"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-400">분석 대상 최신 내전 수</span>
        <input
          type="number"
          min={50}
          max={2000}
          value={params.takeMatches}
          onChange={(e) =>
            setParams((prev) => ({
              ...prev,
              takeMatches: Number(e.target.value),
            }))
          }
          className="w-44 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-cyan-500/60"
        />
      </label>

      <label className="flex items-center gap-2 select-none">
        <input
          type="checkbox"
          checked={params.includeInsufficientSample}
          onChange={(e) =>
            setParams((prev) => ({
              ...prev,
              includeInsufficientSample: e.target.checked,
            }))
          }
          className="accent-cyan-500"
        />
        <span className="text-sm text-gray-300">표본 부족도 포함</span>
      </label>
    </div>
  );
}
