import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Contact,
  Facility,
  NewContact,
  NewFacility,
  NewVisit,
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
    return unwrap<Facility>(
      await client().from("facilities").insert(data).select().single(),
    );
  },
  async updateFacility(id: string, patch: Partial<NewFacility>) {
    return unwrap<Facility>(
      await client()
        .from("facilities")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single(),
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
  async createVisit(data: NewVisit) {
    const result = await client().from("visits").insert(data).select().single();
    // station_name 列の migration がまだ実行されていない環境では列抜きで再試行する
    if (result.error?.message.includes("station_name")) {
      const { station_name: _omitted, ...rest } = data;
      return unwrap<Visit>(await client().from("visits").insert(rest).select().single());
    }
    return unwrap<Visit>(result);
  },
  async deleteVisit(id: string) {
    const { error } = await client().from("visits").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};
