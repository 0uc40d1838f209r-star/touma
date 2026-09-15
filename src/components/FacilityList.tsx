import type { Facility } from "../types";
import { FACILITY_STATUSES, FACILITY_TYPES, totalReferrals } from "../types";

interface Props {
  facilities: Facility[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  lastVisit?: Map<string, string>;
}

export default function FacilityList({ facilities, selectedId, onSelect, lastVisit }: Props) {
  if (facilities.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        営業先がありません。
        <br />
        「+」ボタンから登録してください。
      </div>
    );
  }
  const MAX = 200;
  const shown = facilities.slice(0, MAX);
  return (
    <ul className="space-y-2 p-3">
      {shown.map((f) => {
        const active = f.id === selectedId;
        return (
          <li key={f.id}>
            <button
              onClick={() => onSelect(f.id)}
              className={`w-full rounded-2xl border bg-white p-3.5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md ${
                active ? "border-brand ring-1 ring-brand" : "border-gray-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm"
                  style={{ background: FACILITY_TYPES[f.type].color + "22" }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: FACILITY_TYPES[f.type].color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-gray-900">{f.name}</div>
                  {f.address && <div className="mt-0.5 truncate text-xs text-gray-500">{f.address}</div>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${FACILITY_STATUSES[f.status].badge}`}>
                  {FACILITY_STATUSES[f.status].label}
                </span>
              </div>
              {(totalReferrals(f) > 0 || (f.care_manager_count ?? 0) > 0 || lastVisit?.get(f.id)) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {totalReferrals(f) > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">★ {totalReferrals(f)} 紹介</span>
                  )}
                  {(f.care_manager_count ?? 0) > 0 && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">ケアマネ {f.care_manager_count}名</span>
                  )}
                  {lastVisit?.get(f.id) && (
                    <span className="ml-auto text-[11px] text-gray-400">🕐 {lastVisit.get(f.id)}</span>
                  )}
                </div>
              )}
            </button>
          </li>
        );
      })}
      {facilities.length > MAX && (
        <li className="px-4 py-3 text-center text-xs text-gray-400">
          他に {facilities.length - MAX} 件あります。検索や絞り込みで探してください。
        </li>
      )}
    </ul>
  );
}
