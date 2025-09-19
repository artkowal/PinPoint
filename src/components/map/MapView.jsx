import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polygon,
  Pane,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FaLandmark, FaChurch, FaTree, FaMountain } from "react-icons/fa";
import Sidebar from "./Sidebar";
import RightPanel from "./RightPanel";

// --- Map defaults (Poland) ---
const POLAND_CENTER = [52.0, 19.0];
const POLAND_ZOOM = 6;
const MAX_BOUNDS = [
  [48.8, 13.5], // SW
  [55.2, 24.5], // NE
];
const ACCENT = "#2FE5D2";
const FIT_MAX_ZOOM = 11;

const TYPE_META = {
  landmark: { label: "Zabytki", Icon: FaLandmark },
  church: { label: "Kościoły", Icon: FaChurch },
  nature: { label: "Natura", Icon: FaTree },
  mountain: { label: "Góry", Icon: FaMountain },
};

// --- bounds z geometrii
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
  return L.latLngBounds([
    [minLat, minLng],
    [maxLat, maxLng],
  ]);
}

// --- dopasowanie: center + flyTo (gładka animacja, nieco mniejszy zoom)
function FitOnSelect({ feature, maxZoom = FIT_MAX_ZOOM }) {
  const map = useMap();

  useEffect(() => {
    if (!feature) return;
    const b = boundsFromGeometry(feature.geometry || feature);
    if (!b || !b.isValid()) return;

    const center = b.getCenter();
    // większy padding + -1 poziom zoom => odrobinę szerzej
    const padding = L.point(48, 48);
    const computed = map.getBoundsZoom(b, true, padding);
    const zoom = Math.max(5, Math.min(maxZoom, computed - 1));

    map.stop();
    map.flyTo(center, zoom, {
      animate: true,
      duration: 0.95,
      easeLinearity: 0.22,
      noMoveStart: false,
    });

    const id = setTimeout(() => map.invalidateSize(), 320);
    return () => clearTimeout(id);
  }, [feature, map, maxZoom]);

  return null;
}

// --- powrót do widoku PL (po kliknięciu „Powrót”)
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
  const [resetTick, setResetTick] = useState(0); // <<< trigger dla powrotu
  const geoRef = useRef();

  const getName = (feature) =>
    feature?.properties?.name ||
    feature?.properties?.NAME_1 ||
    feature?.properties?.woj ||
    "Województwo";

  const ringsFromGeometry = (g) => {
    const rings = [];
    if (!g) return rings;
    if (g.type === "Polygon")
      for (const ring of g.coordinates)
        rings.push(ring.map(([lng, lat]) => [lat, lng]));
    if (g.type === "MultiPolygon")
      for (const poly of g.coordinates)
        for (const ring of poly)
          rings.push(ring.map(([lng, lat]) => [lat, lng]));
    return rings;
  };

  const WORLD_RECT = useMemo(
    () => [
      [85, -180],
      [85, 180],
      [-85, 180],
      [-85, -180],
    ],
    []
  );

  useEffect(() => {
    fetch("/geo/voivodeships.json")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load voivodeships.json");
        return r.json();
      })
      .then((data) => setVoivodeships(data))
      .catch((err) => {
        console.error("[MapView] Cannot load /geo/voivodeships.json", err);
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
    setSelectedFeature(entry.feature);
    setSelectedName(entry.name);
  };

  const resetView = () => {
    setSelectedFeature(null);
    setSelectedName(null);
    setResetTick((t) => t + 1); // <<< uruchomi FlyHome
  };

  const toggleType = (t) =>
    setActiveTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );

  const maskHoles = useMemo(() => {
    if (!voivodeships) return [];
    if (selectedFeature) return ringsFromGeometry(selectedFeature.geometry);
    const holes = [];
    for (const f of voivodeships.features || [])
      holes.push(...ringsFromGeometry(f.geometry));
    return holes;
  }, [voivodeships, selectedFeature]);

  const onEachVoiv = (feature, layer) => {
    const name = getName(feature);
    layer.bindTooltip(name, {
      sticky: true,
      direction: "center",
      opacity: 0.85,
      className:
        "!bg-slate-900/80 !text-white !rounded-xl !px-2 !py-1 !border !border-white/10",
    });
    layer.on({
      click: () => {
        setSelectedFeature(feature);
        setSelectedName(name);
      },
      mouseover: (e) => e.target.setStyle({ weight: 3, fillOpacity: 0.15 }),
      mouseout: (e) => {
        try {
          geoRef.current?.resetStyle(e.target);
        } catch {
          e.target.setStyle({ weight: 2, fillOpacity: 0.08 });
        }
      },
    });
  };

  return (
    <div className="h-screen w-screen flex bg-slate-950">
      {/* LEWA KOLUMNA */}
      <Sidebar
        voivList={voivList}
        selectedName={selectedName}
        onSelect={selectVoiv}
        accent={ACCENT}
        logoSrc="/logo.png"
      />

      {/* PRAWA KOLUMNA: MAPA */}
      <div className="relative flex-1">
        <MapContainer
          center={POLAND_CENTER}
          zoom={POLAND_ZOOM}
          minZoom={5}
          maxBounds={MAX_BOUNDS}
          maxBoundsViscosity={0.6}
          className="absolute inset-0"
          zoomControl
          scrollWheelZoom
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            noWrap
          />

          {/* Maska */}
          {maskHoles.length > 0 && (
            <Pane name="outside-mask" style={{ zIndex: 350 }}>
              <Polygon
                positions={[WORLD_RECT, ...maskHoles]}
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
                ref={geoRef}
                data={voivodeships}
                style={() => ({
                  color: ACCENT,
                  weight: 2,
                  fillOpacity: 0.08,
                  fillColor: ACCENT,
                })}
                onEachFeature={onEachVoiv}
              />
            </Pane>
          )}

          {/* Dopasowanie po wyborze (centrowanie + gładkie flyTo) */}
          {selectedFeature && (
            <FitOnSelect feature={selectedFeature} maxZoom={FIT_MAX_ZOOM} />
          )}

          {/* Powrót do ujęcia PL po kliknięciu „Powrót” */}
          <FlyHome trigger={resetTick} />
        </MapContainer>

        {/* PRAWY PANEL */}
        {selectedFeature && (
          <RightPanel selectedName={selectedName} onBack={resetView}>
            <div className="mt-3 text-xs text-white/70">
              Filtr kategorii (przyszłe POI):
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {Object.entries(TYPE_META).map(([key, meta]) => {
                const active = activeTypes.includes(key);
                const Icon = meta.Icon;
                return (
                  <button
                    key={key}
                    onClick={() => toggleType(key)}
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
      </div>
    </div>
  );
}
