import { useEffect, useMemo, useState } from "react";
import type { Facility, Staff, Visit } from "../types";
import { FACILITY_TYPES, OUTCOMES, REACTIONS, splitStaff } from "../types";
import { mergeStations, useStations } from "../lib/stations";
import { store } from "../lib/store";

// メンバーの営業記録: 店舗・メンバーで絞って、各自の訪問コメントを新しい順に見る
type Period = "month" | "last" | "3m" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "month", label: "今月" },
  { key: "last", label: "先月" },
  { key: "3m", label: "3か月" },
  { key: "all", label: "全期間" },
];

const PAGE = 60;
const WEEKDAYS = "日月火水木金土";

const ymOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

function inPeriod(date: string, period: Period): boolean {
  if (period === "all") return true;
  const now = new Date();
  const month = date.slice(0, 7);
  if (period === "month") return month === ymOf(now);
  if (period === "last") return month === ymOf(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  return month >= ymOf(new Date(now.getFullYear(), now.getMonth() - 2, 1));
}

// 2026-11-02 → 11月2日(月)。今年でなければ年も付ける
function dateLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date || "(日付なし)";
  const year = d.getFullYear() === new Date().getFullYear() ? "" : `${d.getFullYear()}年`;
  return `${year}${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`;
}

// 古い記録はメモが null のことがある
const memoOf = (v: Visit) => (v.memo ?? "").trim();
const isAbsent = (v: Visit) => v.met === "不在" || v.met === "ケアマネ不在";

interface MemberSummary {
  name: string;
  station: string;
  visits: number;
  newClients: number;
  consults: number;
  comments: number;
  last: string;
  lastMemo: string;
}

export default function MemberRecords({
  facilities,
  visits,
  myStation,
  onSelectFacility,
}: {
  facilities: Facility[];
  visits: Visit[];
  myStation?: string;
  onSelectFacility?: (id: string) => void;
}) {
  const [station, setStation] = useState(myStation ?? ""); // "" = 全店舗
  const [member, setMember] = useState(""); // "" = 全員
  const [period, setPeriod] = useState<Period>("month");
  const [query, setQuery] = useState("");
  const [commentsOnly, setCommentsOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [roster, setRoster] = useState<Staff[]>([]);

  useEffect(() => {
    store.listStaff().then(setRoster);
  }, []);
  // 条件を変えたら表示件数を戻す
  useEffect(() => setLimit(PAGE), [station, member, period, query, commentsOnly]);

  const facilityById = useMemo(() => new Map(facilities.map((f) => [f.id, f])), [facilities]);

  const { stations: knownStations } = useStations();
  const stations = useMemo(
    () => mergeStations(knownStations, visits.map((v) => v.station_name)),
    [knownStations, visits],
  );

  // 店舗で絞った記録(期間は問わない。メンバーの選択肢に使う)
  const stationVisits = useMemo(
    () => (station ? visits.filter((v) => v.station_name === station) : visits),
    [visits, station],
  );

  // 店舗 + 期間で絞った記録
  const periodVisits = useMemo(
    () =>
      stationVisits
        .filter((v) => inPeriod(v.visited_on, period))
        .sort((a, b) => b.visited_on.localeCompare(a.visited_on) || (b.created_at ?? "").localeCompare(a.created_at ?? "")),
    [stationVisits, period],
  );

  // メンバーごとの集計。名簿の人は記録が0件でも並べる
  const summaries = useMemo<MemberSummary[]>(() => {
    const m = new Map<string, MemberSummary>();
    const ensure = (name: string, st: string) => {
      let s = m.get(name);
      if (!s) {
        s = { name, station: st, visits: 0, newClients: 0, consults: 0, comments: 0, last: "", lastMemo: "" };
        m.set(name, s);
      }
      return s;
    };
    for (const r of roster) if (!station || r.station === station) ensure(r.name, r.station);
    for (const v of stationVisits) for (const name of splitStaff(v.staff_name)) ensure(name, v.station_name);
    // periodVisits は新しい順なので、最初に出てきたものが最新
    for (const v of periodVisits) {
      for (const name of splitStaff(v.staff_name)) {
        const s = ensure(name, v.station_name);
        s.visits++;
        if (v.outcome === "new_client") s.newClients++;
        if (v.outcome === "consult") s.consults++;
        if (memoOf(v)) {
          s.comments++;
          if (!s.lastMemo) s.lastMemo = memoOf(v);
        }
        if (!s.last) s.last = v.visited_on;
      }
    }
    return [...m.values()].sort((a, b) => b.visits - a.visits || a.station.localeCompare(b.station) || a.name.localeCompare(b.name));
  }, [roster, station, stationVisits, periodVisits]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return periodVisits.filter((v) => {
      if (member && !splitStaff(v.staff_name).includes(member)) return false;
      if (commentsOnly && !memoOf(v)) return false;
      if (q) {
        const name = facilityById.get(v.facility_id)?.name ?? "";
        const hay = `${name} ${v.memo ?? ""} ${v.met_person ?? ""} ${v.staff_name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [periodVisits, member, commentsOnly, query, facilityById]);

  // 日付ごとにまとめる
  const groups = useMemo(() => {
    const out: { date: string; items: Visit[] }[] = [];
    for (const v of shown.slice(0, limit)) {
      const g = out[out.length - 1];
      if (g && g.date === v.visited_on) g.items.push(v);
      else out.push({ date: v.visited_on, items: [v] });
    }
    return out;
  }, [shown, limit]);

  const selected = member ? summaries.find((s) => s.name === member) : undefined;
  const memberStats = useMemo(() => {
    if (!member) return null;
    return {
      visits: shown.length,
      newClients: shown.filter((v) => v.outcome === "new_client").length,
      consults: shown.filter((v) => v.outcome === "consult").length,
      hot: shown.filter((v) => v.reaction === "hot").length,
      absent: shown.filter(isAbsent).length,
      comments: shown.filter((v) => memoOf(v)).length,
    };
  }, [member, shown]);

  const periodLabel = PERIODS.find((p) => p.key === period)!.label;

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-4 pb-40">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* 絞り込み */}
        <div className="space-y-3 rounded-xl bg-white p-3.5 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-gray-500">🏢 店舗</span>
              <select
                value={station}
                onChange={(e) => {
                  setStation(e.target.value);
                  setMember("");
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm"
              >
                <option value="">全店舗</option>
                {stations.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-gray-500">🧍 メンバー</span>
              <select
                value={member}
                onChange={(e) => setMember(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm"
              >
                <option value="">全員</option>
                {summaries.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                    {station ? "" : `(${s.station || "拠点未入力"})`} {s.visits}件
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex gap-1 rounded-full bg-gray-100 p-1 text-sm">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`flex-1 rounded-full py-1.5 font-medium ${period === p.key ? "bg-white text-brand shadow-sm" : "text-gray-500"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="施設名・コメントで検索"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={() => setCommentsOnly((c) => !c)}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium ${commentsOnly ? "bg-brand-softer text-brand-ink ring-1 ring-brand-soft" : "border border-gray-300 text-gray-600"}`}
            >
              💬 コメントありだけ
            </button>
          </div>
        </div>

        {member ? (
          /* 選んだメンバーのまとめ */
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-lg font-bold text-white">
                {member.trim().charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-bold">{member}</div>
                <div className="text-xs text-gray-500">
                  {selected?.station || station || "拠点未入力"} ・ {periodLabel}
                </div>
              </div>
              <button onClick={() => setMember("")} className="shrink-0 rounded-full border border-gray-300 px-3 py-1.5 text-xs text-gray-600">
                ← 全員を見る
              </button>
            </div>
            {memberStats && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
                {[
                  ["訪問", memberStats.visits],
                  ["新規", memberStats.newClients],
                  ["相談", memberStats.consults],
                  ["好感触", memberStats.hot],
                  ["不在", memberStats.absent],
                  ["コメント", memberStats.comments],
                ].map(([label, n]) => (
                  <div key={label} className={`rounded-lg py-2 ${label === "新規" && Number(n) > 0 ? "bg-amber-50 ring-1 ring-amber-300" : "bg-gray-50"}`}>
                    <div className="text-lg font-bold leading-tight">{n}</div>
                    <div className="text-[11px] text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* メンバー一覧(タップでそのメンバーの記録へ) */
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-bold">
              メンバー別({periodLabel}){station && <span className="ml-1 font-normal text-brand">{station}</span>}
            </h3>
            {summaries.length === 0 ? (
              <p className="text-sm text-gray-500">この店舗のメンバーはまだいません。</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {summaries.map((s) => (
                  <li key={s.name} className="min-w-0">
                    <button
                      onClick={() => setMember(s.name)}
                      className="flex w-full items-start gap-2.5 rounded-xl border border-gray-200 p-2.5 text-left hover:border-brand hover:bg-brand-softer"
                    >
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${s.visits > 0 ? "bg-brand text-white" : "bg-gray-200 text-gray-500"}`}>
                        {s.name.trim().charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-bold">{s.name}</span>
                          <span className="shrink-0 text-sm font-bold">
                            {s.visits}
                            <span className="text-xs font-normal text-gray-500">件</span>
                          </span>
                        </span>
                        <span className="block truncate text-[11px] text-gray-500">
                          {[
                            !station && (s.station || "拠点未入力"),
                            s.newClients > 0 && `新規${s.newClients}`,
                            s.consults > 0 && `相談${s.consults}`,
                            s.comments > 0 && `💬${s.comments}`,
                            s.last && `最終 ${s.last.slice(5).replace("-", "/")}`,
                          ]
                            .filter(Boolean)
                            .join(" ・ ") || "この期間の記録なし"}
                        </span>
                        {s.lastMemo && <span className="mt-0.5 block truncate text-xs text-gray-600">「{s.lastMemo}」</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* 記録(日付ごと・新しい順) */}
        <div>
          <h3 className="mb-2 px-1 text-sm font-bold">
            {member ? `${member} さんの記録` : "みんなの記録"}
            <span className="ml-1.5 text-xs font-normal text-gray-500">{shown.length}件</span>
          </h3>
          {shown.length === 0 ? (
            <p className="rounded-xl bg-white p-4 text-sm text-gray-500 shadow-sm">
              条件に合う記録がありません。期間を「全期間」にするか、店舗・メンバーを変えてみてください。
            </p>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => (
                <section key={g.date}>
                  <div className="mb-1.5 px-1 text-xs font-bold text-gray-500">{dateLabel(g.date)}</div>
                  <ul className="space-y-2">
                    {g.items.map((v) => {
                      const f = facilityById.get(v.facility_id);
                      const outcome = OUTCOMES[v.outcome ?? "greeting"];
                      return (
                        <li key={v.id} className="rounded-xl bg-white p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              onClick={() => f && onSelectFacility?.(f.id)}
                              disabled={!f}
                              className="flex min-w-0 items-center gap-1.5 text-left"
                            >
                              {f && <span className="shrink-0 text-sm">{FACILITY_TYPES[f.type].icon}</span>}
                              <span className={`truncate text-sm font-bold ${f ? "text-gray-900 underline decoration-gray-300 underline-offset-2" : "text-gray-400"}`}>
                                {f?.name ?? "(削除された施設)"}
                              </span>
                            </button>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${outcome.badge}`}>{outcome.label}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                            {v.staff_name && (
                              <span className={member ? "" : "font-medium text-gray-700"}>🧍 {splitStaff(v.staff_name).join("・")}</span>
                            )}
                            {!station && v.station_name && <span>{v.station_name}</span>}
                            {v.met && <span>面談: {v.met}</span>}
                            {v.met_person && <span>対応: {v.met_person}</span>}
                            {v.reaction && REACTIONS[v.reaction] && (
                              <span className={`rounded-full px-2 py-0.5 text-[11px] ${REACTIONS[v.reaction].badge}`}>{REACTIONS[v.reaction].label}</span>
                            )}
                          </div>
                          {memoOf(v) ? (
                            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2 text-sm leading-relaxed text-gray-800">💬 {v.memo}</p>
                          ) : (
                            <p className="mt-1.5 text-[11px] text-gray-400">コメントなし</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
              {shown.length > limit && (
                <button
                  onClick={() => setLimit((n) => n + PAGE)}
                  className="w-full rounded-xl bg-white py-3 text-sm font-medium text-brand shadow-sm"
                >
                  さらに表示(残り {shown.length - limit} 件)
                </button>
              )}
            </div>
          )}
          <p className="mt-3 text-center text-[11px] text-gray-400">施設名をタップすると、その営業先を地図で開きます。</p>
        </div>
      </div>
    </div>
  );
}
