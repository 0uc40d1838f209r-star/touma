import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import Supercluster from "supercluster";
import type { Facility, FacilityStatus } from "../types";
import { FACILITY_TYPES } from "../types";

const STATUS_COLORS: Record<FacilityStatus, string> = {
  not_visited: "#9ca3af",
  visited: "#0ea5e9",
  regular: "#10b981",
  referral: "#f59e0b",
};

const DEFAULT_CENTER: [number, number] = [35.6812, 139.7671];

function pinIcon(facility: Facility, selected: boolean): L.DivIcon {
  const color = FACILITY_TYPES[facility.type].color;
  const dot = STATUS_COLORS[facility.status];
  const scale = selected ? 1.25 : 1;
  const w = Math.round(34 * scale);
  const h = Math.round(44 * scale);
  return L.divIcon({
    className: "facility-pin",
    html: `
      <div style="position:relative;width:${w}px;height:${h}px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">
        <svg width="${w}" height="${h}" viewBox="0 0 34 44">
          <path d="M17 43C17 43 32 24.6 32 15.5 32 7 25.3 1 17 1 8.7 1 2 7 2 15.5 2 24.6 17 43 17 43Z"
                fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="17" cy="15" r="5.5" fill="white"/>
        </svg>
        <span style="position:absolute;top:0;right:0;width:${Math.round(13 * scale)}px;height:${Math.round(13 * scale)}px;border-radius:9999px;background:${dot};border:2px solid white"></span>
      </div>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h - 1],
  });
}

function clusterIcon(count: number): L.DivIcon {
  const size = count >= 1000 ? 52 : count >= 100 ? 46 : count >= 10 ? 40 : 34;
  return L.divIcon({
    className: "facility-pin",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:rgba(37,99,235,.85);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);color:white;font-weight:bold;font-size:${count >= 1000 ? 12 : 13}px;display:flex;align-items:center;justify-content:center">${count >= 1000 ? (count / 1000).toFixed(1) + "k" : count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// 数千件のピンをズームに応じてまとめて表示する
function ClusteredMarkers({
  facilities,
  selectedId,
  onSelect,
  picking,
}: {
  facilities: Facility[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  picking: boolean;
}) {
  const map = useMap();
  const [, setTick] = useState(0);
  useMapEvents({
    moveend: () => setTick((t) => t + 1),
    zoomend: () => setTick((t) => t + 1),
  });

  const byId = useMemo(() => new Map(facilities.map((f) => [f.id, f])), [facilities]);
  const index = useMemo(() => {
    const idx = new Supercluster<{ facilityId: string }>({ radius: 70, maxZoom: 16 });
    idx.load(
      facilities.map((f) => ({
        type: "Feature" as const,
        properties: { facilityId: f.id },
        geometry: { type: "Point" as const, coordinates: [f.lng, f.lat] },
      })),
    );
    return idx;
  }, [facilities]);

  const bounds = map.getBounds().pad(0.5);
  const clusters = index.getClusters(
    [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
    Math.round(map.getZoom()),
  );

  return (
    <>
      {clusters.map((c) => {
        const [lng, lat] = c.geometry.coordinates;
        if ("cluster" in c.properties && c.properties.cluster) {
          const clusterId = c.properties.cluster_id;
          return (
            <Marker
              key={`cluster-${clusterId}`}
              position={[lat, lng]}
              icon={clusterIcon(c.properties.point_count)}
              eventHandlers={{
                click: () => {
                  const zoom = Math.min(index.getClusterExpansionZoom(clusterId), 18);
                  map.flyTo([lat, lng], zoom);
                },
              }}
            />
          );
        }
        const f = byId.get(c.properties.facilityId);
        if (!f) return null;
        return (
          <Marker
            key={f.id}
            position={[f.lat, f.lng]}
            icon={pinIcon(f, f.id === selectedId)}
            eventHandlers={{ click: () => !picking && onSelect(f.id) }}
          />
        );
      })}
    </>
  );
}

function MapEvents({ picking, onPick }: { picking: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (picking) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ target }: { target: { lat: number; lng: number; key: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15));
  }, [target, map]);
  return null;
}

const VIEW_KEY = "touma-map-view";

// 初期表示: 前回見ていた位置を復元。初回はデータ全体にフィット。移動のたびに位置を保存
function ViewMemory({ facilities }: { facilities: Facility[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      localStorage.setItem(VIEW_KEY, JSON.stringify({ lat: c.lat, lng: c.lng, zoom: map.getZoom() }));
    },
  });
  useEffect(() => {
    if (fitted.current) return;
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved) {
      fitted.current = true;
      try {
        const v = JSON.parse(saved) as { lat: number; lng: number; zoom: number };
        map.setView([v.lat, v.lng], v.zoom);
        return;
      } catch {
        /* 保存データが壊れていたらフィットにフォールバック */
      }
    }
    if (facilities.length === 0) return;
    fitted.current = true;
    const bounds = L.latLngBounds(facilities.map((f) => [f.lat, f.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
  }, [facilities, map]);
  return null;
}

function LocateButton({ onLocated }: { onLocated: (lat: number, lng: number) => void }) {
  const map = useMap();
  const [busy, setBusy] = useState(false);
  const locate = () => {
    if (!navigator.geolocation || busy) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        onLocated(pos.coords.latitude, pos.coords.longitude);
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 15);
      },
      () => {
        setBusy(false);
        alert("現在地を取得できませんでした");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  return (
    <button
      onClick={locate}
      title="現在地へ移動"
      className="absolute bottom-6 right-4 z-[1000] flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg text-xl active:bg-gray-100"
    >
      {busy ? "…" : "📍"}
    </button>
  );
}

export interface MapViewProps {
  facilities: Facility[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  picking: boolean;
  onPick: (lat: number, lng: number) => void;
  flyTarget: { lat: number; lng: number; key: number } | null;
}

export default function MapView({ facilities, selectedId, onSelect, picking, onPick, flyTarget }: MapViewProps) {
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={12} className="h-full w-full" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEvents picking={picking} onPick={onPick} />
      <FlyTo target={flyTarget} />
      <ViewMemory facilities={facilities} />
      <LocateButton onLocated={(lat, lng) => setMyPos([lat, lng])} />
      {myPos && (
        <CircleMarker
          center={myPos}
          radius={8}
          pathOptions={{ color: "white", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }}
        />
      )}
      <ClusteredMarkers facilities={facilities} selectedId={selectedId} onSelect={onSelect} picking={picking} />
    </MapContainer>
  );
}
