import { useEffect, useMemo, useState } from "react";
import type { Staff } from "../types";
import { store } from "../lib/store";
import { getIdentity, setIdentity, type Identity } from "../lib/identity";

// ログイン後に「自分は誰か」を名簿から選ぶモーダル。名簿に無い新メンバーはその場で追加できる。
export default function IdentityPicker({ onClose, onDone }: { onClose: () => void; onDone: (id: Identity | null) => void }) {
  const [roster, setRoster] = useState<Staff[]>([]);
  const current = getIdentity();
  const [station, setStation] = useState(current?.station ?? "");
  const [name, setName] = useState(current?.name ?? "");
  const [newName, setNewName] = useState(""); // 名簿に無い自分を追加する場合
  const [adding, setAdding] = useState(false); // 名前を新規入力するモード
  const [busy, setBusy] = useState(false);

  const reload = () => store.listStaff().then(setRoster);
  useEffect(() => {
    reload();
  }, []);

  const stations = useMemo(() => [...new Set(roster.map((s) => s.station))], [roster]);
  const members = useMemo(() => roster.filter((s) => s.station === station).map((s) => s.name), [roster, station]);

  const save = async () => {
    if (!station || busy) return;
    setBusy(true);
    try {
      let finalName = name;
      // 新しい名前を入力していれば名簿に追加してから使う(全端末で共有)
      if (adding && newName.trim()) {
        finalName = newName.trim();
        if (!members.includes(finalName)) {
          await store.createStaff({ station, name: finalName });
        }
      }
      if (!finalName) {
        setBusy(false);
        return;
      }
      const id = { station, name: finalName };
      setIdentity(id);
      onDone(id);
    } catch {
      setBusy(false);
      alert("登録に失敗しました。通信環境を確認してください。");
    }
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
            自分を選んでおくと、訪問を記録するときに拠点と名前が自動で入ります。名簿に無い場合はその場で追加できます。あとからヘッダーの 👤 でいつでも変えられます。
          </p>
          <div>
            <div className="mb-1 text-xs font-medium text-gray-500">拠点</div>
            <select
              value={station}
              onChange={(e) => {
                setStation(e.target.value);
                setName("");
                setAdding(false);
                setNewName("");
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
            {!adding ? (
              <>
                <select
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!station}
                  className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2.5 text-sm disabled:bg-gray-100"
                >
                  <option value="">{station ? "名前を選択" : "先に拠点を選択"}</option>
                  {members.map((mm) => (
                    <option key={mm} value={mm}>
                      {mm}
                    </option>
                  ))}
                </select>
                {station && (
                  <button
                    onClick={() => {
                      setAdding(true);
                      setName("");
                    }}
                    className="mt-1.5 text-xs font-medium text-blue-600"
                  >
                    ＋ 名簿にない(新しく追加する)
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-1.5">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="自分の名前を入力"
                  autoFocus
                  className="w-full rounded-lg border border-blue-300 bg-white px-2.5 py-2.5 text-sm"
                />
                <button onClick={() => { setAdding(false); setNewName(""); }} className="text-xs text-gray-500 underline">
                  一覧から選ぶ
                </button>
                <p className="text-[11px] text-gray-400">「{station || "拠点"}」に追加され、みんなの名簿に反映されます。</p>
              </div>
            )}
          </div>

          {stations.length === 0 && (
            <p className="text-xs text-amber-700">
              まだ拠点が登録されていません。ヘッダーの「⚙ 名簿」から拠点を作るか、管理者にご相談ください。
            </p>
          )}
        </div>
        <div className="flex gap-2 border-t border-gray-200 p-4">
          <button
            onClick={save}
            disabled={!station || (adding ? !newName.trim() : !name) || busy}
            className="flex-1 rounded-lg bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy ? "処理中…" : adding ? "追加して使う" : "この人で使う"}
          </button>
          <button onClick={() => onDone(null)} className="rounded-lg border border-gray-300 px-5 py-3 text-sm">
            スキップ
          </button>
        </div>
      </div>
    </div>
  );
}
