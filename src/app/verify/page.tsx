import { Metadata } from 'next';
import Link from 'next/link';
import VerifySearchClient from './VerifySearchClient';

export const metadata: Metadata = {
  title: 'Identity Verification Portal | AWS Student Builder Group CU-UP',
  description: 'Official Digital ID & Community Credential Verification Registry for AWS Student Builder Group at Chandigarh University – Uttar Pradesh.'
};

export default function VerifyLandingPage() {
  return (
    <div className="min-h-screen bg-[#081A2A] text-slate-100 font-sans selection:bg-[#FF9900] selection:text-[#081A2A]">
      {/* Glow effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#FF9900]/10 via-[#0073BB]/5 to-transparent blur-3xl opacity-70"></div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12 sm:py-20 flex flex-col items-center space-y-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex items-center space-x-3 justify-center">
            <img src="/aws-logo.svg" alt="AWS" className="h-8 w-auto brightness-0 invert" />
            <span className="text-slate-600 text-xl">|</span>
            <img src="/chandigarh-university-logo.jpg" alt="Chandigarh University" className="h-9 w-auto rounded object-contain bg-white/10 p-0.5" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
              Official Identity Verification Portal
            </h1>
            <p className="text-sm text-[#FF9900] font-semibold mt-1">
              AWS Student Builder Group • Chandigarh University – Uttar Pradesh
            </p>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
            Verify the authenticity, community status, and official credentials of any Student Builder Group member, leader, or contributor in real-time.
          </p>
        </div>

        {/* Verification Card with Search */}
        <div className="w-full bg-gradient-to-b from-slate-900 to-[#0A1F33] rounded-2xl border border-slate-700/80 shadow-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="font-display font-bold text-lg text-white">
              Lookup Digital Identity
            </h2>
            <p className="text-xs text-slate-400">
              Enter the unique Digital ID code printed on the physical or digital card.
            </p>
          </div>

          <VerifySearchClient />

          <div className="pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] text-slate-400">
            <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[#FF9900] font-mono font-bold block">FMB-CUUP-XXX</span>
              <span className="text-[10px] text-slate-400">Founding Member</span>
            </div>
            <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
              <span className="text-cyan-400 font-mono font-bold block">CT-CUUP-XXX</span>
              <span className="text-[10px] text-slate-400">Core Team</span>
            </div>
            <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
              <span className="text-purple-400 font-mono font-bold block">AS-CUUP-XXX</span>
              <span className="text-[10px] text-slate-400">Anchor & Speaker</span>
            </div>
            <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
              <span className="text-emerald-400 font-mono font-bold block">DID-CUUP-XXX</span>
              <span className="text-[10px] text-slate-400">Other Member</span>
            </div>
          </div>
        </div>

        {/* Security & Authenticity info */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-base">⚡</span>
            <h3 className="font-bold text-white">Real-Time Registry</h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Direct verification against live community records maintained by chapter leadership.
            </p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-base">🔒</span>
            <h3 className="font-bold text-white">Cryptographic QR</h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Every card embeds dynamic verification QR codes ensuring tamper-proof validity.
            </p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-base">🛡️</span>
            <h3 className="font-bold text-white">Lifecycle Tracking</h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Instant reflection of status changes including active, suspended, and revoked credentials.
            </p>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link href="/" className="text-xs text-[#FF9900] hover:underline font-semibold">
            ← Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
