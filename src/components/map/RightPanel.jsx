import React, { useMemo } from "react";
import { FaArrowLeft } from "react-icons/fa";

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

export default function RightPanel({
  selectedName,
  onBack,
  children,
  open = true,
  accent = "#2FE5D2",
}) {
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

  return (
    <div
      className={[
        "z-[1000] text-white fixed",
        "right-3 top-3",
        // szerokość responsywna
        "w-[78vw] max-w-[440px]",
        // styl panelu
        "rounded-2xl bg-slate-900/80 ring-1 ring-white/10 backdrop-blur-xl shadow-xl",
        // animacja fade + slide
        "transition-all duration-300 transform",
        open
          ? "opacity-100 translate-x-0 pointer-events-auto"
          : "opacity-0 translate-x-5 pointer-events-none",
      ].join(" ")}
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

      {/* header */}
      <div className="relative p-3 flex items-center justify-between border-b border-white/10">
        <div
          className="font-semibold truncate pr-2 text-teal-200"
          title={selectedName || "Województwo"}
        >
          {selectedName}
        </div>
        <button
          onClick={onBack}
          className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 flex items-center gap-1"
          aria-label="Powrót do widoku Polski"
        >
          <FaArrowLeft /> Powrót
        </button>
      </div>

      {/* content */}
      <div className="relative p-3">{children}</div>
    </div>
  );
}
