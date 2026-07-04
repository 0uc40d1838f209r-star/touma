import { useCallback, useEffect, useState } from "react";
import type { Contact, Facility, FacilityStatus, Staff, Visit, VisitOutcome } from "../types";
import { FACILITY_STATUSES, FACILITY_TYPES, MEMO_TEMPLATES, OUTCOMES } from "../types";
import { store } from "../lib/store";
import { supabase } from "../lib/supabaseStore";

interface Props {
  facility: Facility;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: FacilityStatus) => void;
}

export default function FacilityDetail({ facility, onClose, onEdit, onDelete, onStatusChange }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [tab, setTab] = useState<"info" | "contacts" | "visits">("info");

  const reload = useCallback(async () => {
    const [c, v] = await Promise.all([
      store.listContacts(facility.id),
      store.listVisits(facility.id),
    ]);
    setContacts(c);
    setVisits(v);
  }, [facility.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const type = FACILITY_TYPES[facility.type];

  return (
    <div className="pointer-events-auto flex h-full flex-col bg-white shadow-2xl md:rounded-none rounded-t-2xl">
      <div className="flex items-start justify-between gap-2 border-b border-gray-200 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: type.color }} />
            <span className="text-xs text-gray-500">{type.label}</span>
          </div>
          <h2 className="truncate text-lg font-bold">{facility.name}</h2>
        </div>
        <button onClick={onClose} className="shrink-0 rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="閉じる">
          ✕
        </button>
      </div>

      <div className="flex border-b border-gray-200 text-sm">
        {(
          [
            ["info", "基本情報"],
            ["contacts", `担当者 (${contacts.length})`],
            ["visits", `訪問記録 (${visits.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 font-medium ${tab === key ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
          >
            {label}
          </button>
        ))}
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
                        ? FACILITY_STATUSES[s].badge + " ring-2 ring-blue-500"
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
                    <a href={`tel:${facility.phone}`} className="text-blue-600 underline">
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
            <div className="flex gap-2 pt-2">
              <button onClick={onEdit} className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white active:bg-blue-700">
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
            <a href={`tel:${c.phone}`} className="mt-1 block text-sm text-blue-600 underline">
              {c.phone}
            </a>
          )}
          {c.note && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{c.note}</p>}
        </div>
      ))}
      {adding ? (
        <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名前 *" className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm" />
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="役職 (ケアマネ・連携室など)" className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="電話番号" className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm" />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="メモ" rows={2} className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={submit} disabled={!name.trim()} className="flex-1 rounded bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-40">
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

function VisitsTab({ facilityId, visits, onChanged }: { facilityId: string; visits: Visit[]; onChanged: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null); // "new" = 新規追加
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [staff, setStaff] = useState(() => localStorage.getItem("touma-staff-name") ?? "");
  const [station, setStation] = useState(() => localStorage.getItem("touma-station-name") ?? "");
  const [outcome, setOutcome] = useState<VisitOutcome>("greeting");
  const [memo, setMemo] = useState("");
  const [roster, setRoster] = useState<Staff[]>([]);

  useEffect(() => {
    store.listStaff().then(setRoster);
  }, []);

  // 初回のみ: 訪問者名が未設定ならログイン ID を初期値にする
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.email?.split("@")[0];
      if (id) setStaff((prev) => prev || id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stations = [...new Set(roster.map((s) => s.station))];
  const members = roster.filter((s) => s.station === station).map((s) => s.name);

  const openNew = () => {
    setEditingId("new");
    setDate(today);
    setOutcome("greeting");
    setMemo("");
  };
  const openEdit = (v: Visit) => {
    setEditingId(v.id);
    setDate(v.visited_on);
    setStation(v.station_name);
    setStaff(v.staff_name);
    setOutcome(v.outcome ?? "greeting");
    setMemo(v.memo);
  };

  const submit = async () => {
    if (!date || !editingId) return;
    localStorage.setItem("touma-staff-name", staff);
    localStorage.setItem("touma-station-name", station);
    const data = {
      facility_id: facilityId,
      visited_on: date,
      staff_name: staff,
      station_name: station,
      outcome,
      memo,
    };
    if (editingId === "new") await store.createVisit(data);
    else await store.updateVisit(editingId, data);
    setMemo("");
    setDate(today);
    setEditingId(null);
    onChanged();
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
      {editingId ? (
        <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm" />
          {selectOrInput(
            station,
            (v) => {
              setStation(v);
              // 拠点を変えたら訪問者の選択をリセット (前の拠点のスタッフが残らないように)
              if (v !== station) setStaff("");
            },
            stations,
            "拠点",
          )}
          {selectOrInput(staff, setStaff, members, "訪問者")}
          <div>
            <div className="mb-1 text-xs font-medium text-gray-500">成果</div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(OUTCOMES) as VisitOutcome[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcome(o)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    outcome === o ? OUTCOMES[o].badge + " ring-2 ring-blue-500" : "bg-white text-gray-500 border border-gray-300"
                  }`}
                >
                  {OUTCOMES[o].label}
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
            <button onClick={submit} className="flex-1 rounded bg-blue-600 py-2 text-sm font-medium text-white">
              {editingId === "new" ? "記録する" : "保存する"}
            </button>
            <button onClick={() => setEditingId(null)} className="rounded border border-gray-300 px-3 py-2 text-sm">
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <button onClick={openNew} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white">
          + 訪問を記録
        </button>
      )}
      {visits.length === 0 && !editingId && <p className="text-sm text-gray-500">訪問記録はまだありません。</p>}
      <ol className="relative space-y-3 border-l-2 border-gray-200 pl-4">
        {visits.map((v) => (
          <li key={v.id} className="relative">
            <span className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500" />
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-sm font-medium">{v.visited_on}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${OUTCOMES[v.outcome ?? "greeting"].badge}`}>
                    {OUTCOMES[v.outcome ?? "greeting"].label}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => openEdit(v)} className="text-xs text-blue-600">
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
              {(v.station_name || v.staff_name) && (
                <div className="text-xs text-gray-500">
                  {[v.station_name, v.staff_name && `訪問者: ${v.staff_name}`].filter(Boolean).join(" / ")}
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

