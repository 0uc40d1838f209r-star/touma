import { useEffect, useMemo, useRef, useState } from "react";
import type { Facility, Visit, VisitOutcome } from "../types";
import { OUTCOMES, REACTIONS, splitStaff } from "../types";
import FacilityAnalysis from "./FacilityAnalysis";
import StoreCharts from "./StoreCharts";

// 営業実績: 月次サマリー と 施設別の効果分析
export default function Dashboard({
  facilities,
  visits,
  onSelectFacility,
}: {
  facilities: Facility[];
  visits: Visit[];
  onSelectFacility?: (id: string) => void;
}) {
  const [tab, setTab] = useState<"monthly" | "stores" | "analysis">("monthly");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [station, setStation] = useState(""); // "" = 全拠点

  // 初回のみ: 記録のある最新の月を初期表示にする(当月がまだ空でも実績が見える)
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || visits.length === 0) return;
    jumped.current = true;
    let mx = "";
    for (const v of visits) if (v.visited_on > mx) mx = v.visited_on;
    if (mx) setMonth(mx.slice(0, 7));
  }, [visits]);

  const facilityName = useMemo(() => new Map(facilities.map((f) => [f.id, f.name])), [facilities]);

  // 記録に出てくる拠点(店舗)の一覧
  const stations = useMemo(
    () => [...new Set(visits.map((v) => v.station_name).filter(Boolean))].sort(),
    [visits],
  );

  // 選んだ拠点だけに絞った訪問(全拠点なら全件)
  const scopedVisits = useMemo(
    () => (station ? visits.filter((v) => v.station_name === station) : visits),
    [visits, station],
  );

  const monthVisits = useMemo(
    () => scopedVisits.filter((v) => v.visited_on.startsWith(month)),
    [scopedVisits, month],
  );

  // 店舗比較グラフは全店舗の当月データで見る(店舗フィルタは強調表示に使う)
  const monthVisitsAll = useMemo(
    () => visits.filter((v) => v.visited_on.startsWith(month)),
    [visits, month],
  );

  // 拠点別の 訪問件数 と 新規獲得数 (全拠点表示のときの店舗比較用)
  const byStation = useMemo(() => {
    const m = new Map<string, { visits: number; newClients: number }>();
    for (const v of monthVisits) {
      const key = v.station_name || "(拠点未入力)";
      const a = m.get(key) ?? { visits: 0, newClients: 0 };
      a.visits++;
      if (v.outcome === "new_client") a.newClients++;
      m.set(key, a);
    }
    return [...m.entries()].sort((a, b) => b[1].visits - a[1].visits);
  }, [monthVisits]);

  const byOutcome = useMemo(() => {
    const m: Record<VisitOutcome, number> = { greeting: 0, consult: 0, new_client: 0, other: 0 };
    for (const v of monthVisits) m[v.outcome ?? "greeting"]++;
    return m;
  }, [monthVisits]);

  // 複数人で行った訪問は、各人に1件ずつ計上する
  const byStaff = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of monthVisits) {
      const names = splitStaff(v.staff_name);
      for (const name of names.length > 0 ? names : ["(名前未入力)"]) {
        const key = `${v.station_name || "(拠点未入力)"}|${name}`;
        m.set(key, (m.get(key) ?? 0) + 1);
      }
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthVisits]);

  const newClients = monthVisits.filter((v) => v.outcome === "new_client");

  // 先方の反応と不在の集計 (データドリブンな振り返り用)
  const reactionCounts = useMemo(() => {
    const m: Record<string, number> = { hot: 0, warm: 0, cold: 0 };
    for (const v of monthVisits) if (v.reaction && m[v.reaction] !== undefined) m[v.reaction]++;
    return m;
  }, [monthVisits]);
  const absentCount = monthVisits.filter((v) => v.met === "不在").length;

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const maxCount = Math.max(1, ...byStation.map(([, n]) => n.visits));
  const [y, m] = month.split("-");

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* サブタブ: 月次実績 / 施設別分析 */}
        <div className="flex gap-1 rounded-full bg-gray-200 p-1 text-sm">
          {(
            [
              ["monthly", "📅 月次"],
              ["stores", "🏢 店舗比較"],
              ["analysis", "📈 施設別"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-full py-1.5 font-medium ${tab === key ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 拠点(店舗)の絞り込み — 実績・分析の両方に効く */}
        {stations.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-gray-500">店舗</span>
            <select
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm"
            >
              <option value="">全拠点</option>
              {stations.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {tab === "analysis" ? (
          <FacilityAnalysis facilities={facilities} visits={scopedVisits} station={station} onSelectFacility={onSelectFacility} />
        ) : tab === "stores" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => shiftMonth(-1)} className="rounded-full bg-white px-3 py-1.5 text-sm shadow-sm" aria-label="前の月">◀</button>
              <h2 className="text-lg font-bold">{y}年{Number(m)}月の店舗比較</h2>
              <button onClick={() => shiftMonth(1)} className="rounded-full bg-white px-3 py-1.5 text-sm shadow-sm" aria-label="次の月">▶</button>
            </div>
            <StoreCharts visits={monthVisitsAll} highlight={station} />
          </div>
        ) : (
        <div className="space-y-4">
        {/* 月の切替 */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => shiftMonth(-1)} className="rounded-full bg-white px-3 py-1.5 text-sm shadow-sm" aria-label="前の月">
            ◀
          </button>
          <h2 className="text-center text-lg font-bold">
            {y}年{Number(m)}月の営業実績
            {station && <span className="block text-xs font-normal text-blue-600">{station}</span>}
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

        {/* 先方の反応・不在 */}
        {monthVisits.length > 0 && (
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-bold">先方の反応</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {Object.entries(REACTIONS).map(([key, r]) => (
                <span key={key}>
                  {r.label} <span className="font-bold">{reactionCounts[key]}</span>件
                </span>
              ))}
              <span className="text-gray-500">
                🚪 不在 <span className="font-bold">{absentCount}</span>件
                {monthVisits.length > 0 && absentCount > 0 && (
                  <span className="ml-1 text-xs">(訪問の {Math.round((absentCount / monthVisits.length) * 100)}%)</span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* 拠点別の訪問件数・新規獲得 (横棒。店舗ごとの結果比較) */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold">拠点別の訪問件数・新規</h3>
          {byStation.length === 0 ? (
            <p className="text-sm text-gray-500">この月の訪問記録はまだありません。</p>
          ) : (
            <div className="space-y-2.5">
              {byStation.map(([st, a]) => (
                <div key={st}>
                  <div className="mb-0.5 flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm">{st}</span>
                    <span className="shrink-0 text-sm font-medium">
                      {a.visits}件
                      {a.newClients > 0 && <span className="ml-1.5 text-xs font-bold text-amber-700">新規{a.newClients}</span>}
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-sm bg-gray-100">
                    <div
                      className="h-3 rounded-sm bg-blue-600"
                      style={{ width: `${(a.visits / maxCount) * 100}%` }}
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

        {/* この月の訪問記録 (新しい順) */}
        {monthVisits.length > 0 && (
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-bold">この月の訪問記録</h3>
            <ul className="divide-y divide-gray-100">
              {monthVisits.slice(0, 50).map((v) => (
                <li key={v.id} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium">
                      {facilityName.get(v.facility_id) ?? "(削除された施設)"}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${OUTCOMES[v.outcome ?? "greeting"].badge}`}>
                      {OUTCOMES[v.outcome ?? "greeting"].label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {v.visited_on}
                    {[v.station_name, v.staff_name].filter(Boolean).length > 0 &&
                      " ・ " + [v.station_name, v.staff_name].filter(Boolean).join(" / ")}
                  </div>
                  {v.memo && <p className="mt-0.5 whitespace-pre-wrap text-xs text-gray-600">{v.memo}</p>}
                </li>
              ))}
              {monthVisits.length > 50 && (
                <li className="py-2 text-center text-xs text-gray-400">他 {monthVisits.length - 50} 件</li>
              )}
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
        )}
      </div>
    </div>
  );
}
