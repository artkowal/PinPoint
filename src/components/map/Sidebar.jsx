// src/components/map/Sidebar.jsx
import React, { useMemo } from "react";
import artKowalLogo from "../../assets/artkowal-logo-white.png";

export const SIDEBAR_WIDTH = 220;

function toRgba(hex, a = 1) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export default function Sidebar({
  voivList = [],
  selectedName = null,
  onSelect,
  accent = "#2FE5D2",
  logoSrc = "/logo.png",
  title = "Wybierz województwo",
}) {
  const glowA = useMemo(
    () => ({
      background: `radial-gradient(circle, ${toRgba(
        accent,
        0.75
      )} 0%, transparent 60%)`,
    }),
    [accent]
  );
  const glowB = useMemo(
    () => ({
      background: `radial-gradient(circle, ${toRgba(
        accent,
        0.55
      )} 0%, transparent 70%)`,
    }),
    [accent]
  );

  return (
    <aside
      className="relative h-full shrink-0 text-white"
      style={{ width: SIDEBAR_WIDTH }}
    >
      {/* teal glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -left-10 h-72 w-72 rounded-full blur-3xl opacity-35"
        style={glowA}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -right-10 h-64 w-64 rounded-full blur-3xl opacity-25"
        style={glowB}
      />

      {/* Korpus sidebara */}
      <div className="relative h-full rounded-none bg-slate-900/70 backdrop-blur-md ring-1 ring-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3 flex-none">
          <img
            src={logoSrc}
            alt="PinPoint logo"
            className="h-8 w-8 rounded-xl"
            draggable="false"
          />
          <div className="font-semibold text-sm text-teal-200 flex-1">
            {title}
          </div>
        </div>

        {/* Lista (scroll) */}
        <div className="p-2 overflow-auto flex-1">
          {voivList.length === 0 ? (
            <div className="text-white/60 text-sm px-2 py-1">Ładowanie…</div>
          ) : (
            <ul className="space-y-1">
              {voivList.map((entry, idx) => {
                const active = selectedName === entry.name;
                return (
                  <li key={`${entry.name}-${idx}`}>
                    <button
                      onClick={() => onSelect?.(entry)}
                      className={[
                        "w-full text-left px-3 py-2 rounded-xl text-sm transition",
                        active
                          ? "bg-white/15 text-white ring-1 ring-white/20"
                          : "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
                      ].join(" ")}
                      title={`Pokaż ${entry.name}`}
                    >
                      {entry.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none border-t border-white/10">
          <div className="px-5 py-2 flex items-center gap-2">
            <img
              src={artKowalLogo}
              alt="artKowal"
              className="h-4 w-auto opacity-90"
              draggable="false"
            />
            <div className="leading-tight">
              <div className="text-[11px] font-medium text-white/85 tracking-wide">
                artKowal
              </div>
              <div className="text-[10px] text-white/60">© 2025</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
