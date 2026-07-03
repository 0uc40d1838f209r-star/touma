# 営業先マップ (touma)

訪問看護ステーションの営業先(居宅介護支援事業所・病院・クリニック)を地図上で管理するアプリです。
チームの全員が同じデータを見て編集できます。スマホ・PC 両対応。

## 主な機能

- 🗺 地図に営業先をピン表示(色 = 種別、右上の点 = 営業ステータス)
- 📍 住所を入力するだけで自動でピンを配置(国土地理院の無料 API)。地図タップでの位置指定も可能
- 🏷 営業ステータス管理(未訪問 / 訪問済み / 定期訪問中 / 紹介あり)
- 👤 先方の担当者(ケアマネ・連携室など)の記録
- 📝 訪問履歴の記録(日付・訪問者・面談メモ)
- 🔍 種別・ステータスの絞り込みと名前・住所での検索
- 📱 スマホは地図/リストのタブ切替+ボトムシート、PC はサイドバー一覧

## 動かし方

```bash
npm install
npm run dev
```

そのまま起動すると **デモモード**(データはその端末のブラウザにのみ保存)で動きます。
チームでデータを共有するには、下記の Supabase セットアップを行ってください。

## チーム共有のセットアップ(Supabase・無料)

1. [supabase.com](https://supabase.com) でアカウントを作成し、「New project」でプロジェクトを作る(無料プランで OK)
2. ダッシュボードの **SQL Editor** を開き、[supabase/schema.sql](supabase/schema.sql) の内容を貼り付けて **Run**
3. ダッシュボードの **Project Settings → API** から以下の 2 つをコピー:
   - Project URL
   - anon public キー
4. このプロジェクトの直下に `.env` ファイルを作成:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

5. `npm run dev` を再起動すると、ID とパスワードのログイン画面が表示されます

## スタッフアカウントの発行(管理者の作業)

ログインは **ID + パスワード** 方式です。アカウントは管理者が Supabase ダッシュボードで発行します:

1. **Authentication → Users** を開き、右上の **Add user → Create new user** をクリック
2. **Email** に `ID@staff.eigyo-map.local` の形式で入力(例: 山田さんの ID を `yamada` にするなら `yamada@staff.eigyo-map.local`)
3. **Password** にそのスタッフ用のパスワードを入力
4. **Auto Confirm User** に必ずチェックを入れて作成

スタッフには「ID(例: yamada)とパスワード」を伝えるだけで OK。アプリ側が自動的に `@staff.eigyo-map.local` を補って認証します。

> 部外者の登録を防ぐため、**Authentication → Sign In / Up** の「Allow new users to sign up」はオフにしておくことを推奨します(アプリに新規登録機能はないので、オフにしても支障ありません)。

## 公開(デプロイ)

Vercel や Netlify に接続すれば無料で公開できます。ビルド設定はデフォルトの Vite 設定
(`npm run build` / 出力 `dist`)のままで、環境変数に上記の 2 つを設定してください。

## 技術構成

- React 19 + TypeScript + Vite + Tailwind CSS
- 地図: Leaflet + OpenStreetMap(無料・API キー不要)
- 住所検索: 国土地理院 住所検索 API(無料・API キー不要)
- バックエンド: Supabase(Postgres + 認証、無料枠あり)。未設定時は localStorage のデモモード
