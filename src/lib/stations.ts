import { useCallback, useEffect, useState } from "react";
import { KNOWN_STATIONS } from "../types";
import { store } from "./store";

// 複数の拠点リストを重複なしで結合する(順序は先に渡したものが優先)
export function mergeStations(...lists: string[][]): string[] {
  return [...new Set(lists.flat().map((s) => s.trim()).filter(Boolean))];
}

// 拠点の一覧 = 既定の店舗 + 名簿画面で追加した拠点 + 名簿メンバーの所属
export function useStations() {
  const [custom, setCustom] = useState<string[]>([]);
  const [fromRoster, setFromRoster] = useState<string[]>([]);

  const reload = useCallback(async () => {
    const [registered, staff] = await Promise.all([store.listStations(), store.listStaff()]);
    setCustom(registered);
    setFromRoster(staff.map((s) => s.station));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    stations: mergeStations(KNOWN_STATIONS, custom, fromRoster),
    custom, // 名簿画面で追加した拠点(削除できるのはこれだけ)
    reload,
  };
}
