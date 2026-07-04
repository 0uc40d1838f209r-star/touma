export type FacilityType = "kyotaku" | "hospital" | "clinic" | "other";

export type FacilityStatus = "not_visited" | "visited" | "regular" | "referral";

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  status: FacilityStatus;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  facility_id: string;
  name: string;
  role: string;
  phone: string;
  note: string;
}

export type VisitOutcome = "greeting" | "consult" | "new_client" | "other";

export interface Visit {
  id: string;
  facility_id: string;
  visited_on: string;
  staff_name: string;
  station_name: string;
  outcome: VisitOutcome;
  memo: string;
  created_at: string;
}

export interface Staff {
  id: string;
  station: string;
  name: string;
  created_at: string;
}

export type NewFacility = Omit<Facility, "id" | "created_at" | "updated_at">;
export type NewContact = Omit<Contact, "id">;
export type NewVisit = Omit<Visit, "id" | "created_at">;
export type NewStaff = Omit<Staff, "id" | "created_at">;

export const OUTCOMES: Record<VisitOutcome, { label: string; badge: string }> = {
  greeting: { label: "挨拶・情報提供", badge: "bg-gray-100 text-gray-700" },
  consult: { label: "相談あり", badge: "bg-sky-100 text-sky-800" },
  new_client: { label: "新規獲得!", badge: "bg-amber-200 text-amber-900 font-bold" },
  other: { label: "その他", badge: "bg-gray-100 text-gray-500" },
};

// メモ入力のワンタップ定型文
export const MEMO_TEMPLATES = [
  "パンフレットを渡した",
  "担当者不在",
  "ケアマネと面談",
  "また来てほしいとのこと",
  "空き状況を聞かれた",
  "後日連絡予定",
];

export const FACILITY_TYPES: Record<FacilityType, { label: string; color: string }> = {
  kyotaku: { label: "居宅介護支援", color: "#e05d44" },
  hospital: { label: "病院", color: "#2f6fdb" },
  clinic: { label: "クリニック", color: "#1f9d63" },
  other: { label: "その他", color: "#8b6bd1" },
};

export const FACILITY_STATUSES: Record<FacilityStatus, { label: string; badge: string }> = {
  not_visited: { label: "未訪問", badge: "bg-gray-200 text-gray-700" },
  visited: { label: "訪問済み", badge: "bg-sky-100 text-sky-800" },
  regular: { label: "定期訪問中", badge: "bg-emerald-100 text-emerald-800" },
  referral: { label: "紹介あり", badge: "bg-amber-100 text-amber-800" },
};
