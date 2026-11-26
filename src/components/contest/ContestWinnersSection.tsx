'use client';

import { useState, useEffect } from 'react';
import { VerifiedWinner } from '@/lib/contestShutdown';

interface ContestWinnersSectionProps {
  initialWinners?: VerifiedWinner[];
  initialVerificationStatus?: 'PENDING_VERIFICATION' | 'OFFICIALLY_CONFIRMED';
}

export default function ContestWinnersSection({
  initialWinners,
  initialVerificationStatus = 'PENDING_VERIFICATION'
}: ContestWinnersSectionProps) {
  const [winners, setWinners] = useState<VerifiedWinner[]>(initialWinners || []);
  const [verificationStatus, setVerificationStatus] = useState<'PENDING_VERIFICATION' | 'OFFICIALLY_CONFIRMED'>(
    initialVerificationStatus
  );

  useEffect(() => {
    fetch('/api/contest/winners')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.winners && data.winners.length > 0) {
            setWinners(data.winners);
          }
          if (data.verificationStatus) {
            setVerificationStatus(data.verificationStatus);
          }
        }
      })
      .catch((err) => console.error('Error fetching winners data:', err));
  }, []);

  const defaultPlaceholders: VerifiedWinner[] = [
    {
      rank: 1,
      name: 'To Be Announced',
      prize: 'AWS Certified AI Practitioner exam voucher',
      status: 'PENDING'
    },
    {
      rank: 2,
      name: 'To Be Announced',
      prize: 'AWS Certified AI Practitioner exam voucher',
      status: 'PENDING'
    },
    {
      rank: 3,
      name: 'To Be Announced',
      prize: 'AWS Certified AI Practitioner exam voucher',
      status: 'PENDING'
    },
    {
      rank: 4,
      name: 'To Be Announced',
      prize: 'AWS Certified AI Practitioner exam voucher',
      status: 'PENDING'
    },
    {
      rank: 5,
      name: 'To Be Announced',
      prize: 'AWS Certified AI Practitioner exam voucher',
      status: 'PENDING'
    }
  ];

  const displayWinners = winners.length === 5 ? winners : defaultPlaceholders;
  const isPending = verificationStatus === 'PENDING_VERIFICATION';

  const getRankTheme = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          icon: '🏆',
          label: 'Rank 1',
          tier: '1st Place Champion',
          borderColor: 'border-[#F5C451]',
          bgGradient: 'from-[#2A1D17] via-[#1D1410] to-[#140E0B]',
          badgeBg: 'bg-[#F5C451] text-[#0B0908]',
          glow: 'shadow-[0_0_35px_rgba(245,196,81,0.22)]',
          podiumRing: 'border-[#F5C451]/60',
          accentText: 'text-[#F5C451]'
        };
      case 2:
        return {
          icon: '🥈',
          label: 'Rank 2',
          tier: '2nd Place',
          borderColor: 'border-slate-300/60',
          bgGradient: 'from-[#211B17] via-[#1A1512] to-[#140E0B]',
          badgeBg: 'bg-slate-200 text-[#0B0908]',
          glow: 'shadow-[0_0_25px_rgba(203,213,225,0.15)]',
          podiumRing: 'border-slate-300/40',
          accentText: 'text-slate-200'
        };
      case 3:
        return {
          icon: '🥉',
          label: 'Rank 3',
          tier: '3rd Place',
          borderColor: 'border-amber-600/60',
          bgGradient: 'from-[#261912] via-[#1C130E] to-[#140E0B]',
          badgeBg: 'bg-amber-600 text-white',
          glow: 'shadow-[0_0_25px_rgba(217,119,6,0.15)]',
          podiumRing: 'border-amber-600/40',
          accentText: 'text-amber-500'
        };
      case 4:
        return {
          icon: '🎖️',
          label: 'Rank 4',
          tier: 'Top 5 Finalist',
          borderColor: 'border-[#3A271E] hover:border-[#F5C451]/40',
          bgGradient: 'from-[#1D1410] via-[#17100D] to-[#140E0B]',
          badgeBg: 'bg-[#2A1D17] text-[#F5C451] border border-[#F5C451]/30',
          glow: 'shadow-lg',
          podiumRing: 'border-[#3A271E]',
          accentText: 'text-[#F5C451]'
        };
      case 5:
      default:
        return {
          icon: '🎖️',
          label: 'Rank 5',
          tier: 'Top 5 Finalist',
          borderColor: 'border-[#3A271E] hover:border-[#F5C451]/40',
          bgGradient: 'from-[#1D1410] via-[#17100D] to-[#140E0B]',
          badgeBg: 'bg-[#2A1D17] text-[#F5C451] border border-[#F5C451]/30',
          glow: 'shadow-lg',
          podiumRing: 'border-[#3A271E]',
          accentText: 'text-[#F5C451]'
        };
    }
  };

  return (
    <section id="winners" className="relative py-24 bg-[#0B0908] border-b border-[#211713] overflow-hidden">
      {/* Subtle volumetric radial ambient lighting */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[700px] bg-[radial-gradient(ellipse_at_center,rgba(245,196,81,0.07)_0%,rgba(233,139,50,0.03)_50%,transparent_75%)] rounded-full blur-[120px]"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* SECTION HEADER & INTRO */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          
          {/* Status Label */}
          <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-[#211713] border border-[#F5C451]/30 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#F5C451] animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#F5C451]">
              {isPending ? 'Winner Announcement — Coming Soon' : 'Official Winners Confirmed'}
            </span>
          </div>

          {/* Section Heading */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#F8F2EA] tracking-tight font-display flex items-center justify-center gap-3">
            <span>🏆</span>
            <span>Top 5 Winners Announcement</span>
          </h2>

          {/* Main Message */}
          <p className="text-base sm:text-lg text-[#F8F2EA] leading-relaxed font-medium pt-1">
            Thank you to everyone who participated in AWS Card Clash! Our team is currently reviewing and verifying the final leaderboard. The Top 5 winners will be announced here soon.
          </p>

          {/* Supporting Message */}
          <p className="text-sm sm:text-base text-[#B9AAA0] leading-relaxed max-w-2xl mx-auto">
            Selected winners will also receive an official confirmation email on their registered email address with further details about their AWS Certified AI Practitioner exam voucher.
          </p>

        </div>

        {/* PODIUM VISUAL BANNER / SUBTLE TROPHY EMBLEM */}
        <div className="mb-14 max-w-4xl mx-auto p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-[#211713]/90 via-[#2A1D17]/95 to-[#211713]/90 border border-[#F5C451]/40 shadow-[0_10px_35px_rgba(0,0,0,0.7)] relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#F5C451] via-[#E98B32] to-[#F5C451]" />
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F5C451]/20 to-[#E98B32]/10 border border-[#F5C451]/50 flex items-center justify-center text-3xl flex-shrink-0 shadow-[0_0_25px_rgba(245,196,81,0.25)]">
              🏆
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h3 className="text-base sm:text-lg font-bold text-[#F8F2EA]">
                  Leaderboard Review & Anti-Fraud Audit Active
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F5C451]/15 border border-[#F5C451]/40 text-[#F5C451] text-[10px] font-bold uppercase tracking-wider">
                  Admin Verification
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#B9AAA0] leading-relaxed">
                To uphold academic integrity and ensure fair competition, final match logs, challenge completions, and player telemetry are undergoing thorough administrative verification before official announcement.
              </p>

              <div className="pt-1 flex items-center justify-center sm:justify-start space-x-2 text-xs font-semibold text-[#F5C451]">
                <span>✓</span>
                <span>Each confirmed winner receives one AWS Certified AI Practitioner exam voucher</span>
              </div>
            </div>
          </div>
        </div>

        {/* FIVE ELEGANT WINNER PLACEHOLDER CARDS */}
        {/* Top 3 Podium Tier (Ranks 1, 2, 3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-6xl mx-auto items-stretch">
          {displayWinners.slice(0, 3).map((w) => {
            const theme = getRankTheme(w.rank);
            const isRank1 = w.rank === 1;

            return (
              <div
                key={w.rank}
                className={`relative rounded-3xl bg-gradient-to-b ${theme.bgGradient} border-2 ${theme.borderColor} ${theme.glow} p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                  isRank1 ? 'md:-translate-y-2 md:hover:-translate-y-3' : ''
                }`}
              >
                {/* Crown Accent on Rank 1 */}
                {isRank1 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#F5C451] text-[#0B0908] text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_#F5C451]">
                    Champion
                  </div>
                )}

                {/* Top Badge & Number */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl sm:text-2xl">{theme.icon}</span>
                    <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${theme.badgeBg}`}>
                      {theme.label}
                    </span>
                  </div>
                  <span className="text-2xl font-black font-display text-[#F8F2EA]/25">
                    #{w.rank}
                  </span>
                </div>

                {/* Participant State / Name */}
                <div className="my-auto py-4 text-center sm:text-left space-y-2">
                  <span className="text-[11px] uppercase tracking-wider text-[#B9AAA0] font-semibold block">
                    {isPending ? 'Official Winner Slot' : 'Verified Winner'}
                  </span>

                  <h4 className="text-xl sm:text-2xl font-extrabold text-[#F8F2EA] tracking-tight">
                    {isPending ? (
                      <span className="inline-flex items-center space-x-2 text-[#F8F2EA]/90 italic font-medium">
                        <span>To Be Announced</span>
                      </span>
                    ) : (
                      w.name
                    )}
                  </h4>

                  <p className="text-xs text-[#B9AAA0]">
                    {isPending ? 'Under administrative review' : (w.department || 'Chandigarh University – Uttar Pradesh')}
                  </p>
                </div>

                {/* Prize Container */}
                <div className="mt-4 pt-4 border-t border-[#3A271E]/70 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-[#F5C451]">
                    <span>🎓</span>
                    <span>Award:</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-[#F8F2EA] leading-snug">
                    {w.prize || 'AWS Certified AI Practitioner exam voucher'}
                  </p>
                </div>

                {/* Status Indicator */}
                <div className="mt-4 pt-3 border-t border-[#3A271E]/50 flex items-center justify-between text-xs text-[#B9AAA0]">
                  <span className="text-[11px]">Status:</span>
                  <span className={`font-semibold text-[11px] flex items-center space-x-1.5 ${
                    isPending ? 'text-[#F5C451]' : 'text-emerald-400'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    <span>{isPending ? 'Pending Verification' : 'Verified'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Lower Podium Tier (Ranks 4 & 5) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {displayWinners.slice(3, 5).map((w) => {
            const theme = getRankTheme(w.rank);

            return (
              <div
                key={w.rank}
                className={`rounded-3xl bg-gradient-to-b ${theme.bgGradient} border ${theme.borderColor} ${theme.glow} p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{theme.icon}</span>
                    <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${theme.badgeBg}`}>
                      {theme.label}
                    </span>
                  </div>
                  <span className="text-xl font-black font-display text-[#F8F2EA]/25">
                    #{w.rank}
                  </span>
                </div>

                {/* Name */}
                <div className="py-2 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#B9AAA0] font-semibold block">
                    {isPending ? 'Official Winner Slot' : 'Verified Winner'}
                  </span>
                  <h4 className="text-lg sm:text-xl font-extrabold text-[#F8F2EA]">
                    {isPending ? (
                      <span className="italic font-medium text-[#F8F2EA]/90">To Be Announced</span>
                    ) : (
                      w.name
                    )}
                  </h4>
                  <p className="text-xs text-[#B9AAA0]">
                    {isPending ? 'Under administrative review' : (w.department || 'Chandigarh University – Uttar Pradesh')}
                  </p>
                </div>

                {/* Prize */}
                <div className="mt-3 pt-3 border-t border-[#3A271E]/60 space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-[#F5C451]">
                    <span>🎓</span>
                    <span>Award:</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-[#F8F2EA]">
                    {w.prize || 'AWS Certified AI Practitioner exam voucher'}
                  </p>
                </div>

                {/* Status Indicator */}
                <div className="mt-3 pt-2.5 border-t border-[#3A271E]/50 flex items-center justify-between text-xs text-[#B9AAA0]">
                  <span className="text-[11px]">Status:</span>
                  <span className={`font-semibold text-[11px] flex items-center space-x-1.5 ${
                    isPending ? 'text-[#F5C451]' : 'text-emerald-400'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    <span>{isPending ? 'Pending Verification' : 'Verified'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER ASSURANCE */}
        <div className="mt-12 text-center text-xs text-[#B9AAA0] max-w-xl mx-auto space-y-1.5">
          <p className="flex items-center justify-center space-x-1.5">
            <span>🔒</span>
            <span>All participant data and match records remain securely preserved in the community admin portal.</span>
          </p>
          <p className="text-[11px] text-[#B9AAA0]/75">
            Final results will be posted here immediately upon completion of administrative audit and verification.
          </p>
        </div>

      </div>
    </section>
  );
}
