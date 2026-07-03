import type { Facility } from "../types";
import { FACILITY_STATUSES, FACILITY_TYPES } from "../types";

interface Props {
  facilities: Facility[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function FacilityList({ facilities, selectedId, onSelect }: Props) {
  if (facilities.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        営業先がありません。
        <br />
        「+」ボタンから登録してください。
      </div>
    );
  }
  return (
    <ul className="divide-y divide-gray-100">
      {facilities.map((f) => (
        <li key={f.id}>
          <button
            onClick={() => onSelect(f.id)}
            className={`w-full px-4 py-3 text-left ${f.id === selectedId ? "bg-blue-50" : "hover:bg-gray-50"}`}
          >
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: FACILITY_TYPES[f.type].color }} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.name}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${FACILITY_STATUSES[f.status].badge}`}>
                {FACILITY_STATUSES[f.status].label}
              </span>
            </div>
            {f.address && <div className="mt-0.5 truncate pl-5 text-xs text-gray-500">{f.address}</div>}
          </button>
        </li>
      ))}
    </ul>
  );
}
