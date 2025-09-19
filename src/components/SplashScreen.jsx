import { useEffect, useRef, useState } from "react";
import { FaLandmark, FaChurch, FaTree, FaMountain } from "react-icons/fa";

const icons = [FaLandmark, FaChurch, FaTree, FaMountain];

export default function SplashScreen({
  onFinish,
  duration = 2600, // ms – snappy
  iconCycleMs = 350,
  appName = "PinPoint",
  logoSrc = "/logo.png", // public/logo.png
  accent = "#2FE5D2",
  showSkip = true,
}) {
  const [currentIconIndex, setCurrentIconIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const doneRef = useRef(false);

  // helper: #RRGGBB -> rgba()
  const toRgba = (hex, a = 1) => {
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
  };

  // system motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setReduceMotion(mq.matches);
    set();
    mq.addEventListener?.("change", set);
    return () => mq.removeEventListener?.("change", set);
  }, []);

  // cycle icons
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(
      () => setCurrentIconIndex((i) => (i + 1) % icons.length),
      iconCycleMs
    );
    return () => clearInterval(id);
  }, [iconCycleMs, reduceMotion]);

  // simple progress loop
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(p);
      if (elapsed >= duration) {
        clearInterval(id);
        finish();
      }
    }, 50);
    return () => clearInterval(id);
  }, [duration]);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onFinish?.();
  };

  const CurrentIcon = icons[currentIconIndex];
  const glow = {
    boxShadow: `0 0 60px ${toRgba(accent, 0.35)}, 0 0 140px ${toRgba(
      accent,
      0.25
    )}`,
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex items-center justify-center bg-slate-950 text-white">
      {/* teal glow background */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-40"
        style={{
          background: `radial-gradient(circle, ${toRgba(
            accent,
            0.8
          )} 0%, transparent 60%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-20 h-[24rem] w-[24rem] rounded-full blur-3xl opacity-25"
        style={{
          background: `radial-gradient(circle, ${toRgba(
            accent,
            0.6
          )} 0%, transparent 70%)`,
        }}
      />

      {/* compact card */}
      <div
        className="relative z-10 flex w-[min(92vw,420px)] flex-col items-center gap-4 rounded-2xl bg-slate-900/70 p-6 backdrop-blur-md ring-1 ring-white/10 shadow-2xl"
        style={glow}
      >
        {/* logo + name */}
        <div className="flex items-center gap-3">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={`${appName} logo`}
              className="h-10 w-10 rounded-xl object-contain"
              draggable={false}
            />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400" />
          )}
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-teal-200">
            {appName}
          </h1>
        </div>

        {/* subtle motion icon */}
        <div
          className={`mt-1 text-4xl ${reduceMotion ? "" : "animate-pulse"}`}
          aria-hidden
        >
          <CurrentIcon className="drop-shadow-lg" />
        </div>

        {/* sr hint */}
        <span className="sr-only" role="status">
          Loading
        </span>

        {/* progress bar */}
        <div
          className="mt-2 w-full h-1.5 rounded-full bg-white/10 overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-teal-300 to-emerald-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {showSkip && (
          <button
            type="button"
            onClick={finish}
            className="mt-1 text-xs text-teal-200/80 hover:text-teal-100 underline underline-offset-4"
          >
            Pomiń
          </button>
        )}
      </div>
    </div>
  );
}
