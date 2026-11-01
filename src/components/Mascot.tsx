import { useEffect, useState } from "react";

// 癒しキャラクター(営業のお供)。ちびキャラ風。訪問件数に応じて表情・装飾が変わる
export type Mood = "normal" | "happy" | "super";
export type MascotKind = "bear" | "cat" | "rabbit" | "chick";

export const MASCOTS: Record<MascotKind, { name: string; label: string }> = {
  bear: { name: "まっぷん", label: "くま" },
  cat: { name: "にゃっぷ", label: "ねこ" },
  rabbit: { name: "ぴょんぷ", label: "うさぎ" },
  chick: { name: "ぴよっぷ", label: "ひよこ" },
};

const MASCOT_KEY = "touma-mascot";
export function getMascotKind(): MascotKind {
  try {
    const k = localStorage.getItem(MASCOT_KEY) as MascotKind | null;
    return k && k in MASCOTS ? k : "bear";
  } catch {
    return "bear";
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

const PAL: Record<MascotKind, { fill: string; line: string; inner: string; muzzle: string }> = {
  bear: { fill: "#f8dcbc", line: "#cf9a6e", inner: "#f7b7b0", muzzle: "#fff4e8" },
  cat: { fill: "#fff1dd", line: "#e3a36b", inner: "#ffc2c2", muzzle: "#ffffff" },
  rabbit: { fill: "#ffffff", line: "#d9c3cc", inner: "#ffc6d3", muzzle: "#ffffff" },
  chick: { fill: "#ffe680", line: "#e8b93a", inner: "#ffd0a0", muzzle: "#fff3b8" },
};
const INK = "#4a3a33";

function Eyes({ mood }: { mood: Mood }) {
  if (mood === "happy") {
    return (
      <g stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round">
        <path d="M34 53 Q39 46.5 44 53" />
        <path d="M56 53 Q61 46.5 66 53" />
      </g>
    );
  }
  const big = mood === "super";
  return (
    <g>
      {[39, 61].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="51" rx={big ? 5.4 : 4.8} ry={big ? 6.4 : 5.8} fill={INK} />
          {big ? (
            <path
              transform={`translate(${x + 1.2} 48.6) scale(0.55)`}
              d="M0 -5 L1.4 -1.4 5 0 1.4 1.4 0 5 -1.4 1.4 -5 0 -1.4 -1.4Z"
              fill="#fff"
            />
          ) : (
            <circle cx={x + 1.5} cy="48.4" r="2" fill="#fff" />
          )}
          <circle cx={x - 1.4} cy="53.6" r="1" fill="#fff" />
        </g>
      ))}
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
  const c = PAL[k];
  const sw = 2.4;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      {/* キラキラ */}
      {mood === "super" && (
        <g fill="#ffcf3f">
          <path d="M11 30l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z" />
          <path d="M89 22l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z" />
          <path d="M88 66l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" />
        </g>
      )}

      {/* からだ + 手 + お供のかばん */}
      <g stroke={c.line} strokeWidth={sw} strokeLinejoin="round">
        <ellipse cx="50" cy="86" rx="21" ry="12.5" fill={c.fill} />
        <ellipse cx="30.5" cy="83" rx="6" ry="5" fill={c.fill} />
        <ellipse cx="69.5" cy="83" rx="6" ry="5" fill={c.fill} />
      </g>
      <rect x="57" y="81" width="15" height="11" rx="3" fill="#8fb8f0" stroke="#5f8fd6" strokeWidth="1.6" />
      <rect x="62" y="79" width="5" height="3" rx="1" fill="none" stroke="#5f8fd6" strokeWidth="1.4" />

      {/* 耳(種類ごと) */}
      {k === "bear" && (
        <g stroke={c.line} strokeWidth={sw}>
          <circle cx="26" cy="27" r="10" fill={c.fill} />
          <circle cx="74" cy="27" r="10" fill={c.fill} />
          <circle cx="26" cy="27" r="5" fill={c.inner} stroke="none" />
          <circle cx="74" cy="27" r="5" fill={c.inner} stroke="none" />
        </g>
      )}
      {k === "cat" && (
        <g stroke={c.line} strokeWidth={sw} strokeLinejoin="round">
          <path d="M22 35 Q20 14 28 13 Q35 15 40 25Z" fill={c.fill} />
          <path d="M78 35 Q80 14 72 13 Q65 15 60 25Z" fill={c.fill} />
          <path d="M26 30 Q25 20 29 19 Q33 21 35 26Z" fill={c.inner} stroke="none" />
          <path d="M74 30 Q75 20 71 19 Q67 21 65 26Z" fill={c.inner} stroke="none" />
        </g>
      )}
      {k === "rabbit" && (
        <g stroke={c.line} strokeWidth={sw}>
          <ellipse cx="38" cy="15" rx="7.5" ry="17" fill={c.fill} transform="rotate(-10 38 15)" />
          <ellipse cx="62" cy="15" rx="7.5" ry="17" fill={c.fill} transform="rotate(10 62 15)" />
          <ellipse cx="38" cy="16" rx="3.6" ry="11" fill={c.inner} stroke="none" transform="rotate(-10 38 16)" />
          <ellipse cx="62" cy="16" rx="3.6" ry="11" fill={c.inner} stroke="none" transform="rotate(10 62 16)" />
        </g>
      )}

      {/* あたま */}
      <circle cx="50" cy="48" r="29" fill={c.fill} stroke={c.line} strokeWidth={sw} />
      {k === "chick" && <path d="M47 20 Q49 11 53 14 Q52 17 56 15 Q55 21 51 20Z" fill={c.fill} stroke={c.line} strokeWidth="2" />}
      {k === "cat" && (
        <g fill="#f3b97f" opacity="0.8">
          <path d="M44 21 Q50 19 56 21 L54 28 Q50 26 46 28Z" />
        </g>
      )}

      {/* ナースキャップ */}
      {k !== "rabbit" && k !== "chick" ? (
        <g>
          <path d="M37 24 Q50 15 63 24 L60.5 31 Q50 27 39.5 31Z" fill="#ffffff" stroke="#e2d4d8" strokeWidth="1.6" strokeLinejoin="round" />
          <rect x="48.4" y="20.6" width="3.2" height="7.6" rx="1" fill="#ff7d96" />
          <rect x="46.2" y="22.8" width="7.6" height="3.2" rx="1" fill="#ff7d96" />
        </g>
      ) : (
        <g>
          <path d="M40 24.5 Q50 18 60 24.5 L58 30 Q50 27 42 30Z" fill="#ffffff" stroke="#e2d4d8" strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="48.6" y="21.6" width="2.8" height="6.4" rx="0.8" fill="#ff7d96" />
          <rect x="46.8" y="23.4" width="6.4" height="2.8" rx="0.8" fill="#ff7d96" />
        </g>
      )}
      {/* 王冠(上位ランク) */}
      {crown && (
        <path d="M37 13 L42 19 L50 8 L58 19 L63 13 L61 23 L39 23Z" fill="#ffcf3f" stroke="#e8a100" strokeWidth="1.4" strokeLinejoin="round" />
      )}

      {/* 顔 */}
      <ellipse cx="50" cy="61" rx="11" ry="8" fill={c.muzzle} opacity={k === "rabbit" ? 0 : 0.9} />
      <Eyes mood={mood} />
      <ellipse cx="29.5" cy="60" rx="6.2" ry="3.8" fill="#ff9aa8" opacity="0.65" />
      <ellipse cx="70.5" cy="60" rx="6.2" ry="3.8" fill="#ff9aa8" opacity="0.65" />
      {k === "chick" ? (
        <path d="M45.5 57.5 L54.5 57.5 L50 63Z" fill="#ff9f43" stroke="#e7832a" strokeWidth="1.2" strokeLinejoin="round" />
      ) : (
        <ellipse cx="50" cy="57.6" rx="2.6" ry="1.9" fill={INK} />
      )}
      {k === "cat" && (
        <g stroke={c.line} strokeWidth="1.3" strokeLinecap="round">
          <path d="M23 56 L33 57.5" />
          <path d="M23 61 L33 60" />
          <path d="M77 56 L67 57.5" />
          <path d="M77 61 L67 60" />
        </g>
      )}
      {mood === "normal" ? (
        <path d="M45.5 61 Q47.8 64 50 61 Q52.2 64 54.5 61" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M45 61 Q50 69.5 55 61Z" fill="#e8677a" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
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
