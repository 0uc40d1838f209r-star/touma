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
}

export const isSupabaseMode = supabase !== null;

export const store: Store = isSupabaseMode ? supabaseStore : localStore;
