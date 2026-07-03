import type {
  Contact,
  Facility,
  NewContact,
  NewFacility,
  NewVisit,
  Visit,
} from "../types";
import type { Store } from "./store";

const KEY = "touma-data-v1";

interface Data {
  facilities: Facility[];
  contacts: Contact[];
  visits: Visit[];
}

function load(): Data {
  const raw = localStorage.getItem(KEY);
  if (!raw) return { facilities: [], contacts: [], visits: [] };
  try {
    return JSON.parse(raw) as Data;
  } catch {
    return { facilities: [], contacts: [], visits: [] };
  }
}

function save(data: Data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

export const localStore: Store = {
  async listFacilities() {
    return load().facilities;
  },
  async createFacility(data: NewFacility) {
    const d = load();
    const now = new Date().toISOString();
    const facility: Facility = { ...data, id: uid(), created_at: now, updated_at: now };
    d.facilities.push(facility);
    save(d);
    return facility;
  },
  async updateFacility(id: string, patch: Partial<NewFacility>) {
    const d = load();
    const i = d.facilities.findIndex((f) => f.id === id);
    if (i < 0) throw new Error("営業先が見つかりません");
    d.facilities[i] = { ...d.facilities[i], ...patch, updated_at: new Date().toISOString() };
    save(d);
    return d.facilities[i];
  },
  async deleteFacility(id: string) {
    const d = load();
    d.facilities = d.facilities.filter((f) => f.id !== id);
    d.contacts = d.contacts.filter((c) => c.facility_id !== id);
    d.visits = d.visits.filter((v) => v.facility_id !== id);
    save(d);
  },

  async listContacts(facilityId: string) {
    return load().contacts.filter((c) => c.facility_id === facilityId);
  },
  async createContact(data: NewContact) {
    const d = load();
    const contact: Contact = { ...data, id: uid() };
    d.contacts.push(contact);
    save(d);
    return contact;
  },
  async updateContact(id: string, patch: Partial<NewContact>) {
    const d = load();
    const i = d.contacts.findIndex((c) => c.id === id);
    if (i < 0) throw new Error("担当者が見つかりません");
    d.contacts[i] = { ...d.contacts[i], ...patch };
    save(d);
    return d.contacts[i];
  },
  async deleteContact(id: string) {
    const d = load();
    d.contacts = d.contacts.filter((c) => c.id !== id);
    save(d);
  },

  async listVisits(facilityId: string) {
    return load()
      .visits.filter((v) => v.facility_id === facilityId)
      .sort((a, b) => b.visited_on.localeCompare(a.visited_on));
  },
  async createVisit(data: NewVisit) {
    const d = load();
    const visit: Visit = { ...data, id: uid(), created_at: new Date().toISOString() };
    d.visits.push(visit);
    save(d);
    return visit;
  },
  async deleteVisit(id: string) {
    const d = load();
    d.visits = d.visits.filter((v) => v.id !== id);
    save(d);
  },
};
