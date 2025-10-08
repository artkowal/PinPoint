import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaQuestion, FaTimes } from "react-icons/fa";
import artKowalLogo from "../../assets/artKowal-logo-white.png";

/* helpers */
function toRgba(hex, a = 1) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const DICT = {
  pl: {
    title: "O projekcie",
    intro:
      "Aplikacja pomaga szybko odkrywać najciekawsze miejsca w wybranym województwie. Po kliknięciu regionu zobaczysz popularne punkty (zabytki, kościoły, natura, góry), równomiernie rozmieszczone na mapie i posortowane prostą heurystyką „popularności”.",
    techTitle: "Technologie i źródła",
    tech: [
      "Leaflet + React-Leaflet — renderowanie i interakcje mapy.",
      "OpenStreetMap — kafelki warstwy bazowej (tile.openstreetmap.org).",
      "Wikipedia / MediaWiki Action API — geosearch, pageimages, categories, coordinates, info.",
      "React + Vite + Tailwind CSS; klastrowanie: react-leaflet-cluster.",
    ],
    howTitle: "Jak to działa?",
    how: [
      "Region pokrywany jest heksagonalną siatką centrów (~10 km).",
      "Równolegle pobieramy strony z Wikipedii i filtrujemy do 4 kategorii.",
      "Wyniki ważone (Wikidata/opis/miniaturka) i limitowane per kategoria.",
      "Cache w pamięci pozwala przełączać filtry bez dodatkowych zapytań.",
    ],
    linksTitle: "Dokumentacja",
    links: [
      { label: "Leaflet – dokumentacja", href: "https://leafletjs.com/" },
      {
        label: "React-Leaflet – dokumentacja",
        href: "https://react-leaflet.js.org/",
      },
      {
        label: "MediaWiki Action API – start",
        href: "https://www.mediawiki.org/wiki/API:Main_page",
      },
      {
        label: "OSM – zasady użycia kafelków",
        href: "https://operations.osmfoundation.org/policies/tiles/",
      },
    ],
    languageLabel: "Język:",
    langSwitchTitle: "Przełącz na angielski",
    close: "Zamknij",
    by: "artKowal",
    copy: "© 2025",
    flag: "🇵🇱 PL",
  },
  en: {
    title: "About the project",
    intro:
      "This app helps you discover the most interesting places in a selected voivodeship. After choosing a region you’ll see popular points (landmarks, churches, nature, mountains), evenly distributed and sorted by a simple popularity heuristic.",
    techTitle: "Tech & sources",
    tech: [
      "Leaflet + React-Leaflet — map rendering & interactions.",
      "OpenStreetMap — basemap tiles (tile.openstreetmap.org).",
      "Wikipedia / MediaWiki Action API — geosearch, pageimages, categories, coordinates, info.",
      "React + Vite + Tailwind CSS; clustering: react-leaflet-cluster.",
    ],
    howTitle: "How it works",
    how: [
      "The region is covered with a hex grid of ~10 km query centers.",
      "We fetch Wikipedia pages in parallel and filter into 4 categories.",
      "Results are scored (Wikidata/description/thumbnail) and capped per category.",
      "In-memory cache lets you switch filters without extra requests.",
    ],
    linksTitle: "Documentation",
    links: [
      { label: "Leaflet – docs", href: "https://leafletjs.com/" },
      { label: "React-Leaflet – docs", href: "https://react-leaflet.js.org/" },
      {
        label: "MediaWiki Action API – overview",
        href: "https://www.mediawiki.org/wiki/API:Main_page",
      },
      {
        label: "OSM – tile usage policy",
        href: "https://operations.osmfoundation.org/policies/tiles/",
      },
    ],
    languageLabel: "Language:",
    langSwitchTitle: "Switch to Polish",
    close: "Close",
    by: "artKowal",
    copy: "© 2025",
    flag: "🇬🇧 EN",
  },
};

export default function AboutFab({
  accent = "#2FE5D2",
  logoSrc = artKowalLogo,
  startLang = "pl",
}) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState(startLang);
  const t = DICT[lang];
  const cardRef = useRef(null);

  const glowA = useMemo(
    () => ({
      background: `radial-gradient(circle, ${toRgba(
        accent,
        0.55
      )} 0%, transparent 60%)`,
    }),
    [accent]
  );
  const glowB = useMemo(
    () => ({
      background: `radial-gradient(circle, ${toRgba(
        accent,
        0.35
      )} 0%, transparent 70%)`,
    }),
    [accent]
  );

  // ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // fokus na kartę
  useEffect(() => {
    if (open) cardRef.current?.focus?.();
  }, [open]);

  return (
    <>
      {/* FAB – toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t.title}
        aria-expanded={open}
        title={t.title}
        className="fixed right-2 bottom-6 z-[1600] h-10 w-10 rounded-full
                   bg-slate-900/85 ring-1 ring-white/15 backdrop-blur-xl
                   shadow-xl flex items-center justify-center"
        style={{
          boxShadow: `0 0 0 2px ${toRgba(
            accent,
            0.5
          )}, 0 10px 24px rgba(0,0,0,.45)`,
        }}
      >
        <span
          aria-hidden
          className="absolute -inset-2 rounded-full blur-lg opacity-35"
          style={{
            background: `radial-gradient(${toRgba(
              accent,
              0.4
            )}, transparent 60%)`,
          }}
        />
        <FaQuestion
          className="relative text-lg"
          style={{ color: toRgba(accent, 0.9) }}
        />
      </button>

      {/* MODAL */}
      {open && (
        <div
          className="fixed inset-0 z-[1550] bg-black/40 backdrop-blur-sm overflow-y-auto overscroll-contain"
          role="dialog"
          aria-modal="true"
          aria-label={t.title}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
            <div
              ref={cardRef}
              tabIndex={-1}
              className="relative w-full max-w-[720px] flex flex-col
                         rounded-2xl bg-slate-900/80 ring-1 ring-white/10
                         shadow-2xl text-white overflow-hidden"
              style={{ maxHeight: "min(90svh, 90dvh, 85vh)" }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute -top-10 -left-10 h-56 w-56 rounded-full blur-3xl opacity-30"
                style={glowA}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 rounded-full blur-3xl opacity-25"
                style={glowB}
              />

              {/* HEADER */}
              <div className="flex-none sticky top-0 z-10 px-4 py-3 border-b border-white/10 bg-slate-900">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="flex items-center gap-2 font-semibold"
                    style={{ color: toRgba(accent, 0.9) }}
                  >
                    <FaQuestion /> {t.title}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/70">
                      {t.languageLabel}
                    </span>
                    <button
                      onClick={() => setLang((p) => (p === "pl" ? "en" : "pl"))}
                      className="h-8 px-2 rounded-lg bg-white/10 hover:bg-white/15 grid place-items-center text-base"
                      title={t.langSwitchTitle}
                      aria-label="Language"
                    >
                      <span role="img" aria-hidden="true">
                        {t.flag}
                      </span>
                    </button>
                    <button
                      onClick={() => setOpen(false)}
                      aria-label={t.close}
                      className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/15 grid place-items-center"
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>
              </div>

              {/* CONTENT */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                <p className="text-sm text-white/85">{t.intro}</p>

                <section>
                  <div className="text-xs uppercase tracking-wider text-white/60 mb-2">
                    {t.techTitle}
                  </div>
                  <ul className="text-sm text-white/90 list-disc pl-5 space-y-1">
                    {t.tech.map((li, i) => (
                      <li key={i}>{li}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <div className="text-xs uppercase tracking-wider text-white/60 mb-2">
                    {t.howTitle}
                  </div>
                  <ol className="text-sm text-white/90 list-decimal pl-5 space-y-1">
                    {t.how.map((li, i) => (
                      <li key={i}>{li}</li>
                    ))}
                  </ol>
                </section>

                <section style={{ "--accent": accent }}>
                  <div className="text-xs uppercase tracking-wider text-white/60 mb-2">
                    {t.linksTitle}
                  </div>
                  <ul className="text-sm list-disc pl-5 space-y-1 marker:text-[var(--accent)]">
                    {t.links.map((link, i) => (
                      <li key={i}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--accent)] visited:text-[var(--accent)] hover:underline decoration-[var(--accent)]"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              {/* FOOTER */}
              <div className="flex-none sticky bottom-0 z-10 px-4 py-3 border-t border-white/10 bg-slate-900">
                <div className="flex items-center justify-center gap-2">
                  <img
                    src={logoSrc}
                    alt="artKowal"
                    className="h-4 w-auto opacity-90"
                    draggable="false"
                  />
                  <div className="text-[11px] font-medium text-white/85 tracking-wide">
                    {t.by}
                  </div>
                  <div className="text-[11px] text-white/60">{t.copy}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
