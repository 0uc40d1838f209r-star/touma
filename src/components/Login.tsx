import { useState } from "react";
import { supabase } from "../lib/supabaseStore";

// チーム共通の「合言葉」だけでログインする。内部では固定の共有アカウントに接続する。
// (個別 ID は廃止。誰が使っているかはログイン後に「担当者を選択」で選ぶ運用)
export const ID_DOMAIN = "staff.eigyo-map.local";
const SHARED_ID = "touma";

export default function Login() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!supabase || busy || password.length === 0) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `${SHARED_ID}@${ID_DOMAIN}`,
        password,
      });
      if (error) {
        setMessage(
          error.message.includes("Invalid login credentials")
            ? "合言葉が違います。"
            : "ログインに失敗しました: " + error.message,
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow">
        <h1 className="text-center text-xl font-bold">営業先マップ</h1>
        <p className="mt-1 text-center text-sm text-gray-500">チームの合言葉を入力してください</p>
        <div className="mt-6 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="合言葉"
            autoFocus
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-sm"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          {message && <p className="text-xs text-red-600">{message}</p>}
          <button
            onClick={submit}
            disabled={busy || password.length === 0}
            className="w-full rounded-lg bg-brand py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy ? "処理中…" : "はじめる"}
          </button>
          <p className="text-center text-xs text-gray-400">
            合言葉は一度入れれば、次回からは自動で開きます。次の画面で自分の名前を選びます。
          </p>
        </div>
      </div>
    </div>
  );
}
