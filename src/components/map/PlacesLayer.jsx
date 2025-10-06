import { useEffect, useMemo, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { wikiQuery } from "../../api/api";

/* ================== Ustawienia ================== */
const DISABLE_CLUSTER_AT_ZOOM = 15;
const DEFAULT_RADIUS_M = 10000; // promień geosearch dla pojedynczego „heksa”
const CONCURRENCY = 5; // równoległość zapytań do Wiki
const PER_CENTER_LIMIT = 100; // prosimy więcej, później tniemy

/* ================== Ikony ================== */
const iconClassFor = (c) => `ico--${c || "landmark"}`;
const pinCategoryClass = (c) => `pin--${c || "landmark"}`;
function createPoiIcon(category = "landmark") {
  return L.divIcon({
    html: `
      <div class="pin ${pinCategoryClass(category)}">
        <div class="pin-bg"></div>
        <div class="pin-cap"></div>
        <div class="pin-ico ${iconClassFor(category)}"></div>
        <div class="pin-shadow"></div>
      </div>`,
    className: "pin-anim",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
}
function clusterIcon(cluster) {
  return L.divIcon({
    html: `<div class="cluster-icon"><span>${cluster.getChildCount()}</span></div>`,
    className: "pin-anim",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/* ================== Geometria: punkt w (multi)poligonie ================== */
function pointInRing(lat, lng, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i][0],
      xi = ring[i][1];
    const yj = ring[j][0],
      xj = ring[j][1];
    const cond =
      xi > lng !== xj > lng && lat < ((yj - yi) * (lng - xi)) / (xj - xi) + yi;
    if (cond) inside = !inside;
  }
  return inside;
}
function pointInMultiPolygon(lat, lng, rings) {
  let inside = false;
  for (const ring of rings) if (pointInRing(lat, lng, ring)) inside = !inside;
  return inside;
}

/* ================== Klasyfikacja ================== */
const NEG_ADMIN_STEMS = [
  "wsie w ",
  "miejscowości w ",
  "sołectwa w ",
  "gminy w ",
  "powiat ",
  "miasta w ",
  "miejscowości powiatu",
  "miejscowości w powiecie",
];
const NEG_TITLE_PREFIX = ["gmina ", "powiat "];
const lc = (s) => (s || "").toLowerCase();
const hasAny = (text, arr) => {
  const t = lc(text);
  return arr.some((k) => t.includes(k));
};
const normCats = (cats = []) => cats.map((c) => lc(c.title || ""));

function isAdministrative(title, cats) {
  const t = lc(title);
  if (NEG_TITLE_PREFIX.some((p) => t.startsWith(p))) return true;
  const c = normCats(cats);
  return c.some((name) =>
    NEG_ADMIN_STEMS.some((stem) => name.startsWith(stem))
  );
}

const POS_CHURCH = [
  "kościół",
  "bazylika",
  "katedra",
  "cerkiew",
  "sanktuarium",
  "kaplica",
  "parafia",
];
const POS_MOUNTAIN = ["góra", "szczyt", "mount", "mt.", "peak", "mountain"];
const POS_NATURE = [
  "park narodowy",
  "park krajobrazowy",
  "rezerwat",
  "pomnik przyrody",
  "punkt widokowy",
  "viewpoint",
  "jezioro",
  "lake",
  "wodospad",
  "waterfall",
];
const POS_LANDMARK = [
  "zamek",
  "pałac",
  "dwór",
  "ruiny",
  "twierdza",
  "fort",
  "bastion",
  "bunkier",
  "skansen",
  "muzeum",
  "synagoga",
  "ratusz",
  "wieża",
  "latarnia morska",
  "most",
  "wiadukt",
  "akwedukt",
  "amfiteatr",
  "teatr",
  "opera",
  "filharmonia",
  "kopalnia",
  "sztolnia",
  "młyn",
  "spichlerz",
  "kamienica",
  "mury obronne",
  "rynek",
  "starówka",
  "zabytek",
];

function classifyFromPage(p) {
  const title = p.title || "";
  const desc = lc(p.description || "");
  const cats = p.categories || [];
  if (isAdministrative(title, cats)) return null;

  const text = `${lc(title)} ${desc}`;
  const catText = normCats(cats).join(" ");

  if (hasAny(text, POS_CHURCH) || hasAny(catText, POS_CHURCH)) return "church";
  if (hasAny(text, POS_MOUNTAIN) || hasAny(catText, POS_MOUNTAIN))
    return "mountain";
  if (hasAny(text, POS_NATURE) || hasAny(catText, POS_NATURE)) return "nature";
  if (hasAny(text, POS_LANDMARK) || hasAny(catText, POS_LANDMARK))
    return "landmark";

  return null;
}

const score = (p) =>
  (p?.pageprops?.wikibase_item ? 3 : 0) +
  (p?.description ? 2 : 0) +
  (p?.thumbnail?.source ? 1 : 0);

/* ================== Siatka heksagonalna centrów ================== */
function hexCenters(bounds, radiusM, rings, minCount = 24) {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const S = sw.lat,
    W = sw.lng,
    N = ne.lat,
    E = ne.lng;
  let step = radiusM * 0.8;
  const midLat = (S + N) / 2;

  const toLatDeg = (m) => m / 111000;
  const toLngDeg = (m) => m / (111000 * Math.cos((midLat * Math.PI) / 180));

  function build(stepMeters) {
    const dx = toLngDeg(stepMeters * 2);
    const dy = toLatDeg(Math.sqrt(3) * stepMeters);
    const out = [];
    let row = 0;
    for (let lat = S + dy / 2; lat <= N + 1e-9; lat += dy, row++) {
      const offset = row % 2 === 0 ? 0 : dx / 2;
      for (let lng = W + offset; lng <= E + 1e-9; lng += dx) {
        if (!rings.length || pointInMultiPolygon(lat, lng, rings))
          out.push([lat, lng]);
      }
    }
    return out;
  }

  let centers = build(step);
  for (let i = 0; i < 3 && centers.length < minCount; i++) {
    step *= 0.75;
    centers = build(step);
  }
  return centers;
}

/* ================== Utils i cache ================== */
const REGION_CACHE = new Map(); // regionKey -> { all: Array<PointWithScore> }

const buildParams = (obj) => {
  const p = new URLSearchParams({ origin: "*", format: "json", ...obj });
  return Object.fromEntries(p.entries()); // dla axios: params jako obiekt
};

/* ================== Komponent ================== */
export default function PlacesLayer({
  regionKey,
  bounds,
  rings,
  activeTypes,
  perCategoryLimit = 50,
  radius = DEFAULT_RADIUS_M,
  onLoadingChange = () => {},
}) {
  const [points, setPoints] = useState([]);

  const centers = useMemo(
    () => (bounds ? hexCenters(bounds, radius, rings, 24) : []),
    [bounds, radius, rings]
  );
  const active = useMemo(() => new Set(activeTypes || []), [activeTypes]);

  const applyFilterAndLimit = (arr, actSet, limitPerCat) => {
    const byCat = new Map();
    for (const p of arr || []) {
      if (!actSet.has(p.category)) continue;
      if (!byCat.has(p.category)) byCat.set(p.category, []);
      byCat.get(p.category).push(p);
    }
    const out = [];
    for (const [, list] of byCat) {
      list.sort((a, b) => (b.score || 0) - (a.score || 0));
      out.push(...list.slice(0, limitPerCat));
    }
    return out.sort((a, b) => (b.score || 0) - (a.score || 0));
  };

  // Filtrowanie z cache (bez requestów)
  useEffect(() => {
    const cached = REGION_CACHE.get(regionKey);
    if (cached?.all) {
      setPoints(applyFilterAndLimit(cached.all, active, perCategoryLimit));
    }
  }, [regionKey, active, perCategoryLimit]);

  useEffect(() => {
    if (!centers.length || !rings?.length) {
      setPoints([]);
      onLoadingChange(false);
      return;
    }

    const cached = REGION_CACHE.get(regionKey);
    if (cached?.all) {
      setPoints(applyFilterAndLimit(cached.all, active, perCategoryLimit));
      onLoadingChange(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      onLoadingChange(true);

      const seen = new Map();
      let idx = 0;

      const fetchCenter = async (centerIdx) => {
        const [lat, lng] = centers[centerIdx];
        const params = buildParams({
          action: "query",
          generator: "geosearch",
          ggscoord: `${lat}|${lng}`,
          ggsradius: String(radius),
          ggsnamespace: "0",
          ggslimit: String(PER_CENTER_LIMIT),
          prop: "coordinates|pageimages|description|pageprops|info|categories",
          clshow: "!hidden",
          cllimit: "50",
          piprop: "thumbnail",
          pithumbsize: "120",
          inprop: "url",
        });

        const res = await wikiQuery(params, controller.signal);
        const raw = Object.values(res?.data?.query?.pages || []);

        for (const p of raw) {
          const coord = (p.coordinates || [])[0];
          if (!coord) continue;
          const { lat: plat, lon: plng } = coord;
          if (plat == null || plng == null) continue;
          if (!pointInMultiPolygon(plat, plng, rings)) continue;

          const category = classifyFromPage(p);
          if (!category) continue;

          const sc = score(p);
          const prev = seen.get(p.pageid);
          if (!prev || sc > prev.score) {
            seen.set(p.pageid, {
              id: p.pageid,
              lat: plat,
              lng: plng,
              name: p.title,
              category,
              description: p.description,
              thumbnail: p.thumbnail,
              url: p.fullurl,
              score: sc,
            });
          }
        }
      };

      async function worker() {
        while (!cancelled && idx < centers.length) {
          const my = idx++;
          try {
            await fetchCenter(my);
          } catch {
            /* ignoruj pojedyncze błędy */
          }
        }
      }

      await Promise.all(Array.from({ length: CONCURRENCY }, worker));

      if (!cancelled) {
        const all = Array.from(seen.values()).sort(
          (a, b) => (b.score || 0) - (a.score || 0)
        );
        REGION_CACHE.set(regionKey, { all });
        const filtered = applyFilterAndLimit(all, active, perCategoryLimit);
        setPoints(filtered);
        onLoadingChange(false);
      }
    })().catch(() => {
      if (!cancelled) {
        setPoints([]);
        onLoadingChange(false);
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
      onLoadingChange(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionKey, centers, rings, active, perCategoryLimit, radius]);

  if (!points.length) return null;

  return (
    <MarkerClusterGroup
      key={`${regionKey}|${centers.length}|${[...active]
        .sort()
        .join(",")}|${perCategoryLimit}`}
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
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className={`popup-ico-wrap ${pinCategoryClass(p.category)}`}>
                <div className={`popup-ico ${iconClassFor(p.category)}`} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{p.name}</div>
                {p.description && (
                  <div className="text-xs opacity-80">{p.description}</div>
                )}
              </div>
            </div>
            {p.url && (
              <div className="mt-2">
                <a
                  className="text-cyan-300 hover:underline text-xs"
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Otwórz w Wikipedii
                </a>
              </div>
            )}
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
}
