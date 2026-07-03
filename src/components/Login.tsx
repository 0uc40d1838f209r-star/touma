import { useState } from "react";
import { supabase } from "../lib/supabaseStore";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMessage("ログインに失敗しました: " + error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setMessage("登録に失敗しました: " + error.message);
        else setMessage("確認メールを送信しました。メール内のリンクを開いてからログインしてください。");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow">
        <h1 className="text-center text-xl font-bold">営業先マップ</h1>
        <p className="mt-1 text-center text-sm text-gray-500">
          {mode === "signin" ? "チームのアカウントでログイン" : "新しいアカウントを作成"}
        </p>
        <div className="mt-6 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="メールアドレス"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード (6文字以上)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          {message && <p className="text-xs text-red-600">{message}</p>}
          <button
            onClick={submit}
            disabled={busy || !email || password.length < 6}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy ? "処理中…" : mode === "signin" ? "ログイン" : "アカウント作成"}
          </button>
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setMessage("");
            }}
            className="w-full text-center text-xs text-blue-600 underline"
          >
            {mode === "signin" ? "アカウントを新規作成する" : "ログイン画面に戻る"}
          </button>
        </div>
      </div>
    </div>
  );
}
