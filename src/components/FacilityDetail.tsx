import { useCallback, useEffect, useMemo, useState } from "react";
import type { Contact, Facility, FacilityStatus, NewFacility, Staff, Visit, VisitOutcome } from "../types";
import { ABSENT_ENCOURAGEMENTS, ENCOURAGEMENTS, FACILITY_STATUSES, FACILITY_TYPES, MEMO_TEMPLATES, MET_OPTIONS, OUTCOMES, REACTIONS, joinStaff, splitStaff } from "../types";
import { store } from "../lib/store";
import { getIdentity } from "../lib/identity";
import Donut from "./Donut";

interface Props {
  facility: Facility;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: FacilityStatus) => void;
  onUpdate: (patch: Partial<NewFacility>) => void;
  onVisitsChanged?: () => void;
  inRoute?: boolean;
  onToggleRoute?: () => void;
}

export default function FacilityDetail({ facility, onClose, onEdit, onDelete, onStatusChange, onUpdate, onVisitsChanged, inRoute, onToggleRoute }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [tab, setTab] = useState<"info" | "contacts" | "visits">("info");

  useEffect(() => {
    store.listStaff().then((staff) => setStations([...new Set(staff.map((s) => s.station))]));
  }, []);

  const reload = useCallback(async () => {
    const [c, v] = await Promise.all([
      store.listContacts(facility.id),
      store.listVisits(facility.id),
    ]);
    setContacts(c);
    setVisits(v);
    onVisitsChanged?.(); // 一覧の最終訪問日などを更新
  }, [facility.id, onVisitsChanged]);

  useEffect(() => {
    reload();
  }, [reload]);

  const type = FACILITY_TYPES[facility.type];

  return (
    <div className="sheet-handle pointer-events-auto relative flex h-full flex-col rounded-t-3xl bg-white shadow-2xl md:rounded-none md:shadow-xl">
      <div className="flex items-start justify-between gap-2 border-b border-gray-100 p-4 pt-5 md:pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: type.color }} />
            <span className="text-xs text-gray-500">{type.label}</span>
          </div>
          <h2 className="truncate text-lg font-bold">{facility.name}</h2>
        </div>
        {onToggleRoute && (
          <button
            onClick={onToggleRoute}
            className={`shrink-0 rounded-full px-2.5 py-1.5 text-xs font-bold ${
              inRoute ? "bg-brand text-white" : "border border-brand-soft text-brand-ink"
            }`}
            title="訪問ルートに追加/削除"
          >
            {inRoute ? "🚗 追加済み" : "🚗 ルートに追加"}
          </button>
        )}
        <button onClick={onClose} className="shrink-0 rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="閉じる">
          ✕
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-100 px-4 pb-3 pt-1 text-sm">
        <div className="flex flex-1 gap-1 rounded-full bg-gray-100 p-1">
          {(
            [
              ["info", "基本情報"],
              ["contacts", `担当者 ${contacts.length}`],
              ["visits", `記録 ${visits.length}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-full py-1.5 text-xs font-semibold ${
                tab === key ? "bg-white text-brand shadow-sm" : "text-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "info" && (
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-xs font-medium text-gray-500">営業ステータス</div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(FACILITY_STATUSES) as FacilityStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(s)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      facility.status === s
                        ? FACILITY_STATUSES[s].badge + " ring-2 ring-brand"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {FACILITY_STATUSES[s].label}
                  </button>
                ))}
              </div>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-gray-500">住所</dt>
                <dd>{facility.address || "未登録"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">電話</dt>
                <dd>
                  {facility.phone ? (
                    <a href={`tel:${facility.phone}`} className="text-brand underline">
                      {facility.phone}
                    </a>
                  ) : (
                    "未登録"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">メモ</dt>
                <dd className="whitespace-pre-wrap">{facility.note || "なし"}</dd>
              </div>
            </dl>

            <CareManagerSection facility={facility} onUpdate={onUpdate} />
            <ReferralSection facility={facility} stations={stations} onUpdate={onUpdate} />

            <div className="flex gap-2 pt-2">
              <button onClick={onEdit} className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-medium text-white active:bg-brand-dark">
                編集
              </button>
              <button
                onClick={() => {
                  if (confirm(`「${facility.name}」を削除しますか?担当者・訪問記録も削除されます。`)) onDelete();
                }}
                className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 active:bg-red-50"
              >
                削除
              </button>
            </div>
          </div>
        )}

        {tab === "contacts" && <ContactsTab facilityId={facility.id} contacts={contacts} onChanged={reload} />}
        {tab === "visits" && <VisitsTab facilityId={facility.id} visits={visits} onChanged={reload} />}
      </div>
    </div>
  );
}

// ケアマネ人数のステッパー (居宅で強調)
function CareManagerSection({ facility, onUpdate }: { facility: Facility; onUpdate: (patch: Partial<NewFacility>) => void }) {
  const count = facility.care_manager_count ?? 0;
  const set = (n: number) => onUpdate({ care_manager_count: Math.max(0, n) });
  const emphasized = facility.type === "kyotaku";
  return (
    <div className={`rounded-lg border p-3 ${emphasized ? "border-emerald-200 bg-emerald-50" : "border-gray-200"}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">ケアマネ人数{emphasized ? "" : " (居宅の場合)"}</span>
        <span className="text-sm">
          <span className="text-lg font-bold text-emerald-700">{count}</span> 名
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => set(count - 1)} className="h-9 w-9 shrink-0 rounded-lg border border-gray-300 bg-white text-lg font-bold text-gray-600 active:bg-gray-100">
          −
        </button>
        <input
          type="number"
          min={0}
          value={count}
          onChange={(e) => set(Number(e.target.value) || 0)}
          className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm"
        />
        <button onClick={() => set(count + 1)} className="h-9 w-9 shrink-0 rounded-lg border border-gray-300 bg-white text-lg font-bold text-gray-600 active:bg-gray-100">
          ＋
        </button>
      </div>
    </div>
  );
}

// 紹介実績: 拠点ごとの累計紹介件数
function ReferralSection({ facility, stations, onUpdate }: { facility: Facility; stations: string[]; onUpdate: (patch: Partial<NewFacility>) => void }) {
  const referrals = facility.referrals ?? {};
  const entries = Object.entries(referrals).filter(([, n]) => n > 0);
  const total = entries.reduce((a, [, n]) => a + n, 0);
  const [pick, setPick] = useState("");

  // 拠点の件数を delta 加算 (0 以下なら拠点ごと削除)
  const bump = (station: string, delta: number) => {
    const next = { ...referrals };
    const n = (next[station] ?? 0) + delta;
    if (n > 0) next[station] = n;
    else delete next[station];
    onUpdate({ referrals: next });
  };
  const remove = (station: string) => {
    const next = { ...referrals };
    delete next[station];
    onUpdate({ referrals: next });
  };
  const addPicked = () => {
    if (!pick) return;
    bump(pick, 1);
    setPick("");
  };

  // 名簿の拠点 + 既に記録がある拠点 (名簿外でも消えないように)
  const options = [...new Set([...stations, ...Object.keys(referrals)])];

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">🎁 紹介実績 (うちへの利用者紹介)</span>
        {total > 0 && (
          <span className="text-sm">
            合計 <span className="text-lg font-bold text-amber-700">{total}</span> 件
          </span>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="mb-2 text-xs text-gray-500">まだ記録がありません。紹介があった拠点を選んで追加してください。</p>
      ) : (
        <div className="mb-2 space-y-1.5">
          {entries
            .sort((a, b) => b[1] - a[1])
            .map(([station, n]) => (
              <div key={station} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{station}</span>
                <span className="shrink-0 text-sm">
                  <span className="font-bold text-amber-700">{n}</span> 件
                </span>
                <button onClick={() => bump(station, -1)} className="h-7 w-7 shrink-0 rounded border border-gray-300 text-sm font-bold text-gray-600 active:bg-gray-100">
                  −
                </button>
                <button onClick={() => bump(station, 1)} className="h-7 w-7 shrink-0 rounded border border-gray-300 text-sm font-bold text-gray-600 active:bg-gray-100">
                  ＋
                </button>
                <button onClick={() => remove(station)} className="shrink-0 px-1 text-xs text-red-500" aria-label={`${station}を削除`}>
                  ✕
                </button>
              </div>
            ))}
        </div>
      )}
      <div className="flex gap-2">
        {options.length > 0 ? (
          <select value={pick} onChange={(e) => setPick(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm">
            <option value="">紹介があった拠点を選択</option>
            {options.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <input value={pick} onChange={(e) => setPick(e.target.value)} placeholder="拠点名を入力" className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm" />
        )}
        <button onClick={addPicked} disabled={!pick} className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
          ＋ 紹介を記録
        </button>
      </div>
    </div>
  );
}

function ContactsTab({ facilityId, contacts, onChanged }: { facilityId: string; contacts: Contact[]; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const submit = async () => {
    if (!name.trim()) return;
    await store.createContact({ facility_id: facilityId, name: name.trim(), role, phone, note });
    setName("");
    setRole("");
    setPhone("");
    setNote("");
    setAdding(false);
    onChanged();
  };

  return (
    <div className="space-y-3">
      {contacts.length === 0 && !adding && (
        <p className="text-sm text-gray-500">担当者はまだ登録されていません。</p>
      )}
      {contacts.map((c) => (
        <div key={c.id} className="rounded-lg border border-gray-200 p-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium">{c.name}</div>
              {c.role && <div className="text-xs text-gray-500">{c.role}</div>}
            </div>
            <button
              onClick={async () => {
                if (confirm(`担当者「${c.name}」を削除しますか?`)) {
                  await store.deleteContact(c.id);
                  onChanged();
                }
              }}
              className="text-xs text-red-500"
            >
              削除
            </button>
          </div>
          {c.phone && (
            <a href={`tel:${c.phone}`} className="mt-1 block text-sm text-brand underline">
              {c.phone}
            </a>
          )}
          {c.note && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{c.note}</p>}
        </div>
      ))}
      {adding ? (
        <div className="space-y-2 rounded-lg border border-brand-soft bg-brand-softer p-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名前 *" className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm" />
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="役職 (ケアマネ・連携室など)" className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="電話番号" className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm" />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="メモ" rows={2} className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={submit} disabled={!name.trim()} className="flex-1 rounded bg-brand py-2 text-sm font-medium text-white disabled:opacity-40">
              追加する
            </button>
            <button onClick={() => setAdding(false)} className="rounded border border-gray-300 px-3 py-2 text-sm">
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="w-full rounded-lg border-2 border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-500">
          + 担当者を追加
        </button>
      )}
    </div>
  );
}

// この施設の訪問記録の内訳を円グラフで(成果・反応。面談相手が空でも表示できる)
const OUTCOME_COLOR: Record<VisitOutcome, string> = {
  greeting: "#9ca3af",
  consult: "#38bdf8",
  new_client: "#f59e0b",
  other: "#d1d5db",
};
const REACTION_COLOR: Record<string, string> = { hot: "#fb7185", warm: "#cbd5e1", cold: "#94a3b8" };

function VisitSummary({ visits }: { visits: Visit[] }) {
  const outcomeSeg = (Object.keys(OUTCOMES) as VisitOutcome[]).map((o) => ({
    label: OUTCOMES[o].label.replace("!", ""),
    value: visits.filter((v) => (v.outcome ?? "greeting") === o).length,
    color: OUTCOME_COLOR[o],
  }));
  const reactionSeg = Object.entries(REACTIONS).map(([k, r]) => ({
    label: r.label,
    value: visits.filter((v) => v.reaction === k).length,
    color: REACTION_COLOR[k],
  }));
  const hasReaction = reactionSeg.some((s) => s.value > 0);

  return (
    <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div>
        <h4 className="mb-2 text-xs font-bold text-gray-600">成果の内訳(全{visits.length}件)</h4>
        <Donut segments={outcomeSeg} centerLabel="件" />
      </div>
      {hasReaction && (
        <div className="border-t border-gray-100 pt-3">
          <h4 className="mb-2 text-xs font-bold text-gray-600">先方の反応</h4>
          <Donut segments={reactionSeg} centerLabel="件" size={96} />
        </div>
      )}
    </div>
  );
}

function VisitsTab({ facilityId, visits, onChanged }: { facilityId: string; visits: Visit[]; onChanged: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null); // "new" = 新規追加
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [staffList, setStaffList] = useState<string[]>(() =>
    splitStaff(localStorage.getItem("touma-staff-name") ?? ""),
  );
  const [extraStaff, setExtraStaff] = useState(""); // 名簿に無い人の手入力
  const [station, setStation] = useState(() => localStorage.getItem("touma-station-name") ?? "");
  const [outcome, setOutcome] = useState<VisitOutcome>("greeting");
  const [met, setMet] = useState("");
  const [metPerson, setMetPerson] = useState("");
  const [reaction, setReaction] = useState("");
  const [memo, setMemo] = useState("");
  const [roster, setRoster] = useState<Staff[]>([]);
  const [praise, setPraise] = useState(""); // 記録後のねぎらいメッセージ

  useEffect(() => {
    store.listStaff().then(setRoster);
  }, []);

  // 名前 → 所属店舗 の対応(訪問者を選ぶと拠点を自動で埋めるのに使う)
  const nameToStation = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of roster) if (!m.has(s.name)) m.set(s.name, s.station);
    return m;
  }, [roster]);
  const stations = useMemo(() => [...new Set(roster.map((s) => s.station))], [roster]);
  // 店舗ごとの名簿(訪問者プルダウンの optgroup 用)
  const rosterByStation = useMemo(
    () => stations.map((st) => [st, roster.filter((s) => s.station === st).map((s) => s.name)] as const),
    [stations, roster],
  );

  const toggleStaff = (name: string) =>
    setStaffList((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  // 訪問者を追加。名簿の人なら その人の所属店舗を拠点に自動セットする
  const addStaff = (name: string) => {
    const n = name.trim();
    if (!n) return;
    setStaffList((prev) => (prev.includes(n) ? prev : [...prev, n]));
    const st = nameToStation.get(n);
    if (st) setStation(st);
  };
  const addExtraStaff = () => {
    addStaff(extraStaff);
    setExtraStaff("");
  };

  // 初回のみ: 未設定なら選択中の本人(identity)を初期値にする
  useEffect(() => {
    const me = getIdentity();
    if (!me) return;
    setStaffList((prev) => (prev.length > 0 ? prev : [me.name]));
    setStation((prev) => prev || me.station);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setEditingId("new");
    setDate(today);
    setOutcome("greeting");
    setMet("");
    setMetPerson("");
    setReaction("");
    setMemo("");
  };
  const openEdit = (v: Visit) => {
    setEditingId(v.id);
    setDate(v.visited_on);
    setStation(v.station_name);
    setStaffList(splitStaff(v.staff_name));
    setOutcome(v.outcome ?? "greeting");
    setMet(v.met ?? "");
    setMetPerson(v.met_person ?? "");
    setReaction(v.reaction ?? "");
    setMemo(v.memo);
  };

  const submit = async () => {
    if (!date || !editingId) return;
    const staffName = joinStaff(staffList);
    localStorage.setItem("touma-staff-name", staffName);
    localStorage.setItem("touma-station-name", station);
    const data = {
      facility_id: facilityId,
      visited_on: date,
      staff_name: staffName,
      station_name: station,
      outcome,
      met,
      met_person: metPerson.trim(),
      reaction,
      memo,
    };
    const isNew = editingId === "new";
    if (isNew) await store.createVisit(data);
    else await store.updateVisit(editingId, data);
    setMemo("");
    setDate(today);
    setEditingId(null);
    onChanged();
    if (isNew) {
      // 記録おつかれさま。成果に応じたねぎらいを出す
      const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
      const absent = met === "不在" || met === "ケアマネ不在";
      setPraise(absent ? pick(ABSENT_ENCOURAGEMENTS) : pick(ENCOURAGEMENTS[outcome]));
      setTimeout(() => setPraise(""), 4500);
    }
  };

  // 名簿があればプルダウン、無ければ手入力 (プルダウンでも「手入力」を選べる)
  const selectOrInput = (
    value: string,
    onChange: (v: string) => void,
    options: string[],
    placeholder: string,
  ) => {
    if (options.length === 0 || (value !== "" && !options.includes(value))) {
      return (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm"
        />
      );
    }
    return (
      <select
        value={options.includes(value) ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm"
      >
        <option value="">{placeholder}を選択</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div className="space-y-3">
      {praise && (
        <div className="fixed inset-x-0 bottom-24 z-[1300] flex justify-center px-4 md:bottom-8" onClick={() => setPraise("")}>
          <div className="max-w-sm rounded-2xl bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white shadow-2xl">
            {praise}
          </div>
        </div>
      )}
      {editingId ? (
        <div className="space-y-2 rounded-lg border border-brand-soft bg-brand-softer p-3">
          <div>
            <div className="mb-1 text-xs font-medium text-gray-500">訪問日 (タップで変更できます)</div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm" />
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-gray-500">
              訪問者 (複数選べます{staffList.length > 0 ? ` ・ ${staffList.length}名` : ""})
            </div>
            {/* 選択済みの訪問者(タップで解除) */}
            {staffList.length > 0 && (
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {staffList.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleStaff(n)}
                    className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand-ink ring-2 ring-brand"
                  >
                    {n} ✕
                  </button>
                ))}
              </div>
            )}
            {/* 全店舗の名簿から選ぶ(選んだ人の店舗が下の拠点に自動で入る) */}
            {rosterByStation.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) addStaff(e.target.value);
                }}
                className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm"
              >
                <option value="">名簿から訪問者を追加(自分の名前を選択)</option>
                {rosterByStation.map(([st, names]) => (
                  <optgroup key={st} label={st}>
                    {names
                      .filter((n) => !staffList.includes(n))
                      .map((n) => (
                        <option key={st + "|" + n} value={n}>
                          {n}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            )}
            <div className="mt-1.5 flex gap-2">
              <input
                value={extraStaff}
                onChange={(e) => setExtraStaff(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addExtraStaff();
                  }
                }}
                placeholder="名簿に無い人を手入力"
                className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-2.5 py-2 text-sm"
              />
              <button type="button" onClick={addExtraStaff} disabled={!extraStaff.trim()} className="shrink-0 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 disabled:opacity-40">
                追加
              </button>
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-gray-500">拠点(店舗)</div>
            {selectOrInput(station, setStation, stations, "拠点")}
            {!station && (
              <p className="mt-1 text-[11px] text-amber-700">
                上で訪問者を選ぶと自動で入ります。空のままだと店舗別に集計されません。
              </p>
            )}
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-gray-500">成果</div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(OUTCOMES) as VisitOutcome[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcome(o)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    outcome === o ? OUTCOMES[o].badge + " ring-2 ring-brand" : "bg-white text-gray-500 border border-gray-300"
                  }`}
                >
                  {OUTCOMES[o].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-gray-500">面談相手 (任意・もう一度押すと解除)</div>
            <div className="flex flex-wrap gap-1.5">
              {MET_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMet(met === m ? "" : m)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    met === m ? "bg-indigo-100 text-indigo-800 ring-2 ring-brand" : "bg-white text-gray-500 border border-gray-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-gray-500">対応してくれた方のお名前 (任意)</div>
            <input
              value={metPerson}
              onChange={(e) => setMetPerson(e.target.value)}
              placeholder="例: 田中ケアマネ"
              className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm"
            />
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-gray-500">先方の反応 (任意)</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(REACTIONS).map(([key, r]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setReaction(reaction === key ? "" : key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    reaction === key ? r.badge + " ring-2 ring-brand" : "bg-white text-gray-500 border border-gray-300"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MEMO_TEMPLATES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMemo((m) => (m ? m + "\n" + t : t))}
                className="rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-600 active:bg-gray-100"
              >
                + {t}
              </button>
            ))}
          </div>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="面談内容・反応などのメモ" rows={3} className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={submit} className="flex-1 rounded bg-brand py-2 text-sm font-medium text-white">
              {editingId === "new" ? "記録する" : "保存する"}
            </button>
            <button onClick={() => setEditingId(null)} className="rounded border border-gray-300 px-3 py-2 text-sm">
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <button onClick={openNew} className="w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white">
          + 訪問を記録
        </button>
      )}
      {visits.length === 0 && !editingId && <p className="text-sm text-gray-500">訪問記録はまだありません。</p>}
      {visits.length > 0 && !editingId && <VisitSummary visits={visits} />}
      <ol className="relative space-y-3 border-l-2 border-gray-200 pl-4">
        {visits.map((v) => (
          <li key={v.id} className="relative">
            <span className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand" />
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-sm font-medium">{v.visited_on}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${OUTCOMES[v.outcome ?? "greeting"].badge}`}>
                    {OUTCOMES[v.outcome ?? "greeting"].label}
                  </span>
                  {v.reaction && REACTIONS[v.reaction] && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${REACTIONS[v.reaction].badge}`}>
                      {REACTIONS[v.reaction].label}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => openEdit(v)} className="text-xs text-brand">
                    編集
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("この訪問記録を削除しますか?")) {
                        await store.deleteVisit(v.id);
                        onChanged();
                      }
                    }}
                    className="text-xs text-red-500"
                  >
                    削除
                  </button>
                </div>
              </div>
              {(v.station_name || v.staff_name || v.met || v.met_person) && (
                <div className="text-xs text-gray-500">
                  {[
                    v.station_name,
                    v.staff_name && `訪問者: ${v.staff_name}`,
                    v.met && `面談: ${v.met}`,
                    v.met_person && `対応: ${v.met_person}`,
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                </div>
              )}
              {v.memo && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{v.memo}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

