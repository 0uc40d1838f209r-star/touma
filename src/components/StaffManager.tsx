import { useEffect, useState } from "react";
import type { Staff } from "../types";
import { store } from "../lib/store";
import { useStations } from "../lib/stations";

// 拠点とスタッフの名簿を管理するモーダル。訪問記録の選択式入力に使われる
export default function StaffManager({ onClose, onOpenHistory }: { onClose: () => void; onOpenHistory?: () => void }) {
  const [roster, setRoster] = useState<Staff[]>([]);
  const { stations, custom, reload: reloadStations } = useStations();
  const [newStation, setNewStation] = useState("");
  const [station, setStation] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [stationError, setStationError] = useState("");

  const reload = () => store.listStaff().then(setRoster);
  useEffect(() => {
    reload();
  }, []);

  const addStation = async () => {
    const n = newStation.trim();
    if (!n) return;
    setStationError("");
    if (stations.includes(n)) {
      setStationError(`「${n}」はすでにあります。`);
      return;
    }
    try {
      await store.createStation(n);
      setNewStation("");
      await reloadStations();
    } catch (e) {
      setStationError(e instanceof Error ? e.message : "拠点の追加に失敗しました");
    }
  };

  const removeStation = async (n: string) => {
    const count = roster.filter((s) => s.station === n).length;
    const msg = count > 0
      ? `拠点「${n}」を一覧から外しますか?\n(所属メンバー${count}名は残ります)`
      : `拠点「${n}」を削除しますか?`;
    if (!confirm(msg)) return;
    await store.deleteStation(n);
    await reloadStations();
  };

  const add = async () => {
    if (!station.trim() || !name.trim()) return;
    setError("");
    try {
      await store.createStaff({ station: station.trim(), name: name.trim() });
      setName("");
      await reload();
      await reloadStations();
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/40 md:items-center">
      <div className="flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white md:max-w-lg md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-lg font-bold">拠点・スタッフ名簿</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 text-gray-500" aria-label="閉じる">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {/* 拠点の追加 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold">🏢 拠点(店舗)</h3>
            <p className="text-xs text-gray-500">新しい拠点を追加すると、担当者選択・訪問記録・実績の絞り込みなどで選べるようになります。</p>
            <div className="flex gap-2">
              <input
                value={newStation}
                onChange={(e) => setNewStation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addStation()}
                placeholder="新しい拠点名(例: 横浜中央)"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <button
                onClick={addStation}
                disabled={!newStation.trim()}
                className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                ＋ 追加
              </button>
            </div>
            {stationError && <p className="text-xs text-red-600">{stationError}</p>}
            <div className="flex flex-wrap gap-1.5">
              {stations.map((st) => {
                const count = roster.filter((s) => s.station === st).length;
                const removable = custom.includes(st);
                return (
                  <span key={st} className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs">
                    {st}
                    <span className="text-gray-400">{count}名</span>
                    {removable && (
                      <button onClick={() => removeStation(st)} className="ml-0.5 text-red-400" aria-label={`${st}を削除`}>
                        ✕
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </section>

          {/* スタッフの追加 */}
          <section className="space-y-2 rounded-2xl border border-brand-soft bg-brand-softer p-3">
            <h3 className="text-sm font-bold">👤 スタッフを追加</h3>
            <select
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm"
            >
              <option value="">拠点を選択</option>
              {stations.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="スタッフ名"
              className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm"
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              onClick={add}
              disabled={!station.trim() || !name.trim()}
              className="w-full rounded-lg bg-brand py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              追加する
            </button>
          </section>

          {onOpenHistory && (
            <button onClick={onOpenHistory} className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700">
              🕘 削除・変更された訪問記録を見る(全体・元に戻せます)
            </button>
          )}

          {/* 拠点ごとのメンバー */}
          {stations.map((st) => {
            const members = roster.filter((s) => s.station === st);
            if (members.length === 0) return null;
            return (
              <div key={st}>
                <div className="mb-1.5 text-sm font-bold">
                  {st} <span className="text-xs font-normal text-gray-400">{members.length}名</span>
                </div>
                <ul className="space-y-1.5">
                  {members.map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                      <span className="text-sm">{s.name}</span>
                      <button
                        onClick={async () => {
                          if (confirm(`${s.station} の「${s.name}」を名簿から削除しますか?`)) {
                            await store.deleteStaff(s.id);
                            reload();
                          }
                        }}
                        className="text-xs text-red-500"
                      >
                        削除
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
