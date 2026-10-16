import type {
  Contact,
  Facility,
  HistoryEntry,
  NewContact,
  NewFacility,
  NewStaff,
  NewVisit,
  Staff,
  Visit,
} from "../types";
import { localStore } from "./localStore";
import { supabase, supabaseStore } from "./supabaseStore";

export interface Store {
  listFacilities(): Promise<Facility[]>;
  createFacility(data: NewFacility): Promise<Facility>;
  updateFacility(id: string, patch: Partial<NewFacility>): Promise<Facility>;
  deleteFacility(id: string): Promise<void>;

  listContacts(facilityId: string): Promise<Contact[]>;
  createContact(data: NewContact): Promise<Contact>;
  updateContact(id: string, patch: Partial<NewContact>): Promise<Contact>;
  deleteContact(id: string): Promise<void>;

  listVisits(facilityId: string): Promise<Visit[]>;
  listAllVisits(): Promise<Visit[]>;
  createVisit(data: NewVisit): Promise<Visit>;
  updateVisit(id: string, patch: Partial<NewVisit>): Promise<Visit>;
  deleteVisit(id: string): Promise<void>;

  listStaff(): Promise<Staff[]>;
  createStaff(data: NewStaff): Promise<Staff>;
  deleteStaff(id: string): Promise<void>;

  // 拠点(店舗)。名簿メンバーがいなくても登録できる
  listStations(): Promise<string[]>;
  createStation(name: string): Promise<void>;
  deleteStation(name: string): Promise<void>;

  // 消えた・上書きされた訪問記録の履歴と復元
  listVisitHistory(facilityId?: string): Promise<HistoryEntry[]>;
  restoreVisit(old: Visit): Promise<Visit>;
}

export const isSupabaseMode = supabase !== null;

export const store: Store = isSupabaseMode ? supabaseStore : localStore;
