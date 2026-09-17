import type { FacilityStatus, FacilityType } from "../types";
import { FACILITY_STATUSES, FACILITY_TYPES } from "../types";

interface Props {
  search: string;
  onSearch: (v: string) => void;
  activeTypes: Set<FacilityType>;
  onToggleType: (t: FacilityType) => void;
  activeStatuses: Set<FacilityStatus>;
  onToggleStatus: (s: FacilityStatus) => void;
  mineOnly?: boolean;
  myName?: string | null;
  onToggleMine?: () => void;
}

// 種別ごとのアイコン(Airbnb 風のカテゴリーバー用)
const TYPE_ICON: Record<FacilityType, string> = {
  kyotaku: "🏠",
  takino: "🏢",
  hospital: "🏥",
  clinic: "💊",
  other: "📍",
};

export default function FilterBar({ search, onSearch, activeTypes, onToggleType, activeStatuses, onToggleStatus, mineOnly, myName, onToggleMine }: Props) {
  return (
    <div className="border-b border-gray-200 bg-white">
      {/* 自分の訪問先トグル */}
      {onToggleMine && (
        <div className="px-4 pt-3">
          <button
            onClick={onToggleMine}
            className={`flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-sm font-bold ${
              mineOnly ? "bg-brand text-white shadow-sm" : "bg-brand-softer text-brand-ink"
            }`}
          >
            🧍 {myName ? `${myName}さんの訪問先` : "自分の訪問先"}
            {mineOnly ? "(表示中・タップで解除)" : "を見る"}
          </button>
        </div>
      )}
      {/* 検索ピル */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.08)]">
          <span className="text-gray-400">🔍</span>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="名前・住所で検索"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
          {search && (
            <button onClick={() => onSearch("")} className="text-xs text-gray-400" aria-label="検索をクリア">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* カテゴリーバー(種別) */}
      <div className="flex gap-5 overflow-x-auto px-4 pt-2 [-webkit-overflow-scrolling:touch]">
        {(Object.keys(FACILITY_TYPES) as FacilityType[]).map((t) => {
          const active = activeTypes.has(t);
          return (
            <button
              key={t}
              onClick={() => onToggleType(t)}
              className={`flex shrink-0 flex-col items-center gap-1 border-b-2 pb-2 text-[11px] transition-colors ${
                active ? "border-brand font-bold text-brand" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <span className="text-lg leading-none">{TYPE_ICON[t]}</span>
              {FACILITY_TYPES[t].label}
            </button>
          );
        })}
      </div>

      {/* 営業ステータスの絞り込み */}
      <div className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 pt-2 [-webkit-overflow-scrolling:touch]">
        {(Object.keys(FACILITY_STATUSES) as FacilityStatus[]).map((s) => {
          const active = activeStatuses.has(s);
          return (
            <button
              key={s}
              onClick={() => onToggleStatus(s)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
                active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-600"
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
