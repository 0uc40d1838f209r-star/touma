import { useEffect, useState } from "react";
import type { HistoryEntry } from "../types";
import { OUTCOMES } from "../types";
import { store } from "../lib/store";

// 削除・上書きされた訪問記録の一覧。押すとその時点の内容に戻せる
export default function HistoryPanel({
  facilityId,
  facilityName,
  onClose,
  onRestored,
}: {
  facilityId?: string; // 指定すればその施設の分だけ
  facilityName?: (id: string) => string | undefined;
  onClose: () => void;
  onRestored?: () => void;
}) {
  const [items, setItems] = useState<HistoryEntry[] | null>(null);
  const [busyId, setBusyId] = useState<string | number | null>(null);

  const load = () => store.listVisitHistory(facilityId).then(setItems);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  const restore = async (e: HistoryEntry) => {
    const what = e.action === "DELETE" ? "削除された記録を元に戻します" : "この時点の内容に戻します(今の内容も履歴に残ります)";
    if (!confirm(`${what}。よろしいですか?`)) return;
    setBusyId(e.id);
    try {
      await store.restoreVisit(e.old_data);
      alert("元に戻しました。");
      onRestored?.();
      await load();
    } catch (err) {
      alert("戻せませんでした: " + (err instanceof Error ? err.message : ""));
    } finally {
      setBusyId(null);
    }
  };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[1250] flex items-end justify-center bg-black/40 md:items-center">
      <div className="flex max-h-[88vh] w-full flex-col rounded-t-3xl bg-white md:max-w-lg md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-lg font-bold">🕘 削除・変更前の記録</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 text-gray-500" aria-label="閉じる">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          <p className="rounded-xl bg-brand-softer p-3 text-xs text-brand-ink">
            訪問記録が削除されたり書き換えられたりすると、変更前の内容がここに自動で残ります。「この内容に戻す」で復元できます。
          </p>
          {items === null && <p className="text-sm text-gray-400">読み込み中…</p>}
          {items?.length === 0 && <p className="text-sm text-gray-500">まだ削除・変更された記録はありません。</p>}
          {items?.map((e) => {
            const v = e.old_data;
            return (
              <div key={e.id} className="rounded-2xl border border-gray-100 p-3 shadow-sm">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      e.action === "DELETE" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {e.action === "DELETE" ? "削除された記録" : "編集前の内容"}
                  </span>
                  <span className="text-[11px] text-gray-400">{fmt(e.changed_at)} に変更</span>
                </div>
                {!facilityId && facilityName && (
                  <div className="truncate text-sm font-bold">{facilityName(v.facility_id) ?? "(削除された施設)"}</div>
                )}
                <div className="text-xs text-gray-500">
                  訪問日 {v.visited_on}
                  {v.staff_name && ` ・ ${v.staff_name}`}
                  {v.outcome && ` ・ ${OUTCOMES[v.outcome]?.label ?? ""}`}
                </div>
                {v.memo && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{v.memo}</p>}
                <button
                  onClick={() => restore(e)}
                  disabled={busyId === e.id}
                  className="mt-2 w-full rounded-xl border border-brand py-2 text-sm font-bold text-brand disabled:opacity-40"
                >
                  {busyId === e.id ? "戻しています…" : "この内容に戻す"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
