import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Facility, FacilityStatus, FacilityType, NewFacility } from "./types";
import { isSupabaseMode, store } from "./lib/store";
import { supabase } from "./lib/supabaseStore";
import MapView from "./components/MapView";
import FacilityDetail from "./components/FacilityDetail";
import FacilityForm from "./components/FacilityForm";
import FilterBar from "./components/FilterBar";
import FacilityList from "./components/FacilityList";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import StaffManager from "./components/StaffManager";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseMode);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (!authReady) {
    return <div className="flex h-full items-center justify-center text-gray-400">読み込み中…</div>;
  }
  if (isSupabaseMode && !session) {
    return <Login />;
  }
  return <MainScreen />;
}

function MainScreen() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<FacilityType>>(new Set());
  const [activeStatuses, setActiveStatuses] = useState<Set<FacilityStatus>>(new Set());
  const [view, setView] = useState<"map" | "list" | "stats">("map");
  const [showStaff, setShowStaff] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickedPos, setPickedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; key: number } | null>(null);

  const reload = useCallback(async () => {
    setFacilities(await store.listFacilities());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return facilities.filter((f) => {
      if (activeTypes.size > 0 && !activeTypes.has(f.type)) return false;
      if (activeStatuses.size > 0 && !activeStatuses.has(f.status)) return false;
      if (q && !f.name.toLowerCase().includes(q) && !f.address.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [facilities, search, activeTypes, activeStatuses]);

  const selected = facilities.find((f) => f.id === selectedId) ?? null;

  const toggleIn = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const selectFacility = (id: string) => {
    setSelectedId(id);
    const f = facilities.find((x) => x.id === id);
    if (f) setFlyTarget({ lat: f.lat, lng: f.lng, key: Date.now() });
    setView("map");
  };

  const openNewForm = () => {
    setEditing(null);
    setPickedPos(null);
    setFormOpen(true);
  };

  const openEditForm = () => {
    if (!selected) return;
    setEditing(selected);
    setPickedPos(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setPicking(false);
    setPickedPos(null);
  };

  const saveFacility = async (data: NewFacility) => {
    const saved = editing
      ? await store.updateFacility(editing.id, data)
      : await store.createFacility(data);
    await reload();
    closeForm();
    setSelectedId(saved.id);
    setFlyTarget({ lat: saved.lat, lng: saved.lng, key: Date.now() });
  };

  const changeStatus = async (status: FacilityStatus) => {
    if (!selected) return;
    await store.updateFacility(selected.id, { status });
    await reload();
  };

  const deleteSelected = async () => {
    if (!selected) return;
    await store.deleteFacility(selected.id);
    setSelectedId(null);
    await reload();
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5">
        <h1 className="text-base font-bold">
          🗺 営業先マップ
          {!isSupabaseMode && (
            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
              デモモード(この端末のみ保存)
            </span>
          )}
        </h1>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-gray-400 sm:inline">{filtered.length} / {facilities.length} 件</span>
          <button
            onClick={() => setView(view === "stats" ? "map" : "stats")}
            className={`hidden text-xs md:inline ${view === "stats" ? "font-bold text-blue-600" : "text-gray-500 underline"}`}
          >
            📊 実績
          </button>
          <button onClick={() => setShowStaff(true)} className="text-xs text-gray-500 underline">
            ⚙ 名簿
          </button>
          {isSupabaseMode && (
            <button onClick={() => supabase?.auth.signOut()} className="text-xs text-gray-500 underline">
              ログアウト
            </button>
          )}
        </div>
      </header>

      <FilterBar
        search={search}
        onSearch={setSearch}
        activeTypes={activeTypes}
        onToggleType={(t) => setActiveTypes((s) => toggleIn(s, t))}
        activeStatuses={activeStatuses}
        onToggleStatus={(s) => setActiveStatuses((prev) => toggleIn(prev, s))}
      />

      <div className="relative min-h-0 flex-1">
        {view === "stats" ? (
          <Dashboard facilities={facilities} />
        ) : (
        <div className="flex h-full">
          {/* PC: サイドバー一覧 */}
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-r border-gray-200 bg-white md:block">
            <FacilityList facilities={filtered} selectedId={selectedId} onSelect={selectFacility} />
          </aside>

          {/* 地図 (モバイルではタブで切替) */}
          <div className={`relative min-w-0 flex-1 ${view === "list" ? "hidden md:block" : ""}`}>
            <MapView
              facilities={filtered}
              selectedId={selectedId}
              onSelect={selectFacility}
              picking={picking}
              onPick={(lat, lng) => {
                setPickedPos({ lat, lng });
                setPicking(false);
              }}
              flyTarget={flyTarget}
            />
            {picking && (
              <div className="absolute inset-x-0 top-0 z-[1000] flex items-center justify-between gap-2 bg-blue-600 px-4 py-3 text-sm font-medium text-white">
                地図をタップして位置を指定してください
                <button onClick={() => setPicking(false)} className="rounded bg-white/20 px-2.5 py-1 text-xs">
                  キャンセル
                </button>
              </div>
            )}
          </div>

          {/* モバイル: リスト表示 */}
          {view === "list" && (
            <div className="min-w-0 flex-1 overflow-y-auto bg-white md:hidden">
              <FacilityList facilities={filtered} selectedId={selectedId} onSelect={selectFacility} />
            </div>
          )}
        </div>
        )}

        {/* 追加ボタン */}
        {!picking && !formOpen && view !== "stats" && (
          <button
            onClick={openNewForm}
            className="absolute bottom-20 right-4 z-[1000] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-3xl font-light text-white shadow-lg active:bg-blue-700 md:bottom-6 md:right-6"
            aria-label="営業先を登録"
          >
            +
          </button>
        )}

        {/* 詳細パネル: PC は右サイド / スマホはボトムシート */}
        {selected && !formOpen && !picking && view !== "stats" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] h-[62vh] md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-96">
            <FacilityDetail
              facility={selected}
              onClose={() => setSelectedId(null)}
              onEdit={openEditForm}
              onDelete={deleteSelected}
              onStatusChange={changeStatus}
            />
          </div>
        )}
      </div>

      {/* モバイル: 地図/リスト/実績切替タブ */}
      <nav className="flex border-t border-gray-200 bg-white md:hidden">
        {(
          [
            ["map", "🗺 地図"],
            ["list", "📋 リスト"],
            ["stats", "📊 実績"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex-1 py-3 text-sm font-medium ${view === key ? "text-blue-600" : "text-gray-400"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {showStaff && <StaffManager onClose={() => setShowStaff(false)} />}

      {formOpen && (
        <FacilityForm
          initial={editing}
          hidden={picking}
          pickedPos={pickedPos}
          onStartPick={() => setPicking(true)}
          onSave={saveFacility}
          onCancel={closeForm}
        />
      )}
    </div>
  );
}
