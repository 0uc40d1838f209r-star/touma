import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Contact,
  Facility,
  NewContact,
  NewFacility,
  NewStaff,
  NewVisit,
  Staff,
  Visit,
} from "../types";
import type { Store } from "./store";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

function client(): SupabaseClient {
  if (!supabase) throw new Error("Supabase が設定されていません");
  return supabase;
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("データが取得できませんでした");
  return result.data;
}

// エラーメッセージから「存在しない列名」を取り出す
// 例: "column visits.met_person does not exist" / "Could not find the 'met_person' column"
function missingColumnOf(message: string): string | null {
  const m =
    message.match(/column\s+(?:\w+\.)?["']?(\w+)["']?\s+does not exist/i) ||
    message.match(/find the ["'](\w+)["'] column/i) ||
    message.match(/["'](\w+)["'] column/i);
  return m ? m[1] : null;
}

// migration がまだの環境でも、足りない列「だけ」を外して保存する。
// (以前は列エラーで関係ない列まで一括で捨てていたため、反応や成果が消えていた)
async function writeStrippingMissing<T>(
  run: (payload: Record<string, unknown>) => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  initial: Record<string, unknown>,
): Promise<T> {
  let payload = { ...initial };
  for (let i = 0; i < 8; i++) {
    const result = await run(payload);
    if (result.error && result.error.message.includes("column")) {
      const col = missingColumnOf(result.error.message);
      if (col && col in payload) {
        delete payload[col];
        continue;
      }
    }
    return unwrap<T>(result);
  }
  throw new Error("保存に失敗しました(列の不一致)");
}

export const supabaseStore: Store = {
  async listFacilities() {
    // Supabase は 1 リクエスト最大 1000 行のため、全件をページングで取得する
    const all: Facility[] = [];
    const page = 1000;
    for (let from = 0; ; from += page) {
      const batch = unwrap<Facility[]>(
        await client()
          .from("facilities")
          .select("*")
          .order("created_at")
          .range(from, from + page - 1),
      );
      all.push(...batch);
      if (batch.length < page) break;
    }
    return all;
  },
  async createFacility(data: NewFacility) {
    return writeStrippingMissing<Facility>(
      (payload) => client().from("facilities").insert(payload).select().single(),
      data as unknown as Record<string, unknown>,
    );
  },
  async updateFacility(id: string, patch: Partial<NewFacility>) {
    return writeStrippingMissing<Facility>(
      (payload) => client().from("facilities").update(payload).eq("id", id).select().single(),
      { ...patch, updated_at: new Date().toISOString() } as unknown as Record<string, unknown>,
    );
  },
  async deleteFacility(id: string) {
    const { error } = await client().from("facilities").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async listContacts(facilityId: string) {
    return unwrap<Contact[]>(
      await client().from("contacts").select("*").eq("facility_id", facilityId).order("name"),
    );
  },
  async createContact(data: NewContact) {
    return unwrap<Contact>(
      await client().from("contacts").insert(data).select().single(),
    );
  },
  async updateContact(id: string, patch: Partial<NewContact>) {
    return unwrap<Contact>(
      await client().from("contacts").update(patch).eq("id", id).select().single(),
    );
  },
  async deleteContact(id: string) {
    const { error } = await client().from("contacts").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async listVisits(facilityId: string) {
    return unwrap<Visit[]>(
      await client()
        .from("visits")
        .select("*")
        .eq("facility_id", facilityId)
        .order("visited_on", { ascending: false }),
    );
  },
  async listAllVisits() {
    const all: Visit[] = [];
    const page = 1000;
    for (let from = 0; ; from += page) {
      const batch = unwrap<Visit[]>(
        await client()
          .from("visits")
          .select("*")
          .order("visited_on", { ascending: false })
          .range(from, from + page - 1),
      );
      all.push(...batch);
      if (batch.length < page) break;
    }
    return all;
  },
  async createVisit(data: NewVisit) {
    return writeStrippingMissing<Visit>(
      (payload) => client().from("visits").insert(payload).select().single(),
      data as unknown as Record<string, unknown>,
    );
  },
  async updateVisit(id: string, patch: Partial<NewVisit>) {
    return writeStrippingMissing<Visit>(
      (payload) => client().from("visits").update(payload).eq("id", id).select().single(),
      patch as unknown as Record<string, unknown>,
    );
  },
  async deleteVisit(id: string) {
    const { error } = await client().from("visits").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async listStaff() {
    const result = await client().from("staff").select("*").order("station").order("name");
    // staff テーブルの migration がまだの環境では空の名簿として扱う
    if (result.error) return [];
    return (result.data ?? []) as Staff[];
  },
  async createStaff(data: NewStaff) {
    return unwrap<Staff>(await client().from("staff").insert(data).select().single());
  },
  async deleteStaff(id: string) {
    const { error } = await client().from("staff").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};
