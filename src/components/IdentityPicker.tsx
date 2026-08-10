import { useEffect, useMemo, useState } from "react";
import type { Staff } from "../types";
import { store } from "../lib/store";
import { getIdentity, setIdentity, type Identity } from "../lib/identity";

// ログイン後に「自分は誰か」を名簿から選ぶモーダル。選ぶと訪問記録が自動入力される。
export default function IdentityPicker({ onClose, onDone }: { onClose: () => void; onDone: (id: Identity | null) => void }) {
  const [roster, setRoster] = useState<Staff[]>([]);
  const current = getIdentity();
  const [station, setStation] = useState(current?.station ?? "");
  const [name, setName] = useState(current?.name ?? "");

  useEffect(() => {
    store.listStaff().then(setRoster);
  }, []);

  const stations = useMemo(() => [...new Set(roster.map((s) => s.station))], [roster]);
  const members = useMemo(() => roster.filter((s) => s.station === station).map((s) => s.name), [roster, station]);

  const save = () => {
    if (!station || !name) return;
    const id = { station, name };
    setIdentity(id);
    onDone(id);
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/40 md:items-center">
      <div className="flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white md:max-w-sm md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-bold">担当者を選択</h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="閉じる">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <p className="text-xs text-gray-500">
            自分を選んでおくと、訪問を記録するときに拠点と名前が自動で入ります。あとからヘッダーの 👤 でいつでも変えられます。
          </p>
          <div>
            <div className="mb-1 text-xs font-medium text-gray-500">拠点</div>
            <select
              value={station}
              onChange={(e) => {
                setStation(e.target.value);
                setName(""); // 拠点を変えたら名前を選び直す
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2.5 text-sm"
            >
              <option value="">拠点を選択</option>
              {stations.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-gray-500">名前</div>
            <select
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!station}
              className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2.5 text-sm disabled:bg-gray-100"
            >
              <option value="">{station ? "名前を選択" : "先に拠点を選択"}</option>
              {members.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          {stations.length === 0 && (
            <p className="text-xs text-amber-700">
              名簿がまだありません。ヘッダーの「⚙ 名簿」から拠点・スタッフを登録してください。
            </p>
          )}
        </div>
        <div className="flex gap-2 border-t border-gray-200 p-4">
          <button onClick={save} disabled={!station || !name} className="flex-1 rounded-lg bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-40">
            この人で使う
          </button>
          <button onClick={() => onDone(null)} className="rounded-lg border border-gray-300 px-5 py-3 text-sm">
            スキップ
          </button>
        </div>
      </div>
    </div>
  );
}
