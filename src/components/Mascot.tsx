import { useEffect, useId, useState } from "react";

// 営業のお供キャラクター(オリジナル)。訪問看護と営業先マップにちなんだ4人。
// 訪問件数に応じて表情・装飾が変わる
export type Mood = "normal" | "happy" | "super";
export type MascotKind = "pin" | "capsule" | "house" | "bandage";

export const MASCOTS: Record<MascotKind, { name: string; label: string; intro: string }> = {
  pin: { name: "ピンキー", label: "地図のピン", intro: "行き先を見つけるのが得意。迷ったら任せて!" },
  capsule: { name: "カプたん", label: "おくすりカプセル", intro: "元気のもとを届けるよ。疲れたら休憩してね" },
  house: { name: "おうちん", label: "おうち", intro: "訪問看護といえば、おうち。ただいまを待ってるよ" },
  bandage: { name: "ばんそ", label: "ばんそうこう", intro: "心のキズもそっと手当て。いつでも味方だよ" },
};

const MASCOT_KEY = "touma-mascot";
export function getMascotKind(): MascotKind {
  try {
    const k = localStorage.getItem(MASCOT_KEY) as MascotKind | null;
    return k && k in MASCOTS ? k : "pin";
  } catch {
    return "pin";
  }
}
export function setMascotKind(k: MascotKind) {
  try {
    localStorage.setItem(MASCOT_KEY, k);
  } catch {
    /* 何もしない */
  }
  window.dispatchEvent(new Event("touma-mascot-change"));
}
// 選んだキャラを購読するフック
export function useMascotKind(): MascotKind {
  const [k, setK] = useState<MascotKind>(() => getMascotKind());
  useEffect(() => {
    const on = () => setK(getMascotKind());
    window.addEventListener("touma-mascot-change", on);
    return () => window.removeEventListener("touma-mascot-change", on);
  }, []);
  return k;
}

const INK = "#2b2540";

// 顔(4人共通のパーツ)
function Face({ cx, cy, mood, s = 1 }: { cx: number; cy: number; mood: Mood; s?: number }) {
  const ex = 8.5 * s;
  return (
    <g>
      {/* ほっぺ */}
      <ellipse cx={cx - 14 * s} cy={cy + 5 * s} rx={4.6 * s} ry={2.8 * s} fill="#ff7fa1" opacity="0.45" />
      <ellipse cx={cx + 14 * s} cy={cy + 5 * s} rx={4.6 * s} ry={2.8 * s} fill="#ff7fa1" opacity="0.45" />
      {/* 目 */}
      {mood === "normal" &&
        [-1, 1].map((d) => (
          <g key={d}>
            <ellipse cx={cx + d * ex} cy={cy} rx={3 * s} ry={4 * s} fill={INK} />
            <circle cx={cx + d * ex + 1 * s} cy={cy - 1.6 * s} r={1.2 * s} fill="#fff" />
          </g>
        ))}
      {mood === "happy" && (
        <g stroke={INK} strokeWidth={2.6 * s} fill="none" strokeLinecap="round">
          <path d={`M${cx - ex - 3.6 * s} ${cy + 1 * s} Q${cx - ex} ${cy - 4 * s} ${cx - ex + 3.6 * s} ${cy + 1 * s}`} />
          <path d={`M${cx + ex - 3.6 * s} ${cy + 1 * s} Q${cx + ex} ${cy - 4 * s} ${cx + ex + 3.6 * s} ${cy + 1 * s}`} />
        </g>
      )}
      {mood === "super" &&
        [-1, 1].map((d) => (
          <path
            key={d}
            transform={`translate(${cx + d * ex} ${cy}) scale(${0.95 * s})`}
            d="M0 -5.2 L1.5 -1.6 5.2 -1.4 2.3 1 3.2 4.8 0 2.8 -3.2 4.8 -2.3 1 -5.2 -1.4 -1.5 -1.6Z"
            fill="#ffb300"
          />
        ))}
      {/* 口 */}
      {mood === "normal" ? (
        <path
          d={`M${cx - 3 * s} ${cy + 5.5 * s} Q${cx} ${cy + 8.5 * s} ${cx + 3 * s} ${cy + 5.5 * s}`}
          stroke={INK}
          strokeWidth={2 * s}
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <g>
          <path d={`M${cx - 4.2 * s} ${cy + 5 * s} Q${cx} ${cy + 12 * s} ${cx + 4.2 * s} ${cy + 5 * s}Z`} fill={INK} />
          <ellipse cx={cx} cy={cy + 8.6 * s} rx={2.2 * s} ry={1.5 * s} fill="#ff7f8e" />
        </g>
      )}
    </g>
  );
}

// 頭の上の位置(王冠を乗せる場所)
const TOP: Record<MascotKind, number> = { pin: 16, capsule: 13, house: 13, bandage: 38 };

function Body({ k, id, mood }: { k: MascotKind; id: string; mood: Mood }) {
  if (k === "pin") {
    return (
      <g>
        <defs>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff9a8b" />
            <stop offset="1" stopColor="#ff4f8b" />
          </linearGradient>
        </defs>
        <path d="M50 93 C43 80 21 65 21 42 A29 29 0 1 1 79 42 C79 65 57 80 50 93Z" fill={`url(#${id}g)`} />
        <path d="M33 27 Q40 19 50 18" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.45" fill="none" />
        <circle cx="50" cy="44" r="19" fill="#fff6f2" />
        {/* ナースのヘアピン */}
        <g transform="translate(70 22) rotate(18)">
          <rect x="-5.5" y="-5.5" width="11" height="11" rx="3" fill="#fff" />
          <rect x="-1.3" y="-3.8" width="2.6" height="7.6" rx="0.8" fill="#ff4f8b" />
          <rect x="-3.8" y="-1.3" width="7.6" height="2.6" rx="0.8" fill="#ff4f8b" />
        </g>
        <Face cx={50} cy={43} mood={mood} s={0.95} />
      </g>
    );
  }
  if (k === "capsule") {
    return (
      <g>
        <defs>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7cf0d2" />
            <stop offset="1" stopColor="#19b7a0" />
          </linearGradient>
          <clipPath id={`${id}c`}>
            <rect x="27" y="12" width="46" height="80" rx="23" />
          </clipPath>
        </defs>
        <g transform="rotate(-8 50 52)">
          <g clipPath={`url(#${id}c)`}>
            <rect x="27" y="12" width="46" height="80" fill="#fffdf8" />
            <rect x="27" y="12" width="46" height="36" fill={`url(#${id}g)`} />
          </g>
          <rect x="27" y="12" width="46" height="80" rx="23" fill="none" stroke="#e5ece9" strokeWidth="1.5" />
          <path d="M36 22 Q39 17 45 16" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" opacity="0.6" fill="none" />
          {/* 手 */}
          <ellipse cx="25" cy="66" rx="5" ry="4" fill="#fffdf8" stroke="#e5ece9" strokeWidth="1.4" />
          <ellipse cx="75" cy="66" rx="5" ry="4" fill="#fffdf8" stroke="#e5ece9" strokeWidth="1.4" />
          <Face cx={50} cy={62} mood={mood} s={0.95} />
        </g>
      </g>
    );
  }
  if (k === "house") {
    return (
      <g>
        <defs>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffc46b" />
            <stop offset="1" stopColor="#ff8a3d" />
          </linearGradient>
        </defs>
        {/* 煙突とハートの煙 */}
        <rect x="64" y="20" width="9" height="16" rx="2" fill="#d96f2a" />
        <path d="M68.5 13.5 c-1.6-2.6-5.6-1.6-5.2 1.3 .3 2 2.6 3.3 5.2 5 2.6-1.7 4.9-3 5.2-5 .4-2.9-3.6-3.9-5.2-1.3z" fill="#ff7fa1" />
        {/* かべ */}
        <rect x="22" y="42" width="56" height="48" rx="12" fill="#fff4e6" />
        {/* やね */}
        <path d="M17 47 L50 17 L83 47Z" fill={`url(#${id}g)`} stroke={`url(#${id}g)`} strokeWidth="9" strokeLinejoin="round" />
        <path d="M34 33 L46 22" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
        {/* ドア(ハート) */}
        <rect x="44" y="76" width="12" height="14" rx="6" fill="#ffd2a8" />
        <Face cx={50} cy={60} mood={mood} s={0.9} />
      </g>
    );
  }
  // bandage
  return (
    <g>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffd3ad" />
          <stop offset="1" stopColor="#ffb98a" />
        </linearGradient>
      </defs>
      <g transform="rotate(-12 50 58)">
        <rect x="8" y="38" width="84" height="40" rx="20" fill={`url(#${id}g)`} />
        {[16, 24, 76, 84].map((x) =>
          [52, 64].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="#e8955e" opacity="0.7" />),
        )}
        <rect x="31" y="40" width="38" height="36" rx="9" fill="#fff6ee" />
        <path d="M14 45 Q20 40 28 40" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.5" fill="none" />
        <Face cx={50} cy={56} mood={mood} s={0.85} />
      </g>
    </g>
  );
}

export function Mascot({
  mood = "normal",
  size = 64,
  crown = false,
  kind,
}: {
  mood?: Mood;
  size?: number;
  crown?: boolean;
  kind?: MascotKind;
}) {
  const chosen = useMascotKind();
  const k = kind ?? chosen;
  const id = "m" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      {/* 影 */}
      <ellipse cx="50" cy="96" rx="20" ry="2.6" fill="#000" opacity="0.08" />
      {/* キラキラ */}
      {mood === "super" && (
        <g fill="#ffc83d">
          <path d="M10 30l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z" />
          <path d="M90 20l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z" />
          <path d="M90 70l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" />
        </g>
      )}
      <Body k={k} id={id} mood={mood} />
      {/* 王冠(上位ランク) */}
      {crown && (
        <g transform={`translate(50 ${TOP[k] - 7})`}>
          <path d="M-13 7 L-14 -5 L-6 1 L0 -9 L6 1 L14 -5 L13 7Z" fill="#ffcf3f" stroke="#eaa400" strokeWidth="1.4" strokeLinejoin="round" />
          <circle cx="0" cy="2" r="1.8" fill="#ff4f8b" />
        </g>
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
        aria-label="お供キャラに話しかける"
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
        aria-label="お供キャラに話しかける"
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

// ---- お供キャラを選ぶ画面 ----
export function MascotPicker({ onClose }: { onClose: () => void }) {
  const current = useMascotKind();
  return (
    <div className="fixed inset-0 z-[1300] flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:max-w-md md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-medium text-gray-900">お供キャラを選ぶ</h2>
        <p className="mb-4 mt-1 text-xs text-gray-500">営業にいっしょについてきてくれるキャラクターです。自分のスマホだけで変わります。</p>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(MASCOTS) as MascotKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setMascotKind(k)}
              className={`flex flex-col items-center rounded-2xl border-2 p-3 ${current === k ? "border-brand bg-brand-softer" : "border-gray-200"}`}
            >
              <Mascot kind={k} mood={current === k ? "happy" : "normal"} size={84} />
              <span className="mt-1 text-sm font-medium text-gray-900">{MASCOTS[k].name}</span>
              <span className="text-[11px] text-gray-500">{MASCOTS[k].label}</span>
              <span className="mt-1 text-[11px] leading-snug text-gray-600">{MASCOTS[k].intro}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-full bg-brand py-3 text-sm font-medium text-white">
          この子にする
        </button>
      </div>
    </div>
  );
}
