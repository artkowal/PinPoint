import { useEffect, useMemo, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { overpass } from "../../api/api";

const DISABLE_CLUSTER_AT_ZOOM = 15;

// ——— Filtry per kategoria (sterylne i szybkie) ———
const FILTERS = {
  landmark: [
    'node["name"]["tourism"="attraction"]',
    'node["name"]["tourism"="museum"]',
    'node["name"]["historic"]',
    'node["name"]["memorial"]',
  ],
  church: ['node["name"]["amenity"="place_of_worship"]'],
  nature: [
    'node["name"]["tourism"="viewpoint"]',
    'node["name"]["natural"="spring"]',
  ],
  mountain: ['node["name"]["natural"="peak"]'],
};

// ——— heurystyka “popularności” do sortowania lokalnie ———
function scoreTags(tags = {}) {
  let s = 0;
  if (tags.wikipedia) s += 4;
  if (tags.wikidata) s += 3;
  if (tags.heritage) s += 2;
  if (tags.tourism === "attraction" || tags.tourism === "museum") s += 2;
  if (tags.historic || tags.memorial) s += 1;
  if (tags.amenity === "place_of_worship") s += 1;
  if (tags.natural === "peak" || tags.tourism === "viewpoint") s += 1;
  return s;
}

// ——— detekcja kategorii z tagów ———
function detectCategory(tags = {}) {
  if (tags.amenity === "place_of_worship") return "church";
  if (tags.natural === "peak") return "mountain";
  if (tags.tourism === "viewpoint" || tags.natural === "spring")
    return "nature";
  if (
    tags.tourism === "attraction" ||
    tags.historic ||
    tags.memorial ||
    tags.tourism === "museum"
  )
    return "landmark";
  return "landmark";
}

// ——— ikony (CSS już masz) ———
function iconClassFor(category) {
  return `ico--${category || "landmark"}`;
}
function pinCategoryClass(category) {
  return `pin--${category || "landmark"}`;
}
function createPoiIcon(category = "landmark") {
  return L.divIcon({
    html: `
      <div class="pin ${pinCategoryClass(category)}">
        <div class="pin-bg"></div>
        <div class="pin-cap"></div>
        <div class="pin-ico ${iconClassFor(category)}"></div>
        <div class="pin-shadow"></div>
      </div>
    `,
    className: "pin-anim",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
}
function clusterIcon(cluster) {
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `<div class="cluster-icon"><span>${count}</span></div>`,
    className: "pin-anim",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/* =====================  GEOMETRIA & CLIP  ================================= */

// zamiana GeoJSON geometry -> tablica POLIGONÓW, każdy: [outer, hole1, hole2, ...],
// gdzie ring = [[lat, lng], ...]
function geometryToPolygons(geom) {
  if (!geom) return [];
  const toRing = (ring) => ring.map(([lng, lat]) => [lat, lng]);
  if (geom.type === "Polygon") {
    return [geom.coordinates.map(toRing)];
  }
  if (geom.type === "MultiPolygon") {
    return geom.coordinates.map((poly) => poly.map(toRing));
  }
  return [];
}

// klasyczny ray-casting dla jednego ringu (lat,lng)
function pointInRing(lat, lng, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i][0],
      xi = ring[i][1];
    const yj = ring[j][0],
      xj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// punkt-w-polygon (z obsługą „dziur”)
function pointInPolygons(lat, lng, polygons) {
  for (const poly of polygons) {
    if (!poly.length) continue;
    const outer = poly[0];
    if (!pointInRing(lat, lng, outer)) continue;
    // jeżeli w dziurze – odrzucamy
    let inHole = false;
    for (let i = 1; i < poly.length; i++) {
      if (pointInRing(lat, lng, poly[i])) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

/* =====================  KOMPONENT  ======================================== */

/**
 * PROPS:
 *  - bounds: L.LatLngBounds (BBOX województwa)
 *  - regionGeom: GeoJSON geometry (dokładna geometria województwa)
 *  - activeTypes: ["landmark","church","nature","mountain"]
 *  - maxPoints: twardy limit łączny
 */
export default function PlacesLayer({
  bounds,
  regionGeom,
  activeTypes,
  maxPoints = 100,
}) {
  const [points, setPoints] = useState([]);

  const polygons = useMemo(() => geometryToPolygons(regionGeom), [regionGeom]);

  // siatka kafli po BBOX (małe szybkie zapytania)
  const tiles = useMemo(() => {
    if (!bounds) return [];
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const S = sw.lat,
      W = sw.lng,
      N = ne.lat,
      E = ne.lng;

    const rows = 4,
      cols = 3; // 12 kafli
    const dLat = (N - S) / rows;
    const dLng = (E - W) / cols;
    const out = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const s = S + r * dLat;
        const n = S + (r + 1) * dLat;
        const w = W + c * dLng;
        const e = W + (c + 1) * dLng;
        out.push([s, w, n, e]);
      }
    }
    return out;
  }, [bounds]);

  // union wzorców aktywnych kategorii
  const patterns = useMemo(() => {
    const uniq = new Set();
    for (const t of activeTypes || []) {
      for (const p of FILTERS[t] || []) uniq.add(p);
    }
    return Array.from(uniq);
  }, [activeTypes]);

  useEffect(() => {
    if (!tiles.length || !patterns.length || !polygons.length) {
      setPoints([]);
      return;
    }

    let canceled = false;
    const perTile = Math.max(5, Math.ceil(maxPoints / tiles.length) * 3);

    (async () => {
      const seen = new Map(); // id -> point
      for (let i = 0; i < tiles.length; i++) {
        if (canceled) break;
        if (seen.size >= maxPoints) break;

        const [s, w, n, e] = tiles[i];
        const q = `
          [out:json][timeout:20];
          (
            ${patterns.map((p) => `${p}(${s},${w},${n},${e});`).join("\n")}
          );
          out tags center qt ${perTile};
        `;
        try {
          const res = await overpass(q);
          const els = res.data?.elements || [];
          for (const el of els) {
            const lat = el.lat ?? el.center?.lat;
            const lng = el.lon ?? el.center?.lon;
            if (lat == null || lng == null) continue;
            // precyzyjny CLIP do geometrii województwa:
            if (!pointInPolygons(lat, lng, polygons)) continue;
            if (seen.has(el.id)) continue;

            const tags = el.tags || {};
            const name = tags.name || "Bez nazwy";
            const category = detectCategory(tags);
            seen.set(el.id, { id: el.id, lat, lng, name, tags, category });
          }

          const list = Array.from(seen.values())
            .sort((a, b) => scoreTags(b.tags) - scoreTags(a.tags))
            .slice(0, maxPoints);
          setPoints(list);
        } catch {
          // pomijamy pojedynczy kafel (np. 429) i lecimy dalej
        }
      }
    })();

    return () => {
      canceled = true;
    };
  }, [tiles, patterns, polygons, maxPoints]);

  if (!points.length) return null;

  return (
    <MarkerClusterGroup
      key={patterns.join("|")}
      chunkedLoading
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
      maxClusterRadius={50}
      disableClusteringAtZoom={DISABLE_CLUSTER_AT_ZOOM}
      iconCreateFunction={clusterIcon}
    >
      {points.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={createPoiIcon(p.category)}
        >
          <Popup>
            <div className="flex items-center gap-3 min-w-[180px]">
              <div className="text-sm font-semibold flex-1">{p.name}</div>
              <div className={`popup-ico-wrap ${pinCategoryClass(p.category)}`}>
                <div className={`popup-ico ${iconClassFor(p.category)}`}></div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
}
