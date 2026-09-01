import { useMemo } from "react";
import type { Visit } from "../types";

// 店舗(拠点)ごとの 営業割合(訪問シェア) と 成功率 を横棒で可視化する。
// 店舗数が多いため配色は分けず、単一色の横棒ランキングで比較する。
interface Agg {
  station: string;
  visits: number;
  positives: number; // 相談あり + 新規獲得
  newClients: number;
}

export default function StoreCharts({ visits, highlight }: { visits: Visit[]; highlight?: string }) {
  const rows = useMemo<Agg[]>(() => {
    const m = new Map<string, Agg>();
    for (const v of visits) {
      const key = v.station_name || "(拠点未入力)";
      const a = m.get(key) ?? { station: key, visits: 0, positives: 0, newClients: 0 };
      a.visits++;
      if (v.outcome === "new_client") {
        a.newClients++;
        a.positives++;
      } else if (v.outcome === "consult") {
        a.positives++;
      }
      m.set(key, a);
    }
    return [...m.values()];
  }, [visits]);

  const total = rows.reduce((s, r) => s + r.visits, 0);

  if (total === 0) {
    return (
      <div className="rounded-xl bg-white p-4 text-sm text-gray-500 shadow-sm">この月の訪問記録はまだありません。</div>
    );
  }

  const byShare = [...rows].sort((a, b) => b.visits - a.visits);
  const bySuccess = [...rows].sort((a, b) => b.positives / b.visits - a.positives / a.visits);
  const isHi = (s: string) => highlight && s === highlight;

  return (
    <div className="space-y-4">
      {/* 営業割合(訪問のシェア) */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold">店舗別の営業割合</h3>
        <p className="mb-3 text-xs text-gray-500">全{total}件の訪問のうち、各店舗が占める割合</p>
        <div className="space-y-2.5">
          {byShare.map((r) => {
            const share = r.visits / total;
            return (
              <div key={r.station} title={`${r.station}: ${r.visits}件 (${Math.round(share * 100)}%)`}>
                <div className="mb-0.5 flex items-baseline justify-between gap-2">
                  <span className={`truncate text-sm ${isHi(r.station) ? "font-bold text-blue-700" : ""}`}>{r.station}</span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {Math.round(share * 100)}%<span className="ml-1 text-xs font-normal text-gray-400">{r.visits}件</span>
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-100">
                  <div
                    className={`h-3 rounded-full ${isHi(r.station) ? "bg-blue-700" : "bg-blue-500"}`}
                    style={{ width: `${Math.max(share * 100, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 成功率(成果が出た割合) */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold">店舗別の成功率</h3>
        <p className="mb-3 text-xs text-gray-500">訪問のうち 相談あり・新規獲得 につながった割合(高い順)</p>
        <div className="space-y-2.5">
          {bySuccess.map((r) => {
            const rate = r.positives / r.visits;
            return (
              <div key={r.station} title={`${r.station}: 成果${r.positives} / 訪問${r.visits} (うち新規${r.newClients})`}>
                <div className="mb-0.5 flex items-baseline justify-between gap-2">
                  <span className={`truncate text-sm ${isHi(r.station) ? "font-bold text-emerald-700" : ""}`}>{r.station}</span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {Math.round(rate * 100)}%
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      成果{r.positives}/{r.visits}
                      {r.newClients > 0 && <span className="ml-1 font-bold text-amber-700">新規{r.newClients}</span>}
                    </span>
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-100">
                  <div
                    className={`h-3 rounded-full ${isHi(r.station) ? "bg-emerald-600" : "bg-emerald-500"}`}
                    style={{ width: `${Math.max(rate * 100, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
