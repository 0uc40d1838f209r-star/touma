import { useEffect, useState } from "react";
import type { Facility, FacilityStatus, FacilityType, NewFacility } from "../types";
import { FACILITY_STATUSES, FACILITY_TYPES } from "../types";
import { geocode, type GeocodeResult } from "../lib/geocode";

interface Props {
  initial: Facility | null;
  hidden: boolean;
  pickedPos: { lat: number; lng: number } | null;
  onStartPick: () => void;
  onSave: (data: NewFacility) => void;
  onCancel: () => void;
}

export default function FacilityForm({ initial, hidden, pickedPos, onStartPick, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<FacilityType>(initial?.type ?? "kyotaku");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [status, setStatus] = useState<FacilityStatus>(initial?.status ?? "not_visited");
  const [note, setNote] = useState(initial?.note ?? "");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(
    initial ? { lat: initial.lat, lng: initial.lng } : null,
  );
  const [candidates, setCandidates] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    if (pickedPos) setPos(pickedPos);
  }, [pickedPos]);

  const search = async () => {
    if (!address.trim() || searching) return;
    setSearching(true);
    setSearchError("");
    setCandidates([]);
    try {
      const results = await geocode(address.trim());
      if (results.length === 0) {
        setSearchError("住所が見つかりませんでした。表記を変えるか、地図タップで位置を指定してください。");
      } else if (results.length === 1) {
        setPos({ lat: results[0].lat, lng: results[0].lng });
      } else {
        setCandidates(results);
      }
    } catch {
      setSearchError("住所検索に失敗しました。通信環境を確認してください。");
    } finally {
      setSearching(false);
    }
  };

  const canSave = name.trim().length > 0 && pos !== null;

  const submit = () => {
    if (!canSave || !pos) return;
    onSave({
      name: name.trim(),
      type,
      address: address.trim(),
      phone: phone.trim(),
      status,
      note,
      lat: pos.lat,
      lng: pos.lng,
    });
  };

  return (
    <div className={`fixed inset-0 z-[1100] flex items-end justify-center bg-black/40 md:items-center ${hidden ? "hidden" : ""}`}>
      <div className="flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white md:max-w-lg md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-bold">{initial ? "営業先を編集" : "営業先を登録"}</h2>
          <button onClick={onCancel} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="閉じる">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">名前 *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="○○居宅介護支援事業所"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          </label>

          <div>
            <span className="mb-1 block text-xs font-medium text-gray-500">種別</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(FACILITY_TYPES) as FacilityType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
                    type === t ? "border-blue-500 bg-blue-50 font-medium" : "border-gray-300"
                  }`}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: FACILITY_TYPES[t].color }} />
                  {FACILITY_TYPES[t].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-gray-500">住所</span>
            <div className="flex gap-2">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="東京都新宿区西新宿2-8-1"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              />
              <button
                type="button"
                onClick={search}
                disabled={!address.trim() || searching}
                className="shrink-0 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-40"
              >
                {searching ? "検索中…" : "住所から検索"}
              </button>
            </div>
            {searchError && <p className="mt-1 text-xs text-red-600">{searchError}</p>}
            {candidates.length > 0 && (
              <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
                <div className="bg-gray-50 px-3 py-1.5 text-xs text-gray-500">候補を選択してください</div>
                {candidates.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setPos({ lat: c.lat, lng: c.lng });
                      setCandidates([]);
                    }}
                    className="block w-full border-t border-gray-100 px-3 py-2.5 text-left text-sm hover:bg-blue-50"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-xs text-gray-600">
                {pos ? `位置設定済み (${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)})` : "位置が未設定です"}
              </span>
              <button type="button" onClick={onStartPick} className="shrink-0 text-xs font-medium text-blue-600 underline">
                地図タップで指定
              </button>
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">電話番号</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="03-1234-5678"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          </label>

          <div>
            <span className="mb-1 block text-xs font-medium text-gray-500">営業ステータス</span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(FACILITY_STATUSES) as FacilityStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    status === s ? FACILITY_STATUSES[s].badge + " ring-2 ring-blue-500" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {FACILITY_STATUSES[s].label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">メモ</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="営業時の注意点など"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          </label>
        </div>
        <div className="flex gap-2 border-t border-gray-200 p-4">
          <button
            onClick={submit}
            disabled={!canSave}
            className="flex-1 rounded-lg bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {initial ? "保存する" : "登録する"}
          </button>
          <button onClick={onCancel} className="rounded-lg border border-gray-300 px-5 py-3 text-sm">
            キャンセル
          </button>
        </div>
        {!canSave && (
          <p className="pb-3 text-center text-xs text-gray-400">
            {!name.trim() ? "名前を入力してください" : "住所検索か地図タップで位置を設定してください"}
          </p>
        )}
      </div>
    </div>
  );
}
