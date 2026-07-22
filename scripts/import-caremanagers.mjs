// 介護サービス情報公表システムから、居宅介護支援事業所のケアマネ人数(常勤+非常勤)を取得し、
// Supabase の facilities.care_manager_count を更新する。
//
// オープンデータ(jigyosho_430.csv)には人数が無いため、事業所番号をキーに公表システムの
// 事業所詳細ページを読みに行く。データは年1〜2回しか変わらないが、月次ワークフローから
// 呼ばれても壊れないよう、失敗しても致命的にしない作りにしている。
//
// 使い方:
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... APP_ID=... APP_PASSWORD=... \
//   node scripts/import-caremanagers.mjs --data-dir <jigyosho_430.csvのフォルダ> [--limit N] [--concurrency 5]

import { readFileSync } from "node:fs";
import { join } from "node:path";

const CITIES = ["川崎市", "横浜市", "千葉市", "茂原市", "鹿児島市"];

const PREF_CODE = {
  北海道: "01", 青森県: "02", 岩手県: "03", 宮城県: "04", 秋田県: "05", 山形県: "06",
  福島県: "07", 茨城県: "08", 栃木県: "09", 群馬県: "10", 埼玉県: "11", 千葉県: "12",
  東京都: "13", 神奈川県: "14", 新潟県: "15", 富山県: "16", 石川県: "17", 福井県: "18",
  山梨県: "19", 長野県: "20", 岐阜県: "21", 静岡県: "22", 愛知県: "23", 三重県: "24",
  滋賀県: "25", 京都府: "26", 大阪府: "27", 兵庫県: "28", 奈良県: "29", 和歌山県: "30",
  鳥取県: "31", 島根県: "32", 岡山県: "33", 広島県: "34", 山口県: "35", 徳島県: "36",
  香川県: "37", 愛媛県: "38", 高知県: "39", 福岡県: "40", 佐賀県: "41", 長崎県: "42",
  熊本県: "43", 大分県: "44", 宮崎県: "45", 鹿児島県: "46", 沖縄県: "47",
};

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const DATA_DIR = getArg("--data-dir") ?? "data";
const LIMIT = getArg("--limit") ? Number(getArg("--limit")) : Infinity;
const CONCURRENCY = getArg("--concurrency") ? Number(getArg("--concurrency")) : 5;

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const APP_ID = process.env.APP_ID;
const APP_PASSWORD = process.env.APP_PASSWORD;
if (!SUPABASE_URL || !ANON_KEY || !APP_ID || !APP_PASSWORD) {
  console.error("環境変数 SUPABASE_URL / SUPABASE_ANON_KEY / APP_ID / APP_PASSWORD を設定してください");
  process.exit(1);
}

// ---- CSV パーサ (引用符・埋め込み改行対応) ----
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length > 0) { row.push(field); if (row.length > 1 || row[0] !== "") rows.push(row); }
  return rows;
}

// jigyosho_430.csv から対象市の居宅事業所 {name, address, no, pref} を取り出す
function loadOffices() {
  const text = readFileSync(join(DATA_DIR, "jigyosho_430.csv"), "utf-8").replace(/^﻿/, "");
  const rows = parseCsv(text);
  const h = rows[0];
  const ci = (n) => h.indexOf(n);
  const iCity = ci("市区町村名"), iName = ci("事業所名"), iAddr = ci("住所"), iNo = ci("事業所番号"), iPref = ci("都道府県名");
  const out = [];
  for (const r of rows.slice(1)) {
    if (!CITIES.some((c) => (r[iCity] ?? "").startsWith(c))) continue;
    if (!r[iNo]) continue;
    out.push({ name: r[iName], address: r[iAddr], no: r[iNo], pref: r[iPref] });
  }
  return out;
}

// ---- 公表システム ----
export function parseCareManagers(html) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const m = text.match(/ケアマネジャー数\s*常勤\s*(\d+)\s*人\s*非常勤\s*(\d+)\s*人/);
  if (!m) return null;
  return Number(m[1]) + Number(m[2]);
}

async function fetchCount(prefCode, no) {
  const url = `https://www.kaigokensaku.mhlw.go.jp/${prefCode}/index.php?action_kouhyou_detail_022_kani=true&JigyosyoCd=${no}-00&ServiceCd=430`;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (facility-data-sync)" }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseCareManagers(await res.text());
    } catch (e) {
      if (attempt >= 2) throw e;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
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

async function fetchKyotakuFacilities(token) {
  const map = new Map(); // name|address -> {id, care_manager_count}
  for (let from = 0; ; from += 1000) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/facilities?type=eq.kyotaku&select=id,name,address,care_manager_count&order=created_at&offset=${from}&limit=1000`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`施設取得失敗: ${await res.text()}`);
    const batch = await res.json();
    for (const f of batch) map.set(`${f.name}|${f.address}`, { id: f.id, current: f.care_manager_count ?? 0 });
    if (batch.length < 1000) break;
  }
  return map;
}

async function patchCount(token, id, count) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/facilities?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: ANON_KEY, Authorization: `Bearer ${token}`,
      "Content-Type": "application/json", Prefer: "return=minimal",
    },
    body: JSON.stringify({ care_manager_count: count }),
  });
  if (!res.ok) throw new Error(`更新失敗(${id}): ${res.status} ${await res.text()}`);
}

// ---- main ----
const token = await login();
const facilities = await fetchKyotakuFacilities(token);
const offices = loadOffices().filter((o) => facilities.has(`${o.name}|${o.address}`)).slice(0, LIMIT);
console.log(`対象の居宅事業所: ${offices.length} 件 (公表システムから人数を取得します)`);

let done = 0, updated = 0, notFound = 0, failed = 0;
const queue = [...offices];

async function worker() {
  while (queue.length) {
    const o = queue.shift();
    const prefCode = PREF_CODE[o.pref];
    try {
      const count = prefCode ? await fetchCount(prefCode, o.no) : null;
      if (count === null) notFound++;
      else {
        const f = facilities.get(`${o.name}|${o.address}`);
        if (f && count !== f.current) { await patchCount(token, f.id, count); updated++; }
      }
    } catch {
      failed++;
    }
    done++;
    if (done % 100 === 0) console.log(`  ${done}/${offices.length} (更新 ${updated} / 該当なし ${notFound} / 失敗 ${failed})`);
    await new Promise((r) => setTimeout(r, 120)); // 公表システムへの負荷を抑える
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`完了: ${done} 件処理 (更新 ${updated} / 人数記載なし ${notFound} / 取得失敗 ${failed})`);
