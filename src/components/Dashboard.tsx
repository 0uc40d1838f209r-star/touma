import { useEffect, useMemo, useState } from "react";
import type { Facility, Visit, VisitOutcome } from "../types";
import { OUTCOMES } from "../types";
import { store } from "../lib/store";

// 月次の営業実績: 拠点別の訪問件数・成果の内訳・スタッフ別件数
export default function Dashboard({ facilities }: { facilities: Facility[] }) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    store.listAllVisits().then(setVisits);
  }, []);

  const facilityName = useMemo(() => new Map(facilities.map((f) => [f.id, f.name])), [facilities]);

  const monthVisits = useMemo(
    () => visits.filter((v) => v.visited_on.startsWith(month)),
    [visits, month],
  );

  const byStation = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of monthVisits) {
      const key = v.station_name || "(拠点未入力)";
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthVisits]);

  const byOutcome = useMemo(() => {
    const m: Record<VisitOutcome, number> = { greeting: 0, consult: 0, new_client: 0, other: 0 };
    for (const v of monthVisits) m[v.outcome ?? "greeting"]++;
    return m;
  }, [monthVisits]);

  const byStaff = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of monthVisits) {
      const key = `${v.station_name || "(拠点未入力)"}|${v.staff_name || "(名前未入力)"}`;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthVisits]);

  const newClients = monthVisits.filter((v) => v.outcome === "new_client");

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const maxCount = Math.max(1, ...byStation.map(([, n]) => n));
  const [y, m] = month.split("-");

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* 月の切替 */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => shiftMonth(-1)} className="rounded-full bg-white px-3 py-1.5 text-sm shadow-sm" aria-label="前の月">
            ◀
          </button>
          <h2 className="text-lg font-bold">
            {y}年{Number(m)}月の営業実績
          </h2>
          <button onClick={() => shiftMonth(1)} className="rounded-full bg-white px-3 py-1.5 text-sm shadow-sm" aria-label="次の月">
            ▶
          </button>
        </div>

        {/* 成果のスタットタイル */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <div className="text-xs text-gray-500">訪問合計</div>
            <div className="text-2xl font-bold">{monthVisits.length}<span className="ml-0.5 text-sm font-normal text-gray-500">件</span></div>
          </div>
          {(Object.keys(OUTCOMES) as VisitOutcome[]).filter((o) => o !== "other").map((o) => (
            <div key={o} className={`rounded-xl bg-white p-3 shadow-sm ${o === "new_client" && byOutcome[o] > 0 ? "ring-2 ring-amber-400" : ""}`}>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`inline-block h-2 w-2 rounded-full ${o === "new_client" ? "bg-amber-400" : o === "consult" ? "bg-sky-400" : "bg-gray-300"}`} />
                {OUTCOMES[o].label.replace("!", "")}
              </div>
              <div className="text-2xl font-bold">{byOutcome[o]}<span className="ml-0.5 text-sm font-normal text-gray-500">件</span></div>
            </div>
          ))}
        </div>

        {/* 拠点別の訪問件数 (横棒) */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold">拠点別の訪問件数</h3>
          {byStation.length === 0 ? (
            <p className="text-sm text-gray-500">この月の訪問記録はまだありません。</p>
          ) : (
            <div className="space-y-2.5">
              {byStation.map(([station, count]) => (
                <div key={station}>
                  <div className="mb-0.5 flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm">{station}</span>
                    <span className="shrink-0 text-sm font-medium">{count}件</span>
                  </div>
                  <div className="h-3 w-full rounded-sm bg-gray-100">
                    <div
                      className="h-3 rounded-sm bg-blue-600"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 新規獲得の一覧 */}
        {newClients.length > 0 && (
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-bold">🎉 新規獲得 ({newClients.length}件)</h3>
            <ul className="space-y-1.5">
              {newClients.map((v) => (
                <li key={v.id} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{facilityName.get(v.facility_id) ?? "(削除された施設)"}</span>
                  <span className="shrink-0 text-xs text-gray-500">{v.visited_on} {v.station_name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* スタッフ別 */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-bold">スタッフ別の訪問件数</h3>
          {byStaff.length === 0 ? (
            <p className="text-sm text-gray-500">この月の訪問記録はまだありません。</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="py-1.5 font-medium">拠点</th>
                  <th className="py-1.5 font-medium">スタッフ</th>
                  <th className="py-1.5 text-right font-medium">件数</th>
                </tr>
              </thead>
              <tbody>
                {byStaff.map(([key, count]) => {
                  const [station, name] = key.split("|");
                  return (
                    <tr key={key} className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500">{station}</td>
                      <td className="py-1.5">{name}</td>
                      <td className="py-1.5 text-right font-medium">{count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
