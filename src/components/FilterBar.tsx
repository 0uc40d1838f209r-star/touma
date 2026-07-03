import type { FacilityStatus, FacilityType } from "../types";
import { FACILITY_STATUSES, FACILITY_TYPES } from "../types";

interface Props {
  search: string;
  onSearch: (v: string) => void;
  activeTypes: Set<FacilityType>;
  onToggleType: (t: FacilityType) => void;
  activeStatuses: Set<FacilityStatus>;
  onToggleStatus: (s: FacilityStatus) => void;
}

export default function FilterBar({ search, onSearch, activeTypes, onToggleType, activeStatuses, onToggleStatus }: Props) {
  return (
    <div className="space-y-2 border-b border-gray-200 bg-white px-3 py-2">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="名前・住所で検索"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
        {(Object.keys(FACILITY_TYPES) as FacilityType[]).map((t) => {
          const active = activeTypes.has(t);
          return (
            <button
              key={t}
              onClick={() => onToggleType(t)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                active ? "border-transparent text-white" : "border-gray-300 bg-white text-gray-600"
              }`}
              style={active ? { background: FACILITY_TYPES[t].color } : undefined}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: active ? "white" : FACILITY_TYPES[t].color }} />
              {FACILITY_TYPES[t].label}
            </button>
          );
        })}
        <span className="mx-0.5 shrink-0 border-l border-gray-200" />
        {(Object.keys(FACILITY_STATUSES) as FacilityStatus[]).map((s) => {
          const active = activeStatuses.has(s);
          return (
            <button
              key={s}
              onClick={() => onToggleStatus(s)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                active ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-600"
              }`}
            >
              {FACILITY_STATUSES[s].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
