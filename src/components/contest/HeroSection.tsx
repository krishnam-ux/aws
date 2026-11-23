'use client';

import { useState, useRef } from 'react';
import ParticleCanvas from './ParticleCanvas';

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, translateZ: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // 3D Mouse Parallax & Tilt calculation
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate smooth normalized rotation (-7 to 7 degrees)
    const rotateY = ((x - centerX) / centerX) * 6;
    const rotateX = -((y - centerY) / centerY) * 6;

    setTilt({ rotateX, rotateY, translateZ: 20 });
  };

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => {
    setIsHovering(false);
    setTilt({ rotateX: 0, rotateY: 0, translateZ: 0 });
  };

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
    <section
      id="top"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-[90vh] flex items-center justify-center pt-28 pb-16 overflow-hidden bg-[#0B0908]"
    >
      {/* Seamless cinematic black-to-dark-brown gradient background */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[#0B0908] via-[#1A110D] to-[#0B0908]" 
        aria-hidden="true" 
      />
      {/* Warm volumetric radial glow positioned behind dragon body & wings */}
      <div 
        className="pointer-events-none absolute top-1/6 right-[5%] w-[850px] h-[750px] bg-[radial-gradient(ellipse_75%_65%_at_center,rgba(233,139,50,0.22)_0%,rgba(140,50,15,0.11)_45%,transparent_75%)] rounded-full blur-[90px]" 
        aria-hidden="true" 
      />

      {/* Floating Ember Particle Canvas */}
      <ParticleCanvas />

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Headline, Description & Actions */}
          <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-center space-y-6 relative z-20">
            
            {/* Tagline Badge */}
            <div className="inline-flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#F5C451] bg-[#211713] px-3 py-1 rounded-full border border-[#3A271E] shadow-sm">
                NEW IN AWS CARD CLASH
              </span>
            </div>

            {/* Main Headline with Gold Highlight */}
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold text-[#F8F2EA] tracking-tight leading-[1.1] font-display">
              Defend the cloud on the{' '}
              <span className="text-[#F5C451] drop-shadow-[0_0_25px_rgba(245,196,81,0.35)]">
                Security Island
              </span>
            </h1>

            {/* Subhead description */}
            <p className="text-base sm:text-lg text-[#B9AAA0] leading-relaxed max-w-xl font-normal">
              Fifteen new architectures, new security cards and a dragon that changes every match. 
              Learn the patterns, then take on the first Security Island contest.
            </p>

            {/* Registration Callout Box */}
            <div className="p-5 rounded-2xl bg-[#1D1410]/90 border border-[#3A271E] backdrop-blur-md shadow-xl flex flex-col space-y-4 max-w-lg">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-[#F5C451]/15 border border-[#F5C451]/40 flex items-center justify-center text-[#F5C451] font-bold text-base flex-shrink-0">
                  🛡️
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#F8F2EA]">
                    Contest Registration Open
                  </h2>
                  <p className="text-xs text-[#B9AAA0]">
                    Register below to unlock your official Event Code and verified app links.
                  </p>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <a
                  href="#how-to-join"
                  onClick={(e) => handleSmoothScroll(e, '#how-to-join')}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-bold text-[#0B0908] bg-[#F5C451] hover:bg-[#ffcf66] active:scale-95 transition-all duration-200 shadow-[0_0_18px_rgba(245,196,81,0.35)] hover:shadow-[0_0_28px_rgba(245,196,81,0.55)]"
                >
                  Join the Contest
                </a>
                <a
                  href="#island"
                  onClick={(e) => handleSmoothScroll(e, '#island')}
                  className="inline-flex items-center justify-center px-5 py-3 rounded-full text-sm font-semibold text-[#F8F2EA] bg-[#211713] hover:bg-[#2A1D17] border border-[#3A271E] hover:border-[#F5C451]/50 transition-all duration-200"
                >
                  Explore the Challenge
                </a>
              </div>
            </div>

            {/* Launch Notice Badge */}
            <div className="flex items-center space-x-2 text-xs text-[#B9AAA0]">
              <span className="w-2 h-2 rounded-full bg-[#F5C451] animate-pulse" />
              <span>Contest Launch: <strong className="text-[#F8F2EA]">24 November 2026, 9:00 AM IST</strong></span>
            </div>

          </div>

          {/* Right Column: Prominent Large 3D Dragon & Integrated Game Logo Visual */}
          <div className="lg:col-span-7 xl:col-span-7 relative flex items-center justify-center lg:justify-end pt-6 lg:pt-0 overflow-visible z-10 pointer-events-none lg:pointer-events-auto">
            
            {/* Interactive 3D Perspective Stage */}
            <div
              className="relative w-full max-w-[560px] sm:max-w-[640px] lg:max-w-none lg:w-[130%] xl:w-[140%] 2xl:w-[148%] lg:-ml-[25%] xl:-ml-[32%] 2xl:-ml-[38%] transition-transform duration-300 ease-out"
              style={{
                perspective: '1200px',
                transformStyle: 'preserve-3d',
                transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateZ(${tilt.translateZ}px)`
              }}
            >
              {/* Radial back glow */}
              <div 
                className="absolute inset-0 z-0 bg-radial from-[#E98B32]/20 via-transparent to-transparent rounded-full blur-3xl transform scale-125" 
                aria-hidden="true" 
              />

              {/* 3D Dragon Artwork & Floating Game Logo (Seamless integration, zero box edges) */}
              <div 
                className="relative z-10 w-full overflow-visible transition-transform duration-700 ease-out"
                style={{
                  transform: `translateZ(${isHovering ? 25 : 10}px)`
                }}
              >
                {/* Pristine Full 3D Dragon with natural atmospheric blend */}
                <img
                  src="/contest/hero-dragon-clean.png"
                  alt="3D Security Island Dragon in Battle Arena"
                  className="w-full h-auto object-contain scale-100 select-none pointer-events-none"
                />

                {/* High-Resolution Floating AWS Card Clash Game Logo (Positioned above dragon's back) */}
                <div 
                  className="absolute top-[6%] left-[48%] sm:left-[50%] w-[33%] max-w-[215px] pointer-events-none drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)] transition-transform duration-500 group-hover:scale-105"
                  style={{
                    transform: 'translateZ(20px)'
                  }}
                >
                  <img
                    src="/contest/card-clash-logo-clean.png"
                    alt="AWS Card Clash"
                    className="w-full h-auto object-contain"
                  />
                </div>

                {/* Subtle Dragon Eye Glow positioned at dragon eye */}
                <div 
                  className="absolute top-[56.4%] left-[72.6%] w-2.5 h-2.5 bg-[#F5C451] rounded-full blur-[1px] shadow-[0_0_12px_#F5C451] animate-ping pointer-events-none" 
                  aria-hidden="true" 
                />
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
