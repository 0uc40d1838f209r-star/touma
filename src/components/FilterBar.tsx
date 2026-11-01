import type { ReactNode } from "react";
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
  // Google マップ風: 地図の上に浮かせるか(地図表示時)
  floating?: boolean;
  onMenu?: () => void;
  onAvatar?: () => void;
  routeCount?: number;
  onRoute?: () => void;
}

// 種別ごとのアイコン
const TYPE_ICON: Record<FacilityType, string> = {
  kyotaku: "🏠",
  takino: "🏢",
  hospital: "🏥",
  clinic: "💊",
  other: "📍",
};

// Google マップのカテゴリーチップ風
function Chip({
  active,
  onClick,
  floating,
  children,
}: {
  active: boolean;
  onClick: () => void;
  floating?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-medium ${
        active
          ? "bg-brand-softer text-brand-ink ring-1 ring-brand-soft"
          : floating
            ? "g-elev-sm bg-white text-gray-700"
            : "border border-gray-300 bg-white text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

export default function FilterBar({
  search,
  onSearch,
  activeTypes,
  onToggleType,
  activeStatuses,
  onToggleStatus,
  mineOnly,
  myName,
  onToggleMine,
  floating,
  onMenu,
  onAvatar,
  routeCount = 0,
  onRoute,
}: Props) {
  return (
    <div className={floating ? "" : "border-b border-gray-200 bg-white pb-2"}>
      {/* 検索カード: ☰ / 検索 / アバター */}
      <div className="px-3 pt-3">
        <div className={`flex h-12 items-center gap-1 rounded-full bg-white pl-1 pr-1.5 ${floating ? "g-elev" : "border border-gray-200"}`}>
          {onMenu && (
            <button onClick={onMenu} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-gray-600 hover:bg-gray-100" aria-label="メニュー">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" /></svg>
            </button>
          )}
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="営業先を検索"
            className="min-w-0 flex-1 bg-transparent px-1 text-[15px] outline-none placeholder:text-gray-500"
          />
          {search ? (
            <button onClick={() => onSearch("")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-gray-500 hover:bg-gray-100" aria-label="検索をクリア">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
            </button>
          ) : (
            <span className="grid h-10 w-10 shrink-0 place-items-center text-gray-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
            </span>
          )}
          {onAvatar && (
            <button
              onClick={onAvatar}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white"
              title={myName ? `${myName}(担当者を変更)` : "担当者を選択"}
            >
              {myName ? myName.trim().charAt(0) : "👤"}
            </button>
          )}
        </div>
      </div>

      {/* チップ列(横スクロール) */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-1 pt-2.5 [-webkit-overflow-scrolling:touch]">
        {onRoute && (
          <Chip active={routeCount > 0} onClick={onRoute} floating={floating}>
            🚗 ルート{routeCount > 0 ? ` ${routeCount}` : ""}
          </Chip>
        )}
        {onToggleMine && (
          <Chip active={!!mineOnly} onClick={onToggleMine} floating={floating}>
            🧍 {mineOnly ? "自分の訪問先(表示中)" : "自分の訪問先"}
          </Chip>
        )}
        {(Object.keys(FACILITY_TYPES) as FacilityType[]).map((t) => (
          <Chip key={t} active={activeTypes.has(t)} onClick={() => onToggleType(t)} floating={floating}>
            <span>{TYPE_ICON[t]}</span>
            {FACILITY_TYPES[t].label}
          </Chip>
        ))}
        {(Object.keys(FACILITY_STATUSES) as FacilityStatus[]).map((s) => (
          <Chip key={s} active={activeStatuses.has(s)} onClick={() => onToggleStatus(s)} floating={floating}>
            {FACILITY_STATUSES[s].label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
