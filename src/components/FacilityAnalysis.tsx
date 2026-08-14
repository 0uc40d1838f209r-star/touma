import { useMemo, useState } from "react";
import type { Facility, FacilityType, Visit } from "../types";
import { FACILITY_TYPES, totalReferrals } from "../types";

// 施設別の効果分析: 訪問回数に対する新規・紹介の成果を見て、リターン率の高い営業先を見つける
interface Row {
  facility: Facility;
  visits: number;
  newClients: number;
  consults: number;
  referrals: number;
  newRate: number; // 新規 ÷ 訪問
  referralRate: number; // 紹介 ÷ 訪問
  lastVisit: string;
}

type SortKey = "visits" | "newClients" | "referrals" | "newRate" | "referralRate";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newRate", label: "新規率" },
  { key: "referralRate", label: "紹介率" },
  { key: "newClients", label: "新規数" },
  { key: "referrals", label: "紹介数" },
  { key: "visits", label: "訪問回数" },
];

// 分析の対象種別 (既定は居宅系)
const DEFAULT_TYPES = new Set<FacilityType>(["kyotaku", "takino"]);
const MIN_OPTIONS = [1, 2, 3, 5];

export default function FacilityAnalysis({
  facilities,
  visits,
  station,
  onSelectFacility,
}: {
  facilities: Facility[];
  visits: Visit[];
  station?: string; // 選択中の拠点。指定時は紹介件数もその拠点ぶんに絞る
  onSelectFacility?: (id: string) => void;
}) {
  const [types, setTypes] = useState<Set<FacilityType>>(new Set(DEFAULT_TYPES));
  const [minVisits, setMinVisits] = useState(2);
  const [sort, setSort] = useState<SortKey>("newRate");

  const facilityById = useMemo(() => new Map(facilities.map((f) => [f.id, f])), [facilities]);

  const rows = useMemo<Row[]>(() => {
    // 施設ごとに訪問を集計
    const agg = new Map<string, { visits: number; newClients: number; consults: number; last: string }>();
    for (const v of visits) {
      if (!facilityById.has(v.facility_id)) continue;
      const a = agg.get(v.facility_id) ?? { visits: 0, newClients: 0, consults: 0, last: "" };
      a.visits++;
      if (v.outcome === "new_client") a.newClients++;
      if (v.outcome === "consult") a.consults++;
      if (v.visited_on > a.last) a.last = v.visited_on;
      agg.set(v.facility_id, a);
    }
    const out: Row[] = [];
    for (const [id, a] of agg) {
      const f = facilityById.get(id)!;
      // 拠点を選んでいればその拠点への紹介件数、全拠点なら合計
      const referrals = station ? (f.referrals?.[station] ?? 0) : totalReferrals(f);
      out.push({
        facility: f,
        visits: a.visits,
        newClients: a.newClients,
        consults: a.consults,
        referrals,
        newRate: a.visits > 0 ? a.newClients / a.visits : 0,
        referralRate: a.visits > 0 ? referrals / a.visits : 0,
        lastVisit: a.last,
      });
    }
    return out;
  }, [visits, facilityById, station]);

  const shown = useMemo(() => {
    return rows
      .filter((r) => (types.size === 0 || types.has(r.facility.type)) && r.visits >= minVisits)
      .sort((a, b) => b[sort] - a[sort] || b.visits - a.visits)
      .slice(0, 100);
  }, [rows, types, minVisits, sort]);

  const toggleType = (t: FacilityType) =>
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        訪問回数に対して どれだけ新規・紹介につながったか の一覧です。並べ替えて、効率よく成果が出ている営業先を見つけられます。
      </p>

      {/* 種別フィルタ */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(FACILITY_TYPES) as FacilityType[]).map((t) => {
          const active = types.has(t);
          return (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                active ? "border-transparent text-white" : "border-gray-300 bg-white text-gray-500"
              }`}
              style={active ? { background: FACILITY_TYPES[t].color } : undefined}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: active ? "white" : FACILITY_TYPES[t].color }} />
              {FACILITY_TYPES[t].label}
            </button>
          );
        })}
      </div>

      {/* 訪問回数の下限 + 並べ替え */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">訪問</span>
          {MIN_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setMinVisits(n)}
              className={`rounded-full px-2 py-0.5 text-xs ${minVisits === n ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              {n}回+
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">並べ替え</span>
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`rounded-full px-2 py-0.5 text-xs ${sort === s.key ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 表 */}
      {shown.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-sm text-gray-500 shadow-sm">
          条件に合う営業先がありません。訪問回数の下限を下げるか、種別を追加してください。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11px] text-gray-500">
                <th className="px-3 py-2 font-medium">営業先</th>
                <th className="px-2 py-2 text-right font-medium">訪問</th>
                <th className="px-2 py-2 text-right font-medium">新規</th>
                <th className="px-2 py-2 text-right font-medium">新規率</th>
                <th className="px-2 py-2 text-right font-medium">紹介</th>
                <th className="px-3 py-2 text-right font-medium">紹介率</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr
                  key={r.facility.id}
                  onClick={() => onSelectFacility?.(r.facility.id)}
                  className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-blue-50"
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: FACILITY_TYPES[r.facility.type].color }} />
                      <span className="min-w-0 max-w-[42vw] truncate md:max-w-[16rem]">{r.facility.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.visits}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${r.newClients > 0 ? "font-bold text-amber-700" : "text-gray-400"}`}>{r.newClients}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{pct(r.newRate)}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${r.referrals > 0 ? "font-bold text-amber-700" : "text-gray-400"}`}>{r.referrals}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pct(r.referralRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-center text-[11px] text-gray-400">行をタップするとその営業先を地図で開きます。</p>
    </div>
  );
}
