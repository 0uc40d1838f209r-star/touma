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
    const result = await client().from("facilities").insert(data).select().single();
    // referrals / care_manager_count 列がまだ無い環境では、その列を抜いて再試行する
    if (result.error?.message.includes("column")) {
      const { referrals: _r, care_manager_count: _c, ...base } = data;
      return unwrap<Facility>(await client().from("facilities").insert(base).select().single());
    }
    return unwrap<Facility>(result);
  },
  async updateFacility(id: string, patch: Partial<NewFacility>) {
    const withTime = { ...patch, updated_at: new Date().toISOString() };
    const result = await client().from("facilities").update(withTime).eq("id", id).select().single();
    if (result.error?.message.includes("column")) {
      const { referrals: _r, care_manager_count: _c, ...base } = withTime;
      return unwrap<Facility>(
        await client().from("facilities").update(base).eq("id", id).select().single(),
      );
    }
    return unwrap<Facility>(result);
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
    const result = await client().from("visits").insert(data).select().single();
    // migration がまだ実行されていない環境では、無い列を抜いて再試行する
    if (result.error?.message.includes("column")) {
      const { station_name: _s, outcome: _o, met: _m, reaction: _r, met_person: _p, ...base } = data;
      return unwrap<Visit>(await client().from("visits").insert(base).select().single());
    }
    return unwrap<Visit>(result);
  },
  async updateVisit(id: string, patch: Partial<NewVisit>) {
    const result = await client().from("visits").update(patch).eq("id", id).select().single();
    if (result.error?.message.includes("column")) {
      const { station_name: _s, outcome: _o, met: _m, reaction: _r, met_person: _p, ...base } = patch;
      return unwrap<Visit>(
        await client().from("visits").update(base).eq("id", id).select().single(),
      );
    }
    return unwrap<Visit>(result);
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
