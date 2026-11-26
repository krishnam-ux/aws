'use client';

import React from 'react';

export type PreviewMode = 'AUTO' | 'LOCKED' | 'LIVE' | 'ENDED';

interface DevContestPreviewBarProps {
  currentMode: PreviewMode;
  effectiveStatus: 'LOCKED' | 'LIVE' | 'ENDED';
  onSelectMode: (mode: PreviewMode) => void;
}

export default function DevContestPreviewBar({
  currentMode,
  effectiveStatus,
  onSelectMode
}: DevContestPreviewBarProps) {
  // STRICT: Dev preview bar cannot be enabled or rendered in production
  const isDev =
    process.env.NODE_ENV !== 'production' ||
    (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.endsWith('.local')));

  if (!isDev) {
    return null;
  }

  return (
    <aside
      aria-label="Local Contest Preview Mode"
      className="fixed bottom-4 right-4 z-[9999] bg-[#140E0B]/95 border-2 border-[#F5C451]/70 backdrop-blur-xl text-[#F8F2EA] px-4 py-3 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] max-w-sm sm:max-w-md animate-in slide-in-from-bottom-3 duration-200"
    >
      <div className="flex flex-col space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3A271E] pb-2">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F5C451] animate-ping" />
            <span className="text-xs font-black tracking-wider uppercase text-[#F5C451] font-mono">
              LOCAL PREVIEW SWITCHER
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono font-semibold bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-600/50">
            {effectiveStatus}
          </span>
        </div>

        {/* Description Note */}
        <p className="text-[11px] text-[#B9AAA0] leading-tight">
          Simulate how the page renders without modifying actual dates, database records, or triggering shutdown.
        </p>

        {/* Mode Toggle Buttons */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {/* ENDED (Post-4 Dec) */}
          <button
            type="button"
            onClick={() => onSelectMode('ENDED')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              effectiveStatus === 'ENDED'
                ? 'bg-[#F5C451] text-[#0B0908] shadow-[0_0_12px_#F5C451]'
                : 'bg-[#211713] text-[#F8F2EA] hover:bg-[#2A1D17] border border-[#3A271E]'
            }`}
          >
            🏆 ENDED
          </button>

          {/* LIVE (Contest Active) */}
          <button
            type="button"
            onClick={() => onSelectMode('LIVE')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              effectiveStatus === 'LIVE'
                ? 'bg-emerald-400 text-[#0B0908] shadow-[0_0_12px_#34d399]'
                : 'bg-[#211713] text-[#F8F2EA] hover:bg-[#2A1D17] border border-[#3A271E]'
            }`}
          >
            ⚡ LIVE
          </button>

          {/* LOCKED (Pre-Launch) */}
          <button
            type="button"
            onClick={() => onSelectMode('LOCKED')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              effectiveStatus === 'LOCKED'
                ? 'bg-amber-500 text-[#0B0908] shadow-[0_0_12px_#f59e0b]'
                : 'bg-[#211713] text-[#F8F2EA] hover:bg-[#2A1D17] border border-[#3A271E]'
            }`}
          >
            🔒 LOCKED
          </button>
        </div>

        {/* Server State Reset */}
        {currentMode !== 'AUTO' && (
          <button
            type="button"
            onClick={() => onSelectMode('AUTO')}
            className="w-full text-center text-[10px] text-[#B9AAA0] hover:text-[#F5C451] transition-colors pt-1 underline"
          >
            Reset to real server clock
          </button>
        )}
      </div>
    </aside>
  );
}
