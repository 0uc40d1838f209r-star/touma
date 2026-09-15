import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Facility, FacilityStatus, FacilityType, NewFacility, Visit } from "./types";
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
import IdentityPicker from "./components/IdentityPicker";
import RoutePanel from "./components/RoutePanel";
import ManualModal from "./components/ManualModal";
import { getIdentity, type Identity } from "./lib/identity";

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
  const [identity, setIdentityState] = useState<Identity | null>(() => getIdentity());
  // 起動時に本人が未選択なら選択を促す (スキップ可)
  const [showIdentity, setShowIdentity] = useState(() => getIdentity() === null);

  // 訪問ルート (ピックアップした営業先の id を順番に保持。端末に保存)
  const [route, setRoute] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("touma-route") ?? "[]") as string[];
    } catch {
      return [];
    }
  });
  const [showRoute, setShowRoute] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [focusStrategyKey, setFocusStrategyKey] = useState(0);
  const openStrategy = () => {
    setView("stats");
    setFocusStrategyKey((k) => k + 1);
  };
  useEffect(() => {
    localStorage.setItem("touma-route", JSON.stringify(route));
  }, [route]);
  const toggleRoute = (id: string) =>
    setRoute((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickedPos, setPickedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; key: number } | null>(null);

  const [allVisits, setAllVisits] = useState<Visit[]>([]);

  const reload = useCallback(async () => {
    setFacilities(await store.listFacilities());
  }, []);
  const reloadVisits = useCallback(async () => {
    setAllVisits(await store.listAllVisits());
  }, []);

  useEffect(() => {
    reload();
    reloadVisits();
  }, [reload, reloadVisits]);

  // 施設ごとの最終訪問日 (一覧に表示)
  const lastVisitMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of allVisits) {
      const cur = m.get(v.facility_id);
      if (!cur || v.visited_on > cur) m.set(v.facility_id, v.visited_on);
    }
    return m;
  }, [allVisits]);

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

  const updateFacilityPatch = async (patch: Partial<NewFacility>) => {
    if (!selected) return;
    await store.updateFacility(selected.id, patch);
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
      <header className="sticky top-0 z-[1001] flex items-center justify-between gap-2 border-b border-gray-100 bg-white/90 px-4 py-2.5 backdrop-blur-md">
        <h1 className="flex min-w-0 items-center gap-2 text-[15px] font-extrabold tracking-tight text-gray-900">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-brand text-sm text-white shadow-sm">営</span>
          <span className="hidden truncate sm:inline">営業先マップ</span>
          {!isSupabaseMode && (
            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
              デモ
            </span>
          )}
        </h1>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={openStrategy}
            className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 text-sm hover:bg-gray-200"
            title="戦略・アドバイス"
          >
            🎯
          </button>
          <button
            onClick={() => setShowManual(true)}
            className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 text-sm hover:bg-gray-200"
            title="営業マニュアル"
          >
            📖
          </button>
          <button
            onClick={() => setShowIdentity(true)}
            className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-200"
            title="担当者を選択"
          >
            <span>👤</span>
            <span className="hidden max-w-[6rem] truncate sm:inline">{identity?.name ?? "担当者"}</span>
          </button>
          <button
            onClick={() => setShowRoute(true)}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
              route.length > 0 ? "bg-brand text-white shadow-sm" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
            title="訪問ルート"
          >
            <span>🚗</span>
            {route.length > 0 && <span>{route.length}</span>}
          </button>
          <button
            onClick={() => setView(view === "stats" ? "map" : "stats")}
            className={`hidden rounded-full px-3 py-1.5 text-xs font-semibold md:inline ${
              view === "stats" ? "bg-brand text-white shadow-sm" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            📊 実績
          </button>
          <button
            onClick={() => setShowStaff(true)}
            className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 text-sm text-gray-600 hover:bg-gray-200"
            title="名簿"
          >
            ⚙
          </button>
          {isSupabaseMode && (
            <button
              onClick={() => supabase?.auth.signOut()}
              className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 text-sm text-gray-600 hover:bg-gray-200"
              title="ログアウト"
            >
              ⎋
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
          <Dashboard
            facilities={facilities}
            visits={allVisits}
            onSelectFacility={selectFacility}
            focusStrategyKey={focusStrategyKey}
            onOpenManual={() => setShowManual(true)}
          />
        ) : (
        <div className="flex h-full">
          {/* PC: サイドバー一覧 */}
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-r border-gray-100 bg-gray-50 md:block">
            <FacilityList facilities={filtered} selectedId={selectedId} onSelect={selectFacility} lastVisit={lastVisitMap} />
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
              <div className="absolute inset-x-0 top-0 z-[1000] flex items-center justify-between gap-2 bg-brand px-4 py-3 text-sm font-medium text-white">
                地図をタップして位置を指定してください
                <button onClick={() => setPicking(false)} className="rounded bg-white/20 px-2.5 py-1 text-xs">
                  キャンセル
                </button>
              </div>
            )}
          </div>

          {/* モバイル: リスト表示 */}
          {view === "list" && (
            <div className="min-w-0 flex-1 overflow-y-auto bg-gray-50 md:hidden">
              <FacilityList facilities={filtered} selectedId={selectedId} onSelect={selectFacility} lastVisit={lastVisitMap} />
            </div>
          )}
        </div>
        )}

        {/* 追加ボタン */}
        {!picking && !formOpen && view !== "stats" && (
          <button
            onClick={openNewForm}
            className="absolute bottom-20 right-4 z-[1000] flex h-14 w-14 items-center justify-center rounded-full bg-brand text-3xl font-light text-white shadow-lg active:bg-brand-dark md:bottom-6 md:right-6"
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
              onUpdate={updateFacilityPatch}
              onVisitsChanged={reloadVisits}
              inRoute={route.includes(selected.id)}
              onToggleRoute={() => toggleRoute(selected.id)}
            />
          </div>
        )}
      </div>

      {/* モバイル: 地図/リスト/実績切替タブ */}
      <nav className="flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {(
          [
            ["map", "🗺", "地図"],
            ["list", "📋", "リスト"],
            ["stats", "📊", "実績"],
          ] as const
        ).map(([key, icon, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${view === key ? "text-brand" : "text-gray-400"}`}
          >
            <span className="text-xl leading-none">{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {showStaff && <StaffManager onClose={() => setShowStaff(false)} />}
      {showManual && <ManualModal onClose={() => setShowManual(false)} />}

      {showRoute && (
        <RoutePanel
          facilities={facilities}
          route={route}
          onRemove={(id) => setRoute((prev) => prev.filter((x) => x !== id))}
          onClear={() => setRoute([])}
          onClose={() => setShowRoute(false)}
          onSelect={(id) => {
            setShowRoute(false);
            selectFacility(id);
          }}
        />
      )}

      {showIdentity && (
        <IdentityPicker
          onClose={() => setShowIdentity(false)}
          onDone={(id) => {
            setIdentityState(id ?? getIdentity());
            setShowIdentity(false);
          }}
        />
      )}

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
