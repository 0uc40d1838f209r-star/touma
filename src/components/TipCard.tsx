import { useEffect, useState } from "react";

// 「こんなこともできます」ヒント。地図の上に常に表示(✕で今回だけ閉じる)
export const TIPS: string[] = [
  "施設の青い「経路」ボタンで、Googleマップのナビがすぐ開きます。",
  "「ルートに追加」で回る先をためると、まとめてナビできます。",
  "「🧍 自分の訪問先」で、自分が行った施設だけを新しい順に見られます。記録の修正にも便利です。",
  "2人で営業に行ったら、訪問者を2人とも選べます。実績は両方に1件ずつ入ります。",
  "居宅のピンの中の数字は、そこにいるケアマネの人数です。",
  "金色の「★数字」が付いたピンは、うちに利用者を紹介してくれた施設です。",
  "☰ →「戦略・アドバイス」で、不在が多い先への対策などが自動で出ます。",
  "書きかけの記録は自動保存されます。電話が入ってアプリを閉じても大丈夫。",
  "間違えて記録を消しても「🕘 削除・変更前の記録」から元に戻せます。",
  "実績の「店舗比較」で、店舗ごとの営業量と成功率がグラフで見られます。",
  "「施設別」分析で、訪問回数に対して新規・紹介が多い“当たりの営業先”が分かります。",
  "記録の「対応してくれた方のお名前」にケアマネ名を残すと、次の訪問で話がつながります。",
  "下の「記録」で、メンバーごとの営業コメントを店舗・メンバーで絞って見られます。",
  "上の色付きボタン(居宅・訪問診療など)をタップすると、その種類だけ地図に出せます。",
  "新しい拠点は ☰ →「拠点・スタッフ名簿」から追加できます。",
];

export default function TipCard({ onClose, onOpenGuide }: { onClose: () => void; onOpenGuide: () => void }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * TIPS.length));

  // 15秒ごとに次のヒントへ
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % TIPS.length), 15000);
    return () => clearInterval(t);
  }, []);
  const close = () => onClose();

  return (
    <div className="g-elev pointer-events-auto rounded-2xl bg-white p-3.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-bold text-brand">💡 こんなこともできます</span>
        <button onClick={() => close()} className="grid h-7 w-7 place-items-center rounded-full text-gray-500 hover:bg-gray-100" aria-label="ヒントを閉じる">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
        </button>
      </div>
      <p className="text-sm leading-relaxed text-gray-800">{TIPS[idx]}</p>
      <div className="mt-2 flex items-center gap-3 text-xs">
        <button onClick={() => setIdx((idx + 1) % TIPS.length)} className="font-medium text-brand">
          次のヒント →
        </button>
        <button onClick={onOpenGuide} className="text-gray-500 underline">
          使い方ガイド
        </button>
      </div>
    </div>
  );
}
