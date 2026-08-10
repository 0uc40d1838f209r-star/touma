// ログイン後に選ぶ「自分は誰か」。共有 ID ログインのため本人特定はクライアント側で持つ。
// 選ぶと訪問記録の拠点・訪問者が自動で埋まる(記録は staff_name/station_name にそのまま残る)。

export interface Identity {
  station: string;
  name: string;
}

const KEY = "touma-identity";

export function getIdentity(): Identity | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Identity;
    return v && v.name ? v : null;
  } catch {
    return null;
  }
}

export function setIdentity(id: Identity) {
  localStorage.setItem(KEY, JSON.stringify(id));
  // 訪問フォームの前回値も更新しておき、新規記録で自動的に選ばれるようにする
  localStorage.setItem("touma-station-name", id.station);
  localStorage.setItem("touma-staff-name", id.name);
}

export function clearIdentity() {
  localStorage.removeItem(KEY);
}
