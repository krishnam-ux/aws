'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MaintenanceScreenProps {
  headline?: string;
  message?: string;
  estimatedReturn?: string;
}

export default function MaintenanceScreen({
  headline = 'Website Temporarily Unavailable',
  message = "We're currently performing scheduled maintenance and improvements. Please check back shortly.",
  estimatedReturn
}: MaintenanceScreenProps) {
  const router = useRouter();

  // Secret shortcut for IT Team / Admins: Win + Shift + K or Ctrl + Shift + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        router.push('/admin');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#070D18] text-slate-100 flex flex-col justify-between font-sans selection:bg-[#FF9900] selection:text-slate-950 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-[#FF9900]/10 via-[#0B132B]/30 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#FF9900]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-[#0B132B]/70 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF9900] to-amber-600 flex items-center justify-center font-extrabold text-slate-950 text-base shadow-lg shadow-orange-500/20 flex-shrink-0">
              AWS
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-white font-display">
                AWS Student Builder Group
              </div>
              <div className="text-[10px] text-slate-400 font-sans tracking-tight">
                Chandigarh University – Uttar Pradesh
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full text-amber-300 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Scheduled Maintenance</span>
          </div>
        </div>
      </header>

      {/* Central Content Hero */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 my-auto">
        <div className="max-w-xl w-full bg-[#0E1726]/90 border border-slate-800/90 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-7 text-center backdrop-blur-xl relative">
          {/* Subtle Orange Glow Accent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-[#FF9900] to-transparent rounded-full" />

          {/* Animated System Icon Badge */}
          <div className="relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-b from-slate-900 to-[#0B132B] border border-slate-700/80 flex items-center justify-center shadow-xl shadow-orange-500/10">
            <div className="absolute inset-0 rounded-2xl bg-[#FF9900]/10 animate-pulse" />
            <svg
              className="w-10 h-10 text-[#FF9900] relative z-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5v1.409l4.242 4.243"
              />
            </svg>
          </div>

          {/* Text Information */}
          <div className="space-y-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/30 font-display">
              System Update in Progress
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
              {headline}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
              {message}
            </p>
          </div>

          {/* Maintenance details card */}
          <div className="p-4 sm:p-5 bg-slate-950/70 rounded-2xl border border-slate-800/90 text-xs text-slate-400 space-y-3 text-left font-sans">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">Status:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Infrastructure & System Enhancement
              </span>
            </div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">Availability:</span>
              <span className="text-white font-semibold">Please check back shortly</span>
            </div>
            {estimatedReturn && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Estimated Return:</span>
                <span className="text-[#FF9900] font-mono font-bold">{estimatedReturn}</span>
              </div>
            )}
          </div>

          {/* Friendly Note */}
          <p className="text-xs text-slate-400 italic">
            &ldquo;Thank you for your patience.&rdquo;
          </p>

          {/* Action Links */}
          <div className="pt-2 flex items-center justify-center">
            <a
              href="https://chat.whatsapp.com/HuEI5i4I8KkEya47yBKynD"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[#FF9900] to-amber-600 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Join WhatsApp Community</span>
              <span>&rarr;</span>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-[#0B132B]/70 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} AWS Student Builder Group at Chandigarh University – Uttar Pradesh.
          </div>
          <div>
            <span>All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
