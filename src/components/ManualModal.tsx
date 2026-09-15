// 訪問看護の営業トーク・新規獲得マニュアル(現場で使える要点集)
const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: "🎒 訪問前の準備",
    items: [
      "パンフレット・名刺・空き状況メモ(今すぐ受けられる人数)を用意。",
      "その施設の種別(居宅/病院/クリニック/小多機)と、前回の記録・反応を確認。",
      "『自ステーションの強み』を一言で言えるように(例:24時間対応・医療処置に強い・ターミナル可 など)。",
    ],
  },
  {
    title: "👋 最初のあいさつ(受付・事務)",
    items: [
      "「お世話になっております。◯◯訪問看護ステーションの△△と申します。ケアマネジャーの□□様はいらっしゃいますか?」",
      "不在なら:「またお伺いします。よろしければ資料だけお渡しできますか?」と名刺+パンフを残す。",
      "笑顔・短時間・迷惑をかけない姿勢が信頼の第一歩。",
    ],
  },
  {
    title: "🗣️ ケアマネ・相談員との会話",
    items: [
      "つかみ:「この地域で在宅を支えたく、ごあいさつに伺いました。」",
      "強みを1つだけ具体的に:「うちは医療処置(点滴・褥瘡・在宅酸素 等)に強く、急な依頼にも動けます。」",
      "相手の困りごとを質問:「退院調整で医療必要度の高い方の受け先に困ることはありませんか?」",
      "『今すぐ何人受けられるか』を必ず伝える(空きがある=依頼しやすい)。",
    ],
  },
  {
    title: "❓ ヒアリングの質問例",
    items: [
      "「最近、退院支援で困ったケースはありますか?」",
      "「夜間・緊急対応が必要な方はいらっしゃいますか?」",
      "「今、連携している訪問看護で『ここが困る』という点はありますか?」",
      "→ 相手の課題に、自ステーションの強みを合わせて提案する。",
    ],
  },
  {
    title: "🚪 不在・断られたときの対策",
    items: [
      "不在が続く先は、時間帯を変える(ケアマネは早朝・夕方前が在席しやすい)。",
      "事前に電話で「ごあいさつに伺いたい」とアポを取ると空振りが激減。",
      "断られても、名刺+パンフを置き『空きが出たら連絡します』で次につなげる。",
      "3回接触の法則:顔を覚えてもらうまで間を空けて再訪。",
    ],
  },
  {
    title: "🎯 新規獲得の進め方(戦略)",
    items: [
      "ターゲットの優先順位:①退院調整の多い病院の地域連携室 ②ケアマネの多い居宅 ③医療必要度の高い利用者を持つ先。",
      "エリアを絞る:自ステーションから近い順に回ると、緊急対応の強みが活き、効率も良い。",
      "『相談あり』の施設は宝。1週間以内にフォロー(再訪・電話)で新規化率が上がる。",
      "紹介をくれた施設には必ずお礼。継続的な関係が次の紹介を生む(アプリの紹介実績で管理)。",
      "獲得できた施設と『似た属性の近隣施設』を重点的に回る。",
    ],
  },
  {
    title: "📌 置いていくもの・フォロー",
    items: [
      "パンフレット+名刺+空き状況。可能なら担当者の名前を控える(次回の会話に活用)。",
      "訪問後はアプリに記録(面談相手・反応・メモ)。次に来る人が状況を引き継げる。",
      "好感触・相談ありは、期限を決めて再訪予定を入れる。",
    ],
  },
];

export default function ManualModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/40 md:items-center">
      <div className="flex max-h-[90vh] w-full flex-col rounded-t-3xl bg-white md:max-w-lg md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-lg font-bold">📖 営業マニュアル</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 text-gray-500" aria-label="閉じる">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <p className="rounded-xl bg-brand-softer p-3 text-xs text-brand-ink">
            訪問看護の営業で使える要点集です。困ったときの会話例・不在対策・新規獲得の進め方をまとめています。
          </p>
          {SECTIONS.map((s) => (
            <div key={s.title} className="rounded-2xl border border-gray-100 p-3.5 shadow-sm">
              <h3 className="mb-2 text-sm font-bold">{s.title}</h3>
              <ul className="space-y-1.5">
                {s.items.map((it, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="pb-2 text-center text-[11px] text-gray-400">
            現場に合わせて、このマニュアルの追加・修正もできます。要望があれば教えてください。
          </p>
        </div>
      </div>
    </div>
  );
}
