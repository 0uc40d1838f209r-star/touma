import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Facility, FacilityStatus, FacilityType, NewFacility, Visit } from "./types";
import { splitStaff } from "./types";
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
import HistoryPanel from "./components/HistoryPanel";
import SideMenu from "./components/SideMenu";
import OnboardingGuide, { ONBOARD_KEY } from "./components/OnboardingGuide";
import TipCard from "./components/TipCard";
import { MILESTONES, MascotToast, MascotWidget, MilestoneCelebration, healingMessage } from "./components/Mascot";
import type { RecordedInfo } from "./components/FacilityDetail";
import { ABSENT_ENCOURAGEMENTS, ENCOURAGEMENTS } from "./types";
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
  const [mineOnly, setMineOnly] = useState(false); // 自分の訪問先だけ表示
  const [detailTab, setDetailTab] = useState<"info" | "contacts" | "visits">("info");
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
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  // 初めての人には使い方ガイドを出す(担当者選択が先に出る場合はその後)
  const onboarded = () => {
    try {
      return localStorage.getItem(ONBOARD_KEY) === "1";
    } catch {
      return true;
    }
  };
  const [showGuide, setShowGuide] = useState(() => getIdentity() !== null && !onboarded());
  const [showTip, setShowTip] = useState(() => onboarded());
  // 癒しキャラクター(記録後のねぎらい・節目のお祝い)
  const [mascotToast, setMascotToast] = useState<{ month: number; message: string } | null>(null);
  const [milestone, setMilestone] = useState<number | null>(null);
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

  // 自分(選択中の担当者)が訪問した施設ごとの最終訪問日
  const myLastVisit = useMemo(() => {
    const m = new Map<string, string>();
    const me = identity?.name;
    if (!me) return m;
    for (const v of allVisits) {
      if (!splitStaff(v.staff_name).includes(me)) continue;
      const cur = m.get(v.facility_id);
      if (!cur || v.visited_on > cur) m.set(v.facility_id, v.visited_on);
    }
    return m;
  }, [allVisits, identity]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = facilities.filter((f) => {
      if (mineOnly && !myLastVisit.has(f.id)) return false;
      if (activeTypes.size > 0 && !activeTypes.has(f.type)) return false;
      if (activeStatuses.size > 0 && !activeStatuses.has(f.status)) return false;
      if (q && !f.name.toLowerCase().includes(q) && !f.address.toLowerCase().includes(q)) return false;
      return true;
    });
    // 自分の訪問先モードは、新しく訪問した順に並べる(修正しやすいように)
    if (mineOnly) {
      list = [...list].sort((a, b) => (myLastVisit.get(b.id) ?? "").localeCompare(myLastVisit.get(a.id) ?? ""));
    }
    return list;
  }, [facilities, search, activeTypes, activeStatuses, mineOnly, myLastVisit]);

  const selected = facilities.find((f) => f.id === selectedId) ?? null;

  // 自分(担当者)の今月・今日の訪問件数(キャラクターの表示用)
  const myCounts = useMemo(() => {
    const me = identity?.name;
    const ym = new Date().toISOString().slice(0, 7);
    const td = new Date().toISOString().slice(0, 10);
    if (!me) return { month: 0, today: 0 };
    const mine = allVisits.filter((v) => splitStaff(v.staff_name).includes(me));
    return {
      month: mine.filter((v) => v.visited_on.startsWith(ym)).length,
      today: mine.filter((v) => v.visited_on === td).length,
    };
  }, [allVisits, identity]);

  // 訪問を記録したら、件数に応じてキャラクターがねぎらう(節目はお祝い)
  const handleRecorded = async (info: RecordedInfo) => {
    const vs = await store.listAllVisits();
    setAllVisits(vs);
    const me = identity?.name || info.staffNames[0];
    if (!me) return;
    const ym = new Date().toISOString().slice(0, 7);
    const td = new Date().toISOString().slice(0, 10);
    const mine = vs.filter((v) => splitStaff(v.staff_name).includes(me));
    const month = mine.filter((v) => v.visited_on.startsWith(ym)).length;
    const today = mine.filter((v) => v.visited_on === td).length;
    const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
    const absent = info.met === "不在" || info.met === "ケアマネ不在";
    const message =
      info.outcome === "new_client"
        ? pick(ENCOURAGEMENTS.new_client)
        : absent
          ? pick(ABSENT_ENCOURAGEMENTS)
          : healingMessage(month, today);
    setMascotToast({ month, message });
    // 今月の記録で節目に届いたら、1回だけお祝い
    if (info.visitedOn.startsWith(ym) && MILESTONES.includes(month)) {
      const key = `touma-milestone:${ym}:${me}`;
      let done = 0;
      try {
        done = Number(localStorage.getItem(key) ?? "0");
      } catch {
        /* 何もしない */
      }
      if (month > done) {
        try {
          localStorage.setItem(key, String(month));
        } catch {
          /* 何もしない */
        }
        setTimeout(() => setMilestone(month), 900);
      }
    }
  };

  // 自分の訪問先の表示切替(担当者が未選択なら選んでもらう)
  const toggleMine = () => {
    if (!identity?.name) {
      setShowIdentity(true);
      return;
    }
    const next = !mineOnly;
    setMineOnly(next);
    if (next) setView("list"); // 自分の訪問先は一覧で見せる
  };

  const toggleIn = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const selectFacility = (id: string, tab: "info" | "contacts" | "visits" = "info") => {
    setSelectedId(id);
    setDetailTab(tab);
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

  // 検索バー・チップの共通設定(地図の上 / リスト / PCサイドバーで使い回す)
  const filterProps = {
    search,
    onSearch: setSearch,
    activeTypes,
    onToggleType: (t: FacilityType) => setActiveTypes((s) => toggleIn(s, t)),
    activeStatuses,
    onToggleStatus: (s: FacilityStatus) => setActiveStatuses((prev) => toggleIn(prev, s)),
    mineOnly,
    myName: identity?.name ?? null,
    onToggleMine: toggleMine,
    onMenu: () => setShowMenu(true),
    onAvatar: () => setShowIdentity(true),
    routeCount: route.length,
    onRoute: () => setShowRoute(true),
  };

  const navItems = [
    { key: "map", label: "地図", path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" },
    { key: "list", label: "リスト", path: "M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" },
    { key: "stats", label: "実績", path: "M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" },
  ] as const;

  return (
    <div className="relative flex h-full flex-col bg-white">
      {view === "stats" && (
        // 実績: Google 風のアプリバー(← で地図に戻る)
        <header className="flex h-14 shrink-0 items-center gap-1 border-b border-gray-200 bg-white px-1">
          <button onClick={() => setView("map")} aria-label="地図に戻る" className="grid h-11 w-11 place-items-center rounded-full text-gray-700 hover:bg-gray-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          </button>
          <h1 className="flex-1 text-lg font-medium text-gray-900">実績・分析</h1>
          <button onClick={() => setShowMenu(true)} aria-label="メニュー" className="grid h-11 w-11 place-items-center rounded-full text-gray-700 hover:bg-gray-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" /></svg>
          </button>
        </header>
      )}
      {view === "list" && (
        <div className="md:hidden">
          <FilterBar {...filterProps} />
        </div>
      )}

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
          {/* PC: 左パネル(検索 + 一覧)。Google マップのデスクトップ版風 */}
          <aside className="hidden w-[360px] shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
            <FilterBar {...filterProps} />
            <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50">
              <FacilityList facilities={filtered} selectedId={selectedId} onSelect={(id) => selectFacility(id, mineOnly ? "visits" : "info")} lastVisit={mineOnly ? myLastVisit : lastVisitMap} />
            </div>
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
            {/* スマホ: 地図の上に浮かぶ検索バーとチップ */}
            {!picking && (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-[1001] pt-[env(safe-area-inset-top)] md:hidden">
                <div className="pointer-events-auto">
                  <FilterBar {...filterProps} floating />
                </div>
              </div>
            )}
            {/* 癒しキャラクター(左下)。タップで話しかけられる */}
            {identity && !picking && !selected && view === "map" && (
              <div className="pointer-events-none absolute bottom-6 left-3 z-[1000]">
                <MascotWidget month={myCounts.month} today={myCounts.today} />
              </div>
            )}
            {/* こんなこともできます(常に表示。✕で今回だけ閉じる) */}
            {showTip && !picking && !selected && !showGuide && !showIdentity && view === "map" && (
              <div className="pointer-events-none absolute inset-x-3 top-[124px] z-[1001] md:left-3 md:right-auto md:top-3 md:w-96">
                <TipCard
                  onClose={() => setShowTip(false)}
                  onOpenGuide={() => {
                    setShowTip(false);
                    setShowGuide(true);
                  }}
                />
              </div>
            )}
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
              <FacilityList facilities={filtered} selectedId={selectedId} onSelect={(id) => selectFacility(id, mineOnly ? "visits" : "info")} lastVisit={mineOnly ? myLastVisit : lastVisitMap} />
            </div>
          )}
        </div>
        )}

        {/* 追加ボタン(Google 風の FAB) */}
        {!picking && !formOpen && view !== "stats" && (
          <button
            onClick={openNewForm}
            className="g-elev absolute bottom-6 right-4 z-[1000] grid h-14 w-14 place-items-center rounded-2xl bg-brand text-white active:bg-brand-dark md:right-6"
            aria-label="営業先を登録"
            title="営業先を登録"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
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
              initialTab={detailTab}
              onRecorded={handleRecorded}
            />
          </div>
        )}
      </div>

      {/* モバイル: 下部ナビ(Material 3 風) */}
      <nav className="flex shrink-0 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {navItems.map((n) => {
          const active = view === n.key;
          return (
            <button
              key={n.key}
              onClick={() => setView(n.key)}
              className={`flex flex-1 flex-col items-center gap-1 pb-2 pt-2 text-xs font-medium ${active ? "text-brand-ink" : "text-gray-600"}`}
            >
              <span className={`grid h-8 w-16 place-items-center rounded-full ${active ? "bg-brand-softer" : ""}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d={n.path} /></svg>
              </span>
              {n.label}
            </button>
          );
        })}
      </nav>

      {showMenu && (
        <SideMenu
          onClose={() => setShowMenu(false)}
          title="営業先マップ"
          subtitle={`${identity ? `${identity.station} / ${identity.name}` : "担当者が未選択です"}${isSupabaseMode ? "" : "(デモ)"}`}
          groups={[
            [
              { icon: "🗺", label: "地図", onClick: () => setView("map") },
              { icon: "📋", label: "リスト", onClick: () => setView("list") },
              { icon: "📊", label: "実績・分析", onClick: () => setView("stats") },
            ],
            [
              { icon: "🎯", label: "戦略・アドバイス", onClick: openStrategy },
              { icon: "📖", label: "営業マニュアル", onClick: () => setShowManual(true) },
              { icon: "🚗", label: "訪問ルート", onClick: () => setShowRoute(true), badge: route.length },
              { icon: "🧍", label: mineOnly ? "自分の訪問先(表示中)" : "自分の訪問先", onClick: toggleMine },
            ],
            [
              { icon: "👤", label: "担当者を変更", onClick: () => setShowIdentity(true) },
              { icon: "👥", label: "拠点・スタッフ名簿", onClick: () => setShowStaff(true) },
              { icon: "🕘", label: "削除・変更された記録", onClick: () => setShowHistory(true) },
            ],
            [
              { icon: "📘", label: "使い方ガイド", onClick: () => setShowGuide(true) },
              {
                icon: "💡",
                label: "こんなこともできます(ヒント)",
                onClick: () => {
                  setView("map");
                  setShowTip(true);
                },
              },
            ],
            ...(isSupabaseMode
              ? [[{ icon: "⎋", label: "ログアウト", onClick: () => supabase?.auth.signOut(), danger: true }]]
              : []),
          ]}
        />
      )}

      {showStaff && (
        <StaffManager
          onClose={() => setShowStaff(false)}
          onOpenHistory={() => {
            setShowStaff(false);
            setShowHistory(true);
          }}
        />
      )}
      {showHistory && (
        <HistoryPanel
          facilityName={(id) => facilities.find((f) => f.id === id)?.name}
          onClose={() => setShowHistory(false)}
          onRestored={reloadVisits}
        />
      )}
      {showManual && <ManualModal onClose={() => setShowManual(false)} />}
      {showGuide && (
        <OnboardingGuide
          onClose={() => {
            setShowGuide(false);
            setShowTip(true);
          }}
        />
      )}
      {mascotToast && <MascotToast month={mascotToast.month} message={mascotToast.message} onClose={() => setMascotToast(null)} />}
      {milestone !== null && <MilestoneCelebration month={milestone} onClose={() => setMilestone(null)} />}

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
          onClose={() => {
            setShowIdentity(false);
            if (!onboarded()) setShowGuide(true);
          }}
          onDone={(id) => {
            setIdentityState(id ?? getIdentity());
            setShowIdentity(false);
            if (!onboarded()) setShowGuide(true);
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
