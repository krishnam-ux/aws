'use client';

import { useState, useEffect } from 'react';
import ContestNavbar from './ContestNavbar';
import ContestWinnersSection from './ContestWinnersSection';
import SecurityIslandSection from './SecurityIslandSection';
import DragonCreatureSection from './DragonCreatureSection';
import GameplayGallery from './GameplayGallery';
import ContestFooter from './ContestFooter';
import FlyingDragon from './FlyingDragon';
import ParticleCanvas from './ParticleCanvas';
import DevContestPreviewBar, { PreviewMode } from './DevContestPreviewBar';

interface ContestCompletedContentProps {
  previewMode?: PreviewMode;
  effectiveStatus?: 'LOCKED' | 'LIVE' | 'ENDED';
  onSelectPreviewMode?: (mode: PreviewMode) => void;
}

export default function ContestCompletedContent({
  previewMode = 'AUTO',
  effectiveStatus = 'ENDED',
  onSelectPreviewMode
}: ContestCompletedContentProps) {
  const [activeSection, setActiveSection] = useState<string>('');
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, translateZ: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const sections = ['overview', 'winners', 'island', 'dragon', 'gallery', 'completed-faq'];

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          return;
        }
      }

      if (window.scrollY < 300) {
        setActiveSection('');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((x - centerX) / centerX) * 6;
    const rotateX = -((y - centerY) / centerY) * 6;
    setTilt({ rotateX, rotateY, translateZ: 20 });
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

  const completedFaqs = [
    {
      q: 'When will the official Top 5 winners be announced?',
      a: 'Our team is currently reviewing and verifying the final leaderboard. The Top 5 winners will be announced on this page soon.'
    },
    {
      q: 'How will the AWS Certified AI Practitioner exam vouchers be distributed?',
      a: 'Selected winners will receive an official confirmation email on their registered email address with further details about their AWS Certified AI Practitioner exam voucher.'
    },
    {
      q: 'Can I still play AWS Card Clash after the contest?',
      a: 'Yes! AWS Card Clash remains free to play on iOS, Android, and web via AWS Skill Builder. You can continue practicing cloud architecture and exploring Security Island for your personal learning.'
    },
    {
      q: 'How can I participate in future AWS Student Builder Group events?',
      a: 'Visit our community homepage to explore upcoming workshops, hackathons, cloud study cohorts, and technical sessions at Chandigarh University – Uttar Pradesh.'
    }
  ];

  return (
    <div className="bg-[#0B0908] text-[#F8F2EA] min-h-screen selection:bg-[#F5C451] selection:text-[#0B0908] overflow-x-hidden font-sans relative">
      {/* Ambient 3D Flying Dragon */}
      <FlyingDragon />

      {/* Sticky Fixed Navigation with Completed Mode */}
      <ContestNavbar activeSection={activeSection} isCompletedMode={true} />

      {/* HERO SECTION: CONTEST COMPLETED — THANK YOU FOR PARTICIPATING */}
      <section
        id="overview"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          setTilt({ rotateX: 0, rotateY: 0, translateZ: 0 });
        }}
        className="relative min-h-[85vh] flex items-center justify-center pt-28 pb-16 overflow-hidden bg-[#0B0908] border-b border-[#211713]"
      >
        {/* Seamless cinematic black-to-dark-brown gradient background */}
        <div 
          className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[#0B0908] via-[#1A110D] to-[#0B0908]" 
          aria-hidden="true" 
        />
        {/* Warm volumetric radial glow */}
        <div 
          className="pointer-events-none absolute top-1/6 right-[5%] w-[850px] h-[750px] bg-[radial-gradient(ellipse_75%_65%_at_center,rgba(233,139,50,0.22)_0%,rgba(140,50,15,0.11)_45%,transparent_75%)] rounded-full blur-[90px]" 
          aria-hidden="true" 
        />

        {/* Floating Ember Particle Canvas */}
        <ParticleCanvas />

        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Completion Headline & Details */}
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6 relative z-20">
              
              {/* Completed Tagline Badge */}
              <div className="inline-flex items-center space-x-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#F5C451] bg-[#211713] px-3.5 py-1.5 rounded-full border border-[#3A271E] shadow-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>CONTEST COMPLETED • 4 DECEMBER 2026</span>
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold text-[#F8F2EA] tracking-tight leading-[1.1] font-display">
                Contest Completed —{' '}
                <span className="text-[#F5C451] drop-shadow-[0_0_25px_rgba(245,196,81,0.35)]">
                  Thank You for Participating!
                </span>
              </h1>

              {/* Description */}
              <p className="text-base sm:text-lg text-[#B9AAA0] leading-relaxed max-w-xl font-normal">
                The official AWS Card Clash Security Island Contest has concluded. Thank you to all student builders and cloud defenders from Chandigarh University – Uttar Pradesh who battled the dragon, mastered 15 architecture defense challenges, and showcased exceptional AWS cloud knowledge.
              </p>

              {/* Contest Summary Box */}
              <div className="p-5 rounded-2xl bg-[#1D1410]/90 border border-[#3A271E] backdrop-blur-md shadow-xl flex flex-col space-y-4 max-w-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#F5C451]/15 border border-[#F5C451]/40 flex items-center justify-center text-[#F5C451] font-bold text-lg flex-shrink-0">
                    🏆
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#F8F2EA]">
                      Top 5 Winner Verification Underway
                    </h2>
                    <p className="text-xs text-[#B9AAA0]">
                      Review committee is auditing final match logs and star leaderboard scores.
                    </p>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <a
                    href="#winners"
                    onClick={(e) => handleSmoothScroll(e, '#winners')}
                    className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-bold text-[#0B0908] bg-[#F5C451] hover:bg-[#ffcf66] active:scale-95 transition-all duration-200 shadow-[0_0_18px_rgba(245,196,81,0.35)]"
                  >
                    View Top 5 Standings
                  </a>
                  <a
                    href="#island"
                    onClick={(e) => handleSmoothScroll(e, '#island')}
                    className="inline-flex items-center justify-center px-5 py-3 rounded-full text-sm font-semibold text-[#F8F2EA] bg-[#211713] hover:bg-[#2A1D17] border border-[#3A271E] hover:border-[#F5C451]/50 transition-all duration-200"
                  >
                    Explore Architectures
                  </a>
                </div>
              </div>

              {/* Status Note */}
              <div className="flex items-center space-x-2 text-xs text-[#B9AAA0]">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>All participant records and submissions have been safely preserved in the admin registry.</span>
              </div>

            </div>

            {/* Right Column: 3D Dragon & Floating Logo */}
            <div className="lg:col-span-6 relative flex items-center justify-center lg:justify-end pt-6 lg:pt-0 overflow-visible z-10 pointer-events-none lg:pointer-events-auto">
              <div
                className="relative w-full max-w-[560px] sm:max-w-[640px] lg:max-w-none lg:w-[130%] xl:w-[140%] 2xl:w-[148%] lg:-ml-[25%] xl:-ml-[32%] 2xl:-ml-[38%] transition-transform duration-300 ease-out"
                style={{
                  perspective: '1200px',
                  transformStyle: 'preserve-3d',
                  transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateZ(${tilt.translateZ}px)`
                }}
              >
                <div 
                  className="absolute inset-0 z-0 bg-radial from-[#E98B32]/20 via-transparent to-transparent rounded-full blur-3xl transform scale-125" 
                  aria-hidden="true" 
                />

                <div 
                  className="relative z-10 w-full overflow-visible transition-transform duration-700 ease-out"
                  style={{
                    transform: `translateZ(${isHovering ? 25 : 10}px)`
                  }}
                >
                  <img
                    src="/contest/hero-dragon-clean.png"
                    alt="3D Security Island Dragon"
                    className="w-full h-auto object-contain scale-100 select-none pointer-events-none"
                  />

                  <div 
                    className="absolute top-[6%] left-[48%] sm:left-[50%] w-[33%] max-w-[215px] pointer-events-none drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)]"
                    style={{ transform: 'translateZ(20px)' }}
                  >
                    <img
                      src="/contest/card-clash-logo-clean.png"
                      alt="AWS Card Clash"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* TOP 5 WINNERS & EXAM VOUCHERS SECTION */}
      <ContestWinnersSection />

      {/* RETROSPECTIVE: The Security Island 15 Architectures */}
      <SecurityIslandSection />

      {/* RETROSPECTIVE: The Dragon of Security Island */}
      <DragonCreatureSection />

      {/* RETROSPECTIVE: Gameplay Gallery */}
      <GameplayGallery />

      {/* POST-CONTEST FAQ */}
      <section id="completed-faq" className="py-20 bg-[#0B0908] border-b border-[#211713]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#F5C451]">
              POST-CONTEST QUESTIONS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F8F2EA] font-display">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {completedFaqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-2xl bg-[#140E0B] border border-[#3A271E] space-y-2"
              >
                <h3 className="text-base sm:text-lg font-bold text-[#F8F2EA] flex items-center space-x-2">
                  <span className="text-[#F5C451]">Q.</span>
                  <span>{faq.q}</span>
                </h3>
                <p className="text-xs sm:text-sm text-[#B9AAA0] leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark Footer */}
      <ContestFooter />

      {/* Dev Preview Switcher Toolbar */}
      {onSelectPreviewMode && (
        <DevContestPreviewBar
          currentMode={previewMode}
          effectiveStatus={effectiveStatus}
          onSelectMode={onSelectPreviewMode}
        />
      )}
    </div>
  );
}
