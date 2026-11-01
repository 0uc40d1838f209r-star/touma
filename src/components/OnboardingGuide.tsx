import { useState } from "react";

// 初めて使う人向けの使い方ガイド(初回に自動表示・☰メニューからいつでも見直せる)
export const ONBOARD_KEY = "touma-onboarded-v1";

const STEPS: { icon: string; title: string; points: string[] }[] = [
  {
    icon: "👋",
    title: "ようこそ「営業先マップ」へ",
    points: [
      "居宅・病院・クリニックなどの営業先が地図に並んでいます。",
      "訪問した内容を記録すると、チーム全員で共有されます。",
      "1分で使い方を説明します。下の「次へ」を押してください。",
    ],
  },
  {
    icon: "🔍",
    title: "営業先をさがす",
    points: [
      "上の検索バーに施設名や住所を入れると絞り込めます。",
      "その下の丸いボタンで「居宅だけ」「未訪問だけ」なども絞り込めます。",
      "右下の ◎ ボタンで自分の現在地に移動します。",
      "下の「リスト」で一覧表示にもできます。",
    ],
  },
  {
    icon: "✏️",
    title: "訪問したら記録する",
    points: [
      "地図のピンをタップ →「✏️ 訪問を記録」→「＋ 訪問を記録」。",
      "訪問者に自分の名前を選ぶと、拠点も自動で入ります。",
      "成果(挨拶・相談・新規)と先方の反応をタップで選ぶだけ。メモは定型文も使えます。",
      "記録するとねぎらいの一言が出ます。おつかれさまです！",
    ],
  },
  {
    icon: "🚗",
    title: "移動をラクにする",
    points: [
      "施設の青い「経路」ボタンで、Googleマップのナビがすぐ開きます。",
      "「ルートに追加」で回る先をためて、まとめてナビできます(上の「🚗 ルート」)。",
      "「🧍 自分の訪問先」で、自分が行った施設だけを新しい順に見られます。",
    ],
  },
  {
    icon: "📊",
    title: "実績と作戦をみる",
    points: [
      "下の「実績」で、月ごとの訪問件数・成果・店舗比較が見られます。",
      "☰ →「戦略・アドバイス」で、不在が多い先などへの対策が自動で出ます。",
      "☰ →「営業マニュアル」に、トーク例や新規獲得のコツがあります。",
    ],
  },
  {
    icon: "🛡️",
    title: "安心して使えます",
    points: [
      "書きかけの記録は自動で保存。アプリを閉じても続きから書けます。",
      "間違えて消した記録も「🕘 削除・変更前の記録」から元に戻せます。",
      "このガイドは ☰ メニューの「使い方ガイド」からいつでも見直せます。",
    ],
  },
];

export default function OnboardingGuide({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  const finish = () => {
    try {
      localStorage.setItem(ONBOARD_KEY, "1");
    } catch {
      /* 保存できなくても閉じる */
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1400] flex items-end justify-center bg-black/50 md:items-center">
      <div className="flex max-h-[90vh] w-full flex-col rounded-t-3xl bg-white md:max-w-md md:rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-4">
          <span className="text-xs text-gray-500">
            使い方ガイド {i + 1} / {STEPS.length}
          </span>
          <button onClick={finish} className="text-sm text-gray-500">
            スキップ
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2 pt-4">
          <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-brand-softer text-4xl">{step.icon}</div>
          <h2 className="mb-3 text-xl font-medium text-gray-900">{step.title}</h2>
          <ul className="space-y-2.5">
            {step.points.map((p) => (
              <li key={p} className="flex gap-2.5 text-[15px] leading-relaxed text-gray-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 進み具合のドット */}
        <div className="flex justify-center gap-1.5 py-3">
          {STEPS.map((_, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              aria-label={`${k + 1}ページ目`}
              className={`h-2 rounded-full transition-all ${k === i ? "w-6 bg-brand" : "w-2 bg-gray-300"}`}
            />
          ))}
        </div>

        <div className="flex gap-2 border-t border-gray-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {i > 0 && (
            <button onClick={() => setI(i - 1)} className="rounded-full border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700">
              戻る
            </button>
          )}
          <button
            onClick={() => (last ? finish() : setI(i + 1))}
            className="flex-1 rounded-full bg-brand py-3 text-sm font-medium text-white"
          >
            {last ? "はじめる" : "次へ"}
          </button>
        </div>
      </div>
    </div>
  );
}
