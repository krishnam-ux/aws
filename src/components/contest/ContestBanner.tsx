'use client';

import { useState, useEffect } from 'react';
import { CONTEST_CONFIG } from '@/lib/contestConfig';

export default function ContestBanner() {
  const [status, setStatus] = useState<'LOCKED' | 'LIVE' | 'ENDED'>('LOCKED');
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    label: 'LOCKED — LAUNCHES IN'
  });

  useEffect(() => {
    // Target dates from authoritative configuration
    const launchTime = new Date(CONTEST_CONFIG.launchDateIso).getTime();
    const endTime = new Date(CONTEST_CONFIG.endDateIso).getTime();

    const calculateTime = () => {
      const now = new Date().getTime();

      if (now < launchTime) {
        setStatus('LOCKED');
        const diff = Math.max(0, launchTime - now);
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
          label: 'LOCKED — LAUNCHES IN'
        });
      } else if (now <= endTime) {
        setStatus('LIVE');
        const diff = Math.max(0, endTime - now);
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
          label: 'LIVE NOW, ENDS IN'
        });
      } else {
        setStatus('ENDED');
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          label: 'CONTEST CONCLUDED'
        });
      }
    };

    // Initial calculation
    calculateTime();

    // Fetch server status to ensure clock synchronization
    fetch('/api/contest/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.status) {
          setStatus(data.status);
        }
      })
      .catch((err) => console.error('Error fetching contest status:', err));

    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      const topOffset = 80;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="relative w-full z-30 bg-gradient-to-r from-[#1A0E08] via-[#381F0E] to-[#1A0E08] border-y border-[#F5C451]/20 py-6 sm:py-7 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
      {/* Subtle ambient lighting */}
      <div 
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,196,81,0.12)_0%,transparent_75%)]" 
        aria-hidden="true" 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
          
          {/* Left: Trophy visual & Contest Details */}
          <div className="flex items-center space-x-4 sm:space-x-6 text-center lg:text-left">
            {/* Golden Trophy Icon */}
            <div className="flex-shrink-0 w-12 h-14 sm:w-16 sm:h-18 flex items-center justify-center">
              <img
                src="/contest/banner-trophy-blended.png"
                alt="Contest Trophy"
                className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(245,196,81,0.5)] animate-[bounce_4s_ease-in-out_infinite]"
              />
            </div>

            {/* Title & Dates */}
            <div className="flex flex-col space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-[#F5C451]">
                  THE FIRST SECURITY ISLAND CONTEST
                </span>
                {status === 'LOCKED' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E98B32]/20 border border-[#E98B32]/50 text-[#F5C451]">
                    LAUNCHES NOV 24, 9 AM IST
                  </span>
                )}
                {status === 'LIVE' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 animate-pulse">
                    LIVE NOW
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-[#F8F2EA] leading-snug">
                Win an AWS Certified AI Practitioner exam voucher
              </h2>
              <span className="text-xs sm:text-sm text-[#B9AAA0]">
                November 24 to December 4, 2026 • Online Challenge
              </span>
            </div>
          </div>

          {/* Right: Live Countdown & Join CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            
            {/* Countdown timer widget */}
            <div className="flex flex-col items-center sm:items-start space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-[0.18em] text-[#F5C451]">
                {timeLeft.label}
              </span>

              <div className="flex items-center space-x-2">
                {/* DAYS */}
                <div className="flex flex-col items-center justify-center bg-[#140E0A]/90 border border-[#4A2D19] rounded-lg px-2.5 py-1.5 min-w-[52px] shadow-inner">
                  <span className="text-base sm:text-lg font-bold font-mono text-[#F8F2EA]">
                    {String(timeLeft.days).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-[#F5C451] font-semibold">
                    DAYS
                  </span>
                </div>

                {/* HOURS */}
                <div className="flex flex-col items-center justify-center bg-[#140E0A]/90 border border-[#4A2D19] rounded-lg px-2.5 py-1.5 min-w-[52px] shadow-inner">
                  <span className="text-base sm:text-lg font-bold font-mono text-[#F8F2EA]">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-[#F5C451] font-semibold">
                    HOURS
                  </span>
                </div>

                {/* MIN */}
                <div className="flex flex-col items-center justify-center bg-[#140E0A]/90 border border-[#4A2D19] rounded-lg px-2.5 py-1.5 min-w-[52px] shadow-inner">
                  <span className="text-base sm:text-lg font-bold font-mono text-[#F8F2EA]">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-[#F5C451] font-semibold">
                    MIN
                  </span>
                </div>

                {/* SEC */}
                <div className="flex flex-col items-center justify-center bg-[#140E0A]/90 border border-[#4A2D19] rounded-lg px-2.5 py-1.5 min-w-[52px] shadow-inner">
                  <span className="text-base sm:text-lg font-bold font-mono text-[#F8F2EA]">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-[#F5C451] font-semibold">
                    SEC
                  </span>
                </div>
              </div>
            </div>

            {/* Join CTA Button */}
            <a
              href="#how-to-join"
              onClick={(e) => handleSmoothScroll(e, '#how-to-join')}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-bold text-[#0B0908] bg-[#F5C451] hover:bg-[#ffcf66] active:scale-95 transition-all duration-200 shadow-[0_0_15px_rgba(245,196,81,0.4)] hover:shadow-[0_0_25px_rgba(245,196,81,0.6)] flex-shrink-0"
            >
              {status === 'LOCKED' ? 'Register to Unlock' : 'Join the contest'}
            </a>

          </div>

        </div>
      </div>
    </section>
  );
}
