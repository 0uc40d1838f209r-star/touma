import type { Facility } from "../types";
import { FACILITY_TYPES } from "../types";

// ピックアップした営業先を順に並べ、Google マップでルート(ナビ)を開くパネル。
export default function RoutePanel({
  facilities,
  route,
  onRemove,
  onClear,
  onClose,
  onSelect,
}: {
  facilities: Facility[];
  route: string[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const byId = new Map(facilities.map((f) => [f.id, f]));
  const items = route.map((id) => byId.get(id)).filter((f): f is Facility => !!f);

  // Google マップの経路URL(現在地から順に。最後が目的地、途中が経由地)
  const openInGoogleMaps = () => {
    if (items.length === 0) return;
    const pts = items.map((f) => `${f.lat},${f.lng}`);
    const destination = pts[pts.length - 1];
    const waypoints = pts.slice(0, -1).slice(0, 9); // Google の経由地上限に配慮
    const params = new URLSearchParams({ api: "1", destination, travelmode: "driving" });
    if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));
    window.open(`https://www.google.com/maps/dir/?${params.toString()}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-[1150] flex items-end justify-center bg-black/40 md:items-center">
      <div className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white md:max-w-md md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-bold">🚗 訪問ルート ({items.length})</h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="閉じる">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-sm text-gray-500">
              まだ営業先が入っていません。施設を開いて「🚗 ルートに追加」を押すと、ここにたまります。
            </p>
          ) : (
            <ol className="space-y-2">
              {items.map((f, i) => (
                <li key={f.id} className="flex items-center gap-2 rounded-lg border border-gray-200 p-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <button onClick={() => onSelect(f.id)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: FACILITY_TYPES[f.type].color }} />
                      <span className="truncate text-sm font-medium">{f.name}</span>
                    </div>
                    {f.address && <div className="truncate text-xs text-gray-500">{f.address}</div>}
                  </button>
                  <button onClick={() => onRemove(f.id)} className="shrink-0 px-1 text-xs text-red-500" aria-label="ルートから外す">
                    ✕
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="space-y-2 border-t border-gray-200 p-4">
          <button
            onClick={openInGoogleMaps}
            disabled={items.length === 0}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            Google マップでルートを開く
          </button>
          <p className="text-center text-[11px] text-gray-400">現在地から、上の順番で回るルートが地図アプリで開きます。</p>
          {items.length > 0 && (
            <button onClick={onClear} className="w-full rounded-lg border border-gray-300 py-2 text-sm text-gray-600">
              すべてクリア
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
