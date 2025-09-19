import React from "react";
import { FaArrowLeft } from "react-icons/fa";

export const RIGHT_PANEL_WIDTH = 300;

export default function RightPanel({ selectedName, onBack, children }) {
  return (
    <div
      className="absolute top-3 right-3 z-[1000] rounded-2xl bg-slate-900/85 p-3 ring-1 ring-white/10 backdrop-blur text-white"
      style={{
        width: RIGHT_PANEL_WIDTH,
        maxHeight: "calc(100vh - 1.5rem)",
        overflow: "auto",
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="font-semibold truncate pr-2"
          title={selectedName || "Województwo"}
        >
          {selectedName}
        </div>
        <button
          onClick={onBack}
          className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 flex items-center gap-1"
        >
          <FaArrowLeft /> Powrót
        </button>
      </div>
      {children}
    </div>
  );
}
