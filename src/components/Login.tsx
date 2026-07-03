import { useState } from "react";
import { supabase } from "../lib/supabaseStore";

// ID でログインできるよう、内部では ID をメール形式に変換して Supabase に渡す
// (このアドレスにメールが送られることはない。アカウントは管理者が発行する運用)
export const ID_DOMAIN = "staff.eigyo-map.local";
const emailFor = (id: string) => `${id.trim().toLowerCase()}@${ID_DOMAIN}`;
const ID_PATTERN = /^[a-zA-Z0-9._-]+$/;

export default function Login() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const idOk = userId.includes("@") || ID_PATTERN.test(userId.trim());

  const submit = async () => {
    if (!supabase || busy || !idOk) return;
    // 入力に @ が含まれる場合はメールアドレスとしてそのまま扱う(互換用)
    const email = userId.includes("@") ? userId.trim() : emailFor(userId);
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(
          error.message.includes("Invalid login credentials")
            ? "ID かパスワードが間違っています。"
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
        <p className="mt-1 text-center text-sm text-gray-500">ID とパスワードでログイン</p>
        <div className="mt-6 space-y-3">
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="ID (例: yamada)"
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
          {userId.trim() !== "" && !idOk && (
            <p className="text-xs text-red-600">ID は半角の英数字と . _ - だけが使えます。</p>
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          {message && <p className="text-xs text-red-600">{message}</p>}
          <button
            onClick={submit}
            disabled={busy || !userId.trim() || !idOk || password.length === 0}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy ? "処理中…" : "ログイン"}
          </button>
          <p className="text-center text-xs text-gray-400">
            ID の発行やパスワードの変更は管理者にお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  );
}
