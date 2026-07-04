import { useEffect, useState } from "react";
import type { Staff } from "../types";
import { store } from "../lib/store";

// 拠点とスタッフの名簿を管理するモーダル。訪問記録の選択式入力に使われる
export default function StaffManager({ onClose }: { onClose: () => void }) {
  const [roster, setRoster] = useState<Staff[]>([]);
  const [station, setStation] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const reload = () => store.listStaff().then(setRoster);
  useEffect(() => {
    reload();
  }, []);

  const stations = [...new Set(roster.map((s) => s.station))];

  const add = async () => {
    if (!station.trim() || !name.trim()) return;
    setError("");
    try {
      await store.createStaff({ station: station.trim(), name: name.trim() });
      setName("");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/40 md:items-center">
      <div className="flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white md:max-w-lg md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-bold">拠点・スタッフ名簿</h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="閉じる">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <p className="text-xs text-gray-500">
            ここに登録しておくと、訪問記録の「拠点」「訪問者」が選ぶだけで入力できます。全拠点で共有されます。
          </p>
          <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <input
              value={station}
              onChange={(e) => setStation(e.target.value)}
              placeholder="拠点名 (例: 横浜第一ステーション)"
              list="station-list"
              className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm"
            />
            <datalist id="station-list">
              {stations.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="スタッフ名"
              className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm"
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              onClick={add}
              disabled={!station.trim() || !name.trim()}
              className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              追加する
            </button>
          </div>

          {stations.length === 0 && <p className="text-sm text-gray-500">まだ登録がありません。</p>}
          {stations.map((st) => (
            <div key={st}>
              <div className="mb-1.5 text-sm font-bold">{st}</div>
              <ul className="space-y-1.5">
                {roster
                  .filter((s) => s.station === st)
                  .map((s) => (
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
          ))}
        </div>
      </div>
    </div>
  );
}
