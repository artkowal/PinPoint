import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polygon,
  Pane,
  useMap,
  ZoomControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  FaLandmark,
  FaChurch,
  FaTree,
  FaMountain,
  FaBars,
} from "react-icons/fa";
import Sidebar, { SIDEBAR_WIDTH } from "./Sidebar";
import RightPanel from "./RightPanel";
import PlacesLayer from "./PlacesLayer";
import LoadingOverlay from "./LoadingOverlay";
import AboutFab from "./AboutFab";
import appLogo from "../../assets/logo.png";
import "./leaflet-custom-icons.css";

const POLAND_CENTER = [52.0, 19.0];
const POLAND_ZOOM = 6;
const MAX_BOUNDS = [
  [48.8, 13.5],
  [55.2, 24.5],
];
const ACCENT = "#2FE5D2";
const FIT_MAX_ZOOM = 11;

const TYPE_META = {
  landmark: { label: "Zabytki", Icon: FaLandmark },
  church: { label: "Kościoły", Icon: FaChurch },
  nature: { label: "Natura", Icon: FaTree },
  mountain: { label: "Góry", Icon: FaMountain },
};

// ===== helpers ===============================================================
function boundsFromGeometry(geometry) {
  const g = geometry?.type ? geometry : geometry?.geometry || geometry;
  if (!g) return null;
  const rings = [];
  if (g.type === "Polygon") rings.push(...g.coordinates);
  else if (g.type === "MultiPolygon")
    g.coordinates.forEach((poly) => rings.push(...poly));
  if (!rings.length) return null;

  let minLat = 90,
    minLng = 180,
    maxLat = -90,
    maxLng = -180;
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
  }
  return L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
}
function ringsFromGeometry(g) {
  const rings = [];
  if (!g) return rings;
  if (g.type === "Polygon") {
    for (const ring of g.coordinates)
      rings.push(ring.map(([lng, lat]) => [lat, lng]));
  } else if (g.type === "MultiPolygon") {
    for (const poly of g.coordinates)
      for (const ring of poly) rings.push(ring.map(([lng, lat]) => [lat, lng]));
  }
  return rings;
}

// płynne centrowanie/zbliżenie
function FitOnSelect({ feature, maxZoom = FIT_MAX_ZOOM }) {
  const map = useMap();
  useEffect(() => {
    if (!feature) return;
    const b = boundsFromGeometry(feature.geometry || feature);
    if (!b || !b.isValid()) return;

    const center = b.getCenter();
    const padding = L.point(48, 48);
    const computed = map.getBoundsZoom(b, true, padding);
    const zoom = Math.max(5, Math.min(maxZoom, computed - 1));

    map.stop();
    map.flyTo(center, zoom, {
      animate: true,
      duration: 0.95,
      easeLinearity: 0.22,
    });
    const id = setTimeout(() => map.invalidateSize(), 320);
    return () => clearTimeout(id);
  }, [feature, map, maxZoom]);
  return null;
}
function FlyHome({ trigger }) {
  const map = useMap();
  useEffect(() => {
    if (!trigger) return;
    map.stop();
    map.flyTo(POLAND_CENTER, POLAND_ZOOM, {
      animate: true,
      duration: 0.9,
      easeLinearity: 0.22,
    });
    const id = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(id);
  }, [trigger, map]);
  return null;
}

// =============================================================================
export default function MapView() {
  const [voivodeships, setVoivodeships] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [selectedName, setSelectedName] = useState(null);
  const [activeTypes, setActiveTypes] = useState([
    "landmark",
    "church",
    "nature",
    "mountain",
  ]);

  // UI
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [resetTick, setResetTick] = useState(0);
  const [poiLoading, setPoiLoading] = useState(false); // overlay ładowania
  const geoRef = useRef();

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768)
      setSidebarOpen(false);
  }, []);

  const getName = (f) =>
    f?.properties?.name ||
    f?.properties?.NAME_1 ||
    f?.properties?.woj ||
    "Województwo";

  // dane geometrii
  useEffect(() => {
    const url = `${import.meta.env.BASE_URL || "/"}geo/voivodeships.json`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load voivodeships.json");
        return r.json();
      })
      .then((data) => setVoivodeships(data))
      .catch((err) => {
        console.error("[MapView] Cannot load geo/voivodeships.json", err);
        setVoivodeships(null);
      });
  }, []);

  const voivList = useMemo(() => {
    if (!voivodeships?.features) return [];
    return [...voivodeships.features]
      .map((f) => ({ feature: f, name: getName(f) }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, "pl", { sensitivity: "base" })
      );
  }, [voivodeships]);

  const selectVoiv = (entry) => {
    if (!entry) return;
    if (selectedName === entry.name) {
      setSelectedFeature(null);
      setSelectedName(null);
      setResetTick((t) => t + 1);
    } else {
      setSelectedFeature(entry.feature);
      setSelectedName(entry.name);
    }
  };

  // maska „na zewnątrz” województw
  const maskHoles = useMemo(() => {
    if (!voivodeships) return [];
    if (selectedFeature) return ringsFromGeometry(selectedFeature.geometry);
    const holes = [];
    for (const f of voivodeships.features || [])
      holes.push(...ringsFromGeometry(f.geometry));
    return holes;
  }, [voivodeships, selectedFeature]);

  const selectedBounds = useMemo(
    () =>
      selectedFeature
        ? boundsFromGeometry(selectedFeature.geometry || selectedFeature)
        : null,
    [selectedFeature]
  );
  const selectedRings = useMemo(
    () => (selectedFeature ? ringsFromGeometry(selectedFeature.geometry) : []),
    [selectedFeature]
  );

  return (
    <div className="h-screen w-screen flex bg-slate-950">
      {/* stały sidebar na desktopie */}
      {sidebarOpen && (
        <div
          className="hidden md:block h-full shrink-0"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <Sidebar
            voivList={voivList}
            selectedName={selectedName}
            onSelect={selectVoiv}
            accent={ACCENT}
            logoSrc={appLogo}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* off-canvas sidebar na mobile */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-[1100] w-[85vw] max-w-[320px] transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          voivList={voivList}
          selectedName={selectedName}
          onSelect={(e) => {
            selectVoiv(e);
            setSidebarOpen(false);
          }}
          accent={ACCENT}
          logoSrc={appLogo}
          onClose={() => setSidebarOpen(false)}
        />
      </div>
      <div
        onClick={() => setSidebarOpen(false)}
        className={`md:hidden fixed inset-0 z-[1050] bg-black/40 backdrop-blur-sm transition-opacity ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* MAPA */}
      <div className="relative flex-1">
        <MapContainer
          center={POLAND_CENTER}
          zoom={POLAND_ZOOM}
          minZoom={5}
          maxBounds={MAX_BOUNDS}
          maxBoundsViscosity={0.6}
          className="absolute inset-0"
          zoomControl={false}
          scrollWheelZoom
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            noWrap
          />

          <ZoomControl position="bottomleft" />

          {/* Maska */}
          {maskHoles.length > 0 && (
            <Pane name="outside-mask" style={{ zIndex: 350 }}>
              <Polygon
                positions={[
                  [
                    [85, -180],
                    [85, 180],
                    [-85, 180],
                    [-85, -180],
                  ],
                  ...maskHoles,
                ]}
                pathOptions={{
                  fill: true,
                  fillOpacity: 0.45,
                  fillColor: "#0b1220",
                  color: "#0b1220",
                  weight: 0,
                  fillRule: "evenodd",
                }}
                interactive={false}
              />
            </Pane>
          )}

          {/* Granice województw */}
          {voivodeships && (
            <Pane name="voiv" style={{ zIndex: 450 }}>
              <GeoJSON
                /* <<< ważne: remount przy zmianie wyboru, żeby odświeżyć bindTooltip */
                key={selectedName || "all"}
                ref={geoRef}
                data={voivodeships}
                style={() => ({
                  color: ACCENT,
                  weight: 2,
                  fillOpacity: 0.08,
                  fillColor: ACCENT,
                })}
                onEachFeature={(feature, layer) => {
                  const name =
                    feature?.properties?.name ||
                    feature?.properties?.NAME_1 ||
                    "Województwo";
                  const isSelected = selectedName === name;

                  // Tooltip tylko dla niewybranego województwa
                  if (!isSelected) {
                    layer.bindTooltip(name, {
                      sticky: true,
                      direction: "center",
                      opacity: 0.85,
                      className:
                        "!bg-slate-900/80 !text-white !rounded-xl !px-2 !py-1 !border !border-white/10",
                    });
                  } else {
                    // na wszelki wypadek domknij, gdyby był wcześniej zbindowany
                    if (typeof layer.closeTooltip === "function") {
                      layer.closeTooltip();
                    }
                  }

                  layer.on({
                    click: () => {
                      if (isSelected) {
                        setSelectedFeature(null);
                        setSelectedName(null);
                        setResetTick((t) => t + 1);
                      } else {
                        setSelectedFeature(feature);
                        setSelectedName(name);
                      }
                    },
                    mouseover: (e) => {
                      e.target.setStyle({ weight: 3, fillOpacity: 0.15 });
                      if (
                        isSelected &&
                        typeof e?.target?.closeTooltip === "function"
                      ) {
                        e.target.closeTooltip();
                      }
                    },
                    mouseout: (e) => {
                      try {
                        geoRef.current?.resetStyle(e.target);
                      } catch {
                        e.target.setStyle({ weight: 2, fillOpacity: 0.08 });
                      }
                    },
                  });
                }}
              />
            </Pane>
          )}

          {selectedFeature && (
            <FitOnSelect feature={selectedFeature} maxZoom={FIT_MAX_ZOOM} />
          )}
          <FlyHome trigger={resetTick} />

          {/* POI – Wikipedia + cache */}
          {selectedFeature && selectedName && selectedBounds && (
            <PlacesLayer
              regionKey={selectedName}
              bounds={selectedBounds}
              rings={selectedRings}
              activeTypes={activeTypes}
              perCategoryLimit={50}
              onLoadingChange={setPoiLoading}
            />
          )}
        </MapContainer>

        <LoadingOverlay
          show={!!selectedFeature && poiLoading}
          text="Ładowanie miejsc…"
          accent={ACCENT}
          zIndex={1500}
        />

        {/* hamburger */}
        <button
          aria-label="Pokaż/ukryj listę województw"
          onClick={() => setSidebarOpen((s) => !s)}
          className="absolute left-3 top-3 z-[1500] rounded-xl bg-slate-900/85 ring-1 ring-white/10 backdrop-blur px-3 py-2 text-white hover:bg-slate-900/95 shadow-lg"
          title={
            sidebarOpen ? "Ukryj listę województw" : "Pokaż listę województw"
          }
        >
          <FaBars />
        </button>

        {/* Panel filtrów */}
        {selectedFeature && (
          <RightPanel
            selectedName={selectedName}
            onBack={() => {
              setSelectedFeature(null);
              setSelectedName(null);
              setResetTick((t) => t + 1);
            }}
            open
            accent={ACCENT}
          >
            <div className="mt-3 text-xs text-white/70">Filtr kategorii:</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {Object.entries(TYPE_META).map(([key, meta]) => {
                const active = activeTypes.includes(key);
                const Icon = meta.Icon;
                return (
                  <button
                    key={key}
                    onClick={() =>
                      setActiveTypes((prev) =>
                        prev.includes(key)
                          ? prev.filter((x) => x !== key)
                          : [...prev, key]
                      )
                    }
                    className={`flex items-center gap-2 px-2 py-1 rounded-lg text-sm transition ${
                      active
                        ? "bg-white/10 text-white"
                        : "bg-white/5 text-white/60"
                    }`}
                  >
                    <Icon /> {meta.label}
                  </button>
                );
              })}
            </div>
          </RightPanel>
        )}

        <div className="relative flex-1">
          <AboutFab accent="#2FE5D2" />
        </div>
      </div>
    </div>
  );
}
