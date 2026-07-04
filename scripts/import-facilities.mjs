// 厚労省オープンデータから営業先(居宅介護支援・病院・診療所)を Supabase に取り込むスクリプト
//
// 使い方:
//   1. データを用意 (UTF-8 CSV):
//        居宅介護支援: https://www.mhlw.go.jp/content/12300000/jigyosho_430.csv
//        病院 施設票:   https://www.mhlw.go.jp/content/11121000/01-1_hospital_facility_info_20251201.zip (要解凍)
//        診療所 施設票: https://www.mhlw.go.jp/content/11121000/02-1_clinic_facility_info_20251201.zip (要解凍)
//   2. 実行:
//        SUPABASE_URL=... SUPABASE_ANON_KEY=... APP_ID=... APP_PASSWORD=... \
//        node scripts/import-facilities.mjs --data-dir <CSVのあるフォルダ> [--dry-run] [--limit N]
//
// 対象地域や取り込み対象は下の CITIES / SOURCES を編集する。

import { readFileSync } from "node:fs";
import { join } from "node:path";

const CITIES = [
  { pref: "神奈川県", city: "川崎市" },
  { pref: "神奈川県", city: "横浜市" },
  { pref: "千葉県", city: "千葉市" },
  { pref: "千葉県", city: "茂原市" },
  { pref: "鹿児島県", city: "鹿児島市" },
];

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const DATA_DIR = getArg("--data-dir") ?? "data";
const DRY_RUN = args.includes("--dry-run");
const LIMIT = getArg("--limit") ? Number(getArg("--limit")) : Infinity;

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const APP_ID = process.env.APP_ID;
const APP_PASSWORD = process.env.APP_PASSWORD;
if (!DRY_RUN && (!SUPABASE_URL || !ANON_KEY || !APP_ID || !APP_PASSWORD)) {
  console.error("環境変数 SUPABASE_URL / SUPABASE_ANON_KEY / APP_ID / APP_PASSWORD を設定してください");
  process.exit(1);
}

// ---- CSV パーサ (引用符・埋め込み改行対応) ----
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

function loadCsv(file) {
  const text = readFileSync(join(DATA_DIR, file), "utf-8").replace(/^﻿/, "");
  const rows = parseCsv(text);
  const header = rows[0];
  const col = (name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`${file}: 列「${name}」が見つかりません`);
    return i;
  };
  return { rows: rows.slice(1), col };
}

// ---- 各データソースの抽出 ----
function extractKyotaku() {
  const { rows, col } = loadCsv("jigyosho_430.csv");
  const cCity = col("市区町村名");
  const cName = col("事業所名");
  const cAddr = col("住所");
  const cLat = col("緯度");
  const cLng = col("経度");
  const cPhone = col("電話番号");
  const out = [];
  for (const r of rows) {
    if (!CITIES.some((c) => (r[cCity] ?? "").startsWith(c.city))) continue;
    out.push({
      name: r[cName],
      type: "kyotaku",
      address: r[cAddr],
      lat: Number(r[cLat]),
      lng: Number(r[cLng]),
      phone: r[cPhone] ?? "",
    });
  }
  return out;
}

function extractMedical(file, type) {
  const { rows, col } = loadCsv(file);
  const cName = col("正式名称");
  const cAddr = col("所在地");
  const cLat = col("所在地座標（緯度）");
  const cLng = col("所在地座標（経度）");
  const out = [];
  for (const r of rows) {
    const addr = r[cAddr] ?? "";
    if (!CITIES.some((c) => addr.startsWith(c.pref + c.city))) continue;
    out.push({
      name: r[cName],
      type,
      address: addr,
      lat: Number(r[cLat]),
      lng: Number(r[cLng]),
      phone: "",
    });
  }
  return out;
}

// ---- Supabase ----
async function login() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: `${APP_ID}@staff.eigyo-map.local`, password: APP_PASSWORD }),
  });
  if (!res.ok) throw new Error(`ログイン失敗: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function fetchExistingKeys(token) {
  const keys = new Set();
  for (let from = 0; ; from += 1000) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/facilities?select=name,address&order=created_at&offset=${from}&limit=1000`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`既存データ取得失敗: ${await res.text()}`);
    const batch = await res.json();
    for (const f of batch) keys.add(`${f.name}|${f.address}`);
    if (batch.length < 1000) break;
  }
  return keys;
}

async function insertBatch(token, records) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/facilities`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(records),
  });
  if (!res.ok) throw new Error(`insert 失敗: ${res.status} ${await res.text()}`);
}

// ---- main ----
const candidates = [
  ...extractKyotaku(),
  ...extractMedical("01-1_hospital_facility_info_20251201.csv", "hospital"),
  ...extractMedical("02-1_clinic_facility_info_20251201.csv", "clinic"),
];

const valid = [];
let skippedNoCoord = 0;
const seen = new Set();
for (const c of candidates) {
  if (!c.name || !Number.isFinite(c.lat) || !Number.isFinite(c.lng) || c.lat === 0) {
    skippedNoCoord++;
    continue;
  }
  const key = `${c.name}|${c.address}`;
  if (seen.has(key)) continue; // ファイル内重複
  seen.add(key);
  valid.push({ ...c, status: "not_visited", note: "" });
}

const byType = valid.reduce((m, f) => ((m[f.type] = (m[f.type] ?? 0) + 1), m), {});
console.log(`抽出: ${valid.length} 件 (居宅 ${byType.kyotaku ?? 0} / 病院 ${byType.hospital ?? 0} / 診療所 ${byType.clinic ?? 0})、座標なし等スキップ: ${skippedNoCoord}`);

if (DRY_RUN) {
  console.log("dry-run のため書き込みしません。サンプル3件:");
  console.log(valid.slice(0, 3));
  process.exit(0);
}

const token = await login();
const existing = await fetchExistingKeys(token);
const fresh = valid.filter((f) => !existing.has(`${f.name}|${f.address}`)).slice(0, LIMIT);
console.log(`既存 ${existing.size} 件との重複を除き ${fresh.length} 件を登録します`);

const BATCH = 500;
for (let i = 0; i < fresh.length; i += BATCH) {
  await insertBatch(token, fresh.slice(i, i + BATCH));
  console.log(`  ${Math.min(i + BATCH, fresh.length)} / ${fresh.length}`);
}
console.log("完了");
