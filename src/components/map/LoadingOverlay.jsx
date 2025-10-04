import React from "react";

/** pomocniczo: #RRGGBB -> rgba(r,g,b,a) */
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

export default function LoadingOverlay({
  show = true,
  text = "Ładowanie miejsc…",
  subtext,
  fixed = false,
  accent = "#2FE5D2",
  zIndex = 1400,
}) {
  const positionCls = fixed ? "fixed" : "absolute";

  const glowA = {
    background: `radial-gradient(circle, ${toRgba(
      accent,
      0.55
    )} 0%, transparent 60%)`,
  };
  const glowB = {
    background: `radial-gradient(circle, ${toRgba(
      accent,
      0.35
    )} 0%, transparent 70%)`,
  };

  if (!show) return null;

  return (
    <div
      className={`${positionCls} inset-0 grid place-items-center bg-black/35 backdrop-blur-sm`}
      style={{ zIndex }}
      role="presentation"
    >
      <div
        role="status"
        aria-live="polite"
        className="relative isolate flex items-center gap-3 rounded-2xl px-5 py-3 text-white
                   bg-slate-900/80 ring-1 ring-white/10 backdrop-blur-xl shadow-xl"
      >
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

        {/* Spinner */}
        <svg
          className="h-5 w-5 animate-spin text-teal-300"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-90"
            fill="currentColor"
            d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
          />
        </svg>

        {/* Tekst */}
        <div className="flex flex-col">
          <div className="font-semibold tracking-wide">{text}</div>
          {subtext && (
            <div className="text-xs text-white/70 leading-snug">{subtext}</div>
          )}
        </div>
      </div>
    </div>
  );
}
