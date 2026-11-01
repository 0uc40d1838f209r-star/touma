// Google マップの「☰」メニュー風のサイドドロワー
export interface MenuItem {
  icon: string;
  label: string;
  onClick: () => void;
  badge?: string | number;
  danger?: boolean;
}

export default function SideMenu({
  onClose,
  title,
  subtitle,
  groups,
}: {
  onClose: () => void;
  title: string;
  subtitle?: string;
  groups: MenuItem[][];
}) {
  return (
    <div className="fixed inset-0 z-[1300]" role="dialog">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 flex w-[84%] max-w-xs flex-col bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-gray-200 px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-base font-bold text-white">営</span>
          <div className="min-w-0">
            <div className="truncate text-[17px] font-medium text-gray-900">{title}</div>
            {subtitle && <div className="truncate text-xs text-gray-500">{subtitle}</div>}
          </div>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto py-2">
          {groups.map((items, gi) => (
            <div key={gi} className={gi > 0 ? "mt-2 border-t border-gray-200 pt-2" : ""}>
              {items.map((it) => (
                <button
                  key={it.label}
                  onClick={() => {
                    onClose();
                    it.onClick();
                  }}
                  className={`flex w-full items-center gap-4 px-5 py-3 text-left text-[15px] hover:bg-gray-100 ${
                    it.danger ? "text-red-600" : "text-gray-800"
                  }`}
                >
                  <span className="w-6 text-center text-lg leading-none">{it.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  {it.badge !== undefined && it.badge !== 0 && it.badge !== "" && (
                    <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">{it.badge}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </div>
  );
}
