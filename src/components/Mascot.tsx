import { useEffect, useState } from "react";

// 癒しキャラクター「まっぷん」(ナースキャップのくま)。訪問件数に応じて表情・装飾が変わる
export type Mood = "normal" | "happy" | "super";

export function Mascot({ mood = "normal", size = 64, crown = false }: { mood?: Mood; size?: number; crown?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      {/* キラキラ(super) */}
      {mood === "super" && (
        <g fill="#fbbc04">
          <path d="M12 20l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" />
          <path d="M88 30l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2z" />
          <path d="M84 72l1.6 3.6 3.6 1.6-3.6 1.6-1.6 3.6-1.6-3.6-3.6-1.6 3.6-1.6z" />
        </g>
      )}
      {/* 耳 */}
      <circle cx="27" cy="34" r="11" fill="#f2c9a0" />
      <circle cx="73" cy="34" r="11" fill="#f2c9a0" />
      <circle cx="27" cy="34" r="6" fill="#f7a8a0" />
      <circle cx="73" cy="34" r="6" fill="#f7a8a0" />
      {/* 顔 */}
      <circle cx="50" cy="58" r="33" fill="#f6d6b4" />
      {/* ナースキャップ */}
      <path d="M30 32 Q50 18 70 32 L66 40 Q50 32 34 40 Z" fill="#ffffff" stroke="#dadce0" strokeWidth="1.5" />
      <rect x="47" y="25" width="6" height="12" rx="1" fill="#1a73e8" />
      <rect x="44" y="28" width="12" height="6" rx="1" fill="#1a73e8" />
      {/* 王冠(上位ランク) */}
      {crown && (
        <path d="M36 16 L42 24 L50 12 L58 24 L64 16 L62 28 L38 28 Z" fill="#fbbc04" stroke="#e8a000" strokeWidth="1" />
      )}
      {/* 目 */}
      {mood === "normal" && (
        <g fill="#3c4043">
          <circle cx="39" cy="57" r="3.6" />
          <circle cx="61" cy="57" r="3.6" />
          <circle cx="40.2" cy="55.8" r="1.1" fill="#fff" />
          <circle cx="62.2" cy="55.8" r="1.1" fill="#fff" />
        </g>
      )}
      {mood === "happy" && (
        <g stroke="#3c4043" strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M34 58 Q39 52 44 58" />
          <path d="M56 58 Q61 52 66 58" />
        </g>
      )}
      {mood === "super" && (
        <g fill="#fbbc04" stroke="#e8a000" strokeWidth="0.8">
          <path d="M39 50l2 4.3 4.7.6-3.4 3.2.9 4.6-4.2-2.3-4.2 2.3.9-4.6-3.4-3.2 4.7-.6z" />
          <path d="M61 50l2 4.3 4.7.6-3.4 3.2.9 4.6-4.2-2.3-4.2 2.3.9-4.6-3.4-3.2 4.7-.6z" />
        </g>
      )}
      {/* ほっぺ */}
      <ellipse cx="31" cy="67" rx="6" ry="3.6" fill="#f7a8a0" opacity="0.8" />
      <ellipse cx="69" cy="67" rx="6" ry="3.6" fill="#f7a8a0" opacity="0.8" />
      {/* 鼻・口 */}
      <ellipse cx="50" cy="64" rx="3" ry="2.2" fill="#8d5a3b" />
      {mood === "normal" ? (
        <path d="M45 69 Q50 73 55 69" stroke="#8d5a3b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M43 68 Q50 78 57 68 Z" fill="#c0504d" />
      )}
    </svg>
  );
}

// ---- 今月の訪問件数によるランク ----
export interface Rank {
  title: string;
  mood: Mood;
  crown: boolean;
  color: string;
}
export function rankOf(n: number): Rank {
  if (n >= 50) return { title: "伝説の営業", mood: "super", crown: true, color: "#e8a000" };
  if (n >= 30) return { title: "スーパーエース", mood: "super", crown: true, color: "#e8a000" };
  if (n >= 20) return { title: "営業エース", mood: "super", crown: false, color: "#d93025" };
  if (n >= 10) return { title: "営業の星", mood: "happy", crown: false, color: "#1a73e8" };
  if (n >= 5) return { title: "がんばり屋さん", mood: "happy", crown: false, color: "#188038" };
  if (n >= 1) return { title: "営業ルーキー", mood: "normal", crown: false, color: "#5f6368" };
  return { title: "はじめの一歩", mood: "normal", crown: false, color: "#5f6368" };
}

// 節目の件数(到達した瞬間に特別なお祝い)
export const MILESTONES = [5, 10, 20, 30, 40, 50, 75, 100];

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];

// 件数に応じた癒し・ねぎらいメッセージ
export function healingMessage(month: number, today: number): string {
  if (today >= 6) {
    return pick([
      `今日だけで${today}件も…!がんばりすぎ注意、お水を飲んでね💧`,
      `今日${today}件!足、パンパンじゃない?少し座って休もう🪑`,
    ]);
  }
  if (month >= 30) {
    return pick([
      `今月${month}件…!本当にすごいよ。ちゃんと休めてる?🍵`,
      `${month}件も回ってくれてありがとう。あなたのおかげでチームが回ってるよ✨`,
      `すごすぎる…!今夜はゆっくりお風呂に浸かってね🛁`,
    ]);
  }
  if (month >= 15) {
    return pick([
      `今月${month}件!いつもありがとう。甘いものでひと休みしよう🍩`,
      `${month}件達成!その積み重ねが紹介につながるよ。肩まわしてリラックス〜🙆`,
    ]);
  }
  if (month >= 5) {
    return pick([
      `今月${month}件!いい調子だね。深呼吸してひと息☕`,
      `コツコツ${month}件、えらい!無理しないでね🌱`,
    ]);
  }
  return pick([
    "おつかれさま!今日も一歩前進だね☕",
    "足を運んでくれてありがとう。それだけで信頼が育つよ🌷",
    "まずは1件ずつ。いっしょにがんばろう!",
  ]);
}

// ---- 記録した直後に出るねぎらいトースト(キャラ付き) ----
export function MascotToast({ month, message, onClose }: { month: number; message: string; onClose: () => void }) {
  const r = rankOf(month);
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed inset-x-0 bottom-24 z-[1350] flex justify-center px-4 md:bottom-8" onClick={onClose}>
      <div className="g-elev mascot-pop flex max-w-sm items-center gap-3 rounded-3xl bg-white p-3 pr-4">
        <div className="shrink-0">
          <Mascot mood={r.mood} crown={r.crown} size={60} />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold" style={{ color: r.color }}>
            今月{month}件 ・ {r.title}
          </div>
          <p className="text-sm leading-snug text-gray-800">{message}</p>
        </div>
      </div>
    </div>
  );
}

// ---- 節目到達のお祝い ----
export function MilestoneCelebration({ month, onClose }: { month: number; onClose: () => void }) {
  const r = rankOf(month);
  const [confetti] = useState(() =>
    Array.from({ length: 28 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      dur: 2.4 + Math.random() * 1.6,
      ch: ["🎉", "✨", "🌸", "⭐", "💐", "🎊"][i % 6],
    })),
  );
  return (
    <div className="fixed inset-0 z-[1450] flex items-center justify-center bg-black/50 px-6" onClick={onClose}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="confetti absolute top-0 text-2xl"
            style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }}
          >
            {c.ch}
          </span>
        ))}
      </div>
      <div className="mascot-pop relative w-full max-w-xs rounded-3xl bg-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-2 w-fit">
          <Mascot mood="super" crown={r.crown} size={110} />
        </div>
        <div className="text-xs font-bold" style={{ color: r.color }}>
          称号「{r.title}」
        </div>
        <h2 className="mt-1 text-2xl font-bold text-gray-900">今月{month}件 達成!</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          {month >= 30
            ? "ここまで本当にがんばったね。あなたの足が、たくさんの利用者さんにつながっています。今日はしっかり休んでね🍵"
            : month >= 10
              ? "コツコツ続けてきた成果だよ!いつもありがとう。自分にご褒美をあげてね🍰"
              : "いいスタート!この調子で、無理せずいこうね🌱"}
        </p>
        <button onClick={onClose} className="mt-5 w-full rounded-full bg-brand py-3 text-sm font-medium text-white">
          ありがとう!
        </button>
      </div>
    </div>
  );
}

// ---- 地図の左下にいる、いつでも癒してくれるキャラ ----
export function MascotWidget({ month, today }: { month: number; today: number }) {
  const r = rankOf(month);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 5000);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <div className="pointer-events-auto flex items-end gap-1.5">
      <button
        onClick={() => setMsg(healingMessage(month, today))}
        className="g-elev mascot-bob grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white"
        aria-label="まっぷんに話しかける"
      >
        <Mascot mood={r.mood} crown={r.crown} size={48} />
      </button>
      {msg ? (
        <div className="g-elev mascot-pop mb-1 max-w-[220px] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-xs leading-snug text-gray-800">
          {msg}
        </div>
      ) : (
        <div className="g-elev mb-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold" style={{ color: r.color }}>
          今月{month}件
        </div>
      )}
    </div>
  );
}

// ---- 営業のお供: 時間帯のあいさつ ----
export function greetingMessage(name?: string | null): string {
  const h = new Date().getHours();
  const who = name ? `${name}さん、` : "";
  if (h >= 5 && h < 10) return `${who}おはよう!今日もいっしょに回ろうね☀️`;
  if (h >= 10 && h < 14) return `${who}こんにちは!お昼ごはんはちゃんと食べてね🍙`;
  if (h >= 14 && h < 18) return `${who}午後もいっしょにがんばろう!水分補給も忘れずにね💧`;
  return `${who}おつかれさま。今日もよくがんばったね🌙`;
}

// ---- 営業のお供: 施設を開いたときのひとこと ----
export function facilityRemark(
  f: { name: string; care_manager_count?: number; referrals?: Record<string, number> },
  visits: { visited_on: string; met: string }[],
): string {
  const refs = Object.values(f.referrals ?? {}).reduce((a, b) => a + b, 0);
  const cm = f.care_manager_count ?? 0;
  const sorted = [...visits].sort((a, b) => b.visited_on.localeCompare(a.visited_on));
  const absentStreak = sorted.length >= 2 && sorted.slice(0, 2).every((v) => v.met === "不在" || v.met === "ケアマネ不在");
  const extra = cm >= 5 ? `ケアマネさんが${cm}人いる大きな事業所だよ!` : "";
  if (absentStreak) return "ここ最近、不在が続いてるね。電話で在席を確かめてから行くとムダ足が減るよ📞";
  if (refs > 0) return `紹介を${refs}件もらってる大事な先!会えたらお礼を伝えてね💐 ${extra}`.trim();
  if (sorted.length === 0) return `ここは初めての訪問だね。笑顔でごあいさつ、がんばって!😊 ${extra}`.trim();
  const last = sorted[0].visited_on.slice(5).replace("-", "/");
  return `前回は${last}に来てるね。今回で${sorted.length + 1}回目の訪問だよ! ${extra}`.trim();
}

// ---- 営業のお供: 画面にずっといてくれるキャラ ----
export function Companion({
  month,
  today,
  hasIdentity,
  say,
  onNeedIdentity,
}: {
  month: number;
  today: number;
  hasIdentity: boolean;
  say: { text: string; key: number } | null; // 外から話させたい内容
  onNeedIdentity: () => void;
}) {
  const r = rankOf(month);
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null);

  // 外からのセリフ
  useEffect(() => {
    if (say) setMsg(say);
  }, [say]);
  // 6秒で吹き出しを閉じる
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 6500);
    return () => clearTimeout(t);
  }, [msg]);

  const talk = () => {
    if (!hasIdentity) {
      onNeedIdentity();
      return;
    }
    setMsg({ text: healingMessage(month, today), key: Date.now() });
  };

  return (
    <div className="pointer-events-auto flex items-end gap-1.5">
      <button
        onClick={talk}
        className={`g-elev grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white ${msg ? "mascot-hop" : "mascot-bob"}`}
        aria-label="まっぷんに話しかける"
        key={`btn-${msg?.key ?? 0}`}
      >
        <Mascot mood={msg ? "happy" : r.mood} crown={r.crown} size={48} />
      </button>
      {msg ? (
        <div key={`msg-${msg.key}`} className="g-elev mascot-pop mb-1 max-w-[230px] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-xs leading-snug text-gray-800">
          {msg.text}
        </div>
      ) : (
        <div className="g-elev mb-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold" style={{ color: r.color }}>
          {hasIdentity ? `今月${month}件` : "名前を選んでね"}
        </div>
      )}
    </div>
  );
}
