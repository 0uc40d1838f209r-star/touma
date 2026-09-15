import { useMemo } from "react";
import type { Visit } from "../types";
import { MEMO_TEMPLATES, REACTIONS } from "../types";

// 面談相手を「会えた/不在/その他」に分類
const MET_ABSENT = ["不在", "ケアマネ不在"];
const MET_MET = ["ケアマネ", "相談員・連携室", "医師", "事務・受付"];

function Bars({ rows, color }: { rows: [string, number][]; color: string }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  if (rows.every(([, n]) => n === 0)) return <p className="text-sm text-gray-400">記録がありません。</p>;
  return (
    <div className="space-y-2">
      {rows.map(([label, n]) => (
        <div key={label}>
          <div className="mb-0.5 flex items-baseline justify-between text-sm">
            <span className="truncate">{label}</span>
            <span className="font-semibold tabular-nums">{n}件</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-100">
            <div className="h-2.5 rounded-full" style={{ width: `${Math.max((n / max) * 100, n > 0 ? 4 : 0)}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StrategyTab({ visits, onOpenManual }: { visits: Visit[]; onOpenManual: () => void }) {
  const stat = useMemo(() => {
    const total = visits.length;
    const metCounts = new Map<string, number>();
    const reactionCounts: Record<string, number> = { hot: 0, warm: 0, cold: 0 };
    const actionCounts = new Map<string, number>(MEMO_TEMPLATES.map((t) => [t, 0]));
    let absent = 0;
    let metSomeone = 0;
    let newClients = 0;
    let consults = 0;
    for (const v of visits) {
      if (v.met) metCounts.set(v.met, (metCounts.get(v.met) ?? 0) + 1);
      if (MET_ABSENT.includes(v.met)) absent++;
      if (MET_MET.includes(v.met)) metSomeone++;
      if (v.reaction && reactionCounts[v.reaction] !== undefined) reactionCounts[v.reaction]++;
      if (v.outcome === "new_client") newClients++;
      if (v.outcome === "consult") consults++;
      for (const t of MEMO_TEMPLATES) if (v.memo && v.memo.includes(t)) actionCounts.set(t, (actionCounts.get(t) ?? 0) + 1);
    }
    return { total, metCounts, reactionCounts, actionCounts, absent, metSomeone, newClients, consults };
  }, [visits]);

  const pct = (n: number) => (stat.total > 0 ? Math.round((n / stat.total) * 100) : 0);

  // データに応じた戦略アドバイス
  const advice = useMemo(() => {
    const a: { icon: string; text: string }[] = [];
    if (stat.total === 0) {
      a.push({ icon: "📝", text: "まだ今月の記録がありません。まずは1件、訪問を記録してみましょう。傾向が見えると打ち手が分かります。" });
      return a;
    }
    const absentRate = stat.absent / stat.total;
    if (absentRate >= 0.3) {
      a.push({
        icon: "🚪",
        text: `不在が ${pct(stat.absent)}% と高めです。対策:①事前に電話でアポを取る ②ケアマネがいる早朝や夕方前を狙う ③不在でも名刺+パンフレットを置いて次回につなげる。`,
      });
    }
    if (stat.newClients === 0 && stat.consults > 0) {
      a.push({
        icon: "🔥",
        text: `相談が ${stat.consults}件 取れています。あと一歩!相談のあった施設へ1週間以内に再訪・電話でフォローすると新規につながりやすいです。`,
      });
    }
    if (stat.newClients > 0) {
      a.push({
        icon: "🎉",
        text: `新規 ${stat.newClients}件 獲得!獲得できた施設の近隣や同じ種別(居宅・小多機など)を重点的に回ると効率的です。`,
      });
    }
    const react = stat.reactionCounts;
    const reactTotal = react.hot + react.warm + react.cold;
    if (reactTotal > 0 && react.hot / reactTotal >= 0.4) {
      a.push({
        icon: "😊",
        text: "好感触の施設が多めです。良い関係の施設には『今の空き状況』『対応できる医療処置』を具体的に伝えて、指名(自ステーション希望)につなげましょう。",
      });
    }
    if (reactTotal >= 5 && react.cold / reactTotal >= 0.4) {
      a.push({
        icon: "🎯",
        text: "反応がいまいちな施設が多めです。数を追うより、退院調整の多い病院・利用者を多く抱える居宅にターゲットを絞ると効率が上がります。",
      });
    }
    const noMet = stat.total - stat.metSomeone - stat.absent;
    if (noMet / stat.total >= 0.4) {
      a.push({ icon: "🖊️", text: "『面談相手』が未記録の訪問が多いです。誰に会えたかを記録すると、次の分析と作戦がぐっと正確になります。" });
    }
    if (a.length === 0) {
      a.push({ icon: "👍", text: "バランス良く回れています。好感触だった施設への再訪を計画に入れて、関係を深めましょう。" });
    }
    return a;
  }, [stat]);

  const metRows: [string, number][] = [...stat.metCounts.entries()].sort((a, b) => b[1] - a[1]);
  const reactionRows: [string, number][] = Object.entries(REACTIONS).map(([k, r]) => [r.label, stat.reactionCounts[k] ?? 0]);
  const actionRows: [string, number][] = [...stat.actionCounts.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      {/* 会えた率 / 不在率 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">面談できた率</div>
          <div className="text-2xl font-bold text-emerald-600">{pct(stat.metSomeone)}%</div>
          <div className="text-[11px] text-gray-400">{stat.metSomeone}/{stat.total}件</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">不在率</div>
          <div className="text-2xl font-bold text-gray-700">{pct(stat.absent)}%</div>
          <div className="text-[11px] text-gray-400">{stat.absent}/{stat.total}件</div>
        </div>
      </div>

      {/* 戦略アドバイス */}
      <div className="rounded-2xl border border-brand-soft bg-brand-softer p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-brand-ink">💡 今月の戦略アドバイス</h3>
        <ul className="space-y-2">
          {advice.map((a, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-700">
              <span className="shrink-0">{a.icon}</span>
              <span>{a.text}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={onOpenManual}
          className="mt-3 w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-white active:bg-brand-dark"
        >
          📖 営業トークのマニュアルを見る
        </button>
      </div>

      {/* 面談相手の内訳 */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold">面談相手の内訳</h3>
        <Bars rows={metRows} color="#2563eb" />
      </div>

      {/* 反応の内訳 */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold">先方の反応の内訳</h3>
        <Bars rows={reactionRows} color="#f5385c" />
      </div>

      {/* よくある行動 (定型文) */}
      {actionRows.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold">よくある行動・状況(メモから)</h3>
          <Bars rows={actionRows} color="#0d9488" />
        </div>
      )}
    </div>
  );
}
