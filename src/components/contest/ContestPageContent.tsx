'use client';

import { useState, useEffect } from 'react';
import ContestNavbar from './ContestNavbar';
import HeroSection from './HeroSection';
import ContestBanner from './ContestBanner';
import SecurityIslandSection from './SecurityIslandSection';
import DragonCreatureSection from './DragonCreatureSection';
import GameplayGallery from './GameplayGallery';
import PrizeSection from './PrizeSection';
import HowItWorksSection from './HowItWorksSection';
import HowToJoinSection from './HowToJoinSection';
import FAQSection from './FAQSection';
import ContestFooter from './ContestFooter';
import FlyingDragon from './FlyingDragon';
import ContestCompletedContent from './ContestCompletedContent';
import DevContestPreviewBar, { PreviewMode } from './DevContestPreviewBar';

interface ContestPageContentProps {
  initialPreview?: PreviewMode;
}

export default function ContestPageContent({ initialPreview }: ContestPageContentProps) {
  const [activeSection, setActiveSection] = useState<string>('');
  const [contestStatus, setContestStatus] = useState<'LOCKED' | 'LIVE' | 'ENDED'>('LOCKED');
  const [previewMode, setPreviewMode] = useState<PreviewMode>(() => {
    if (initialPreview && ['LOCKED', 'LIVE', 'ENDED'].includes(initialPreview)) {
      return initialPreview;
    }
    return 'AUTO';
  });

  // Read URL query parameter for development preview (safe, non-destructive)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDev =
        process.env.NODE_ENV !== 'production' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      if (isDev) {
        const params = new URLSearchParams(window.location.search);
        const previewParam = (
          params.get('preview') ||
          params.get('mode') ||
          params.get('state') ||
          ''
        ).toUpperCase();

        if (previewParam === 'ENDED') {
          setPreviewMode('ENDED');
        } else if (previewParam === 'LIVE') {
          setPreviewMode('LIVE');
        } else if (previewParam === 'LOCKED') {
          setPreviewMode('LOCKED');
        }
      }
    }
  }, []);

  const handleSelectPreviewMode = (mode: PreviewMode) => {
    setPreviewMode(mode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (mode === 'AUTO') {
        url.searchParams.delete('preview');
      } else {
        url.searchParams.set('preview', mode.toLowerCase());
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  useEffect(() => {
    // 1. Fetch server-authoritative contest status
    const checkStatus = () => {
      fetch('/api/contest/status')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.status) {
            setContestStatus(data.status);
          }
        })
        .catch((err) => console.error('Error fetching contest status:', err));
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const sections = ['island', 'dragon', 'contest', 'how-to-join', 'faq'];

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

  // Compute effective status (preview override takes precedence only in local dev)
  const effectiveStatus = previewMode !== 'AUTO' ? previewMode : contestStatus;

  // When contest status is ENDED (or previewMode is ENDED), render the professional Completed View
  if (effectiveStatus === 'ENDED') {
    return (
      <ContestCompletedContent
        previewMode={previewMode}
        effectiveStatus={effectiveStatus}
        onSelectPreviewMode={handleSelectPreviewMode}
      />
    );
  }

  return (
    <div className="bg-[#0B0908] text-[#F8F2EA] min-h-screen selection:bg-[#F5C451] selection:text-[#0B0908] overflow-x-hidden font-sans relative">
      {/* Ambient 3D Flying Dragon */}
      <FlyingDragon />

      {/* Sticky Fixed Navigation */}
      <ContestNavbar activeSection={activeSection} />

      {/* Hero Section with 3D Dragon, Parallax & Ember Canvas */}
      <HeroSection />

      {/* Contest Announcement Banner with Live Countdown */}
      <ContestBanner />

      {/* The Security Island: 15 Architectures & Interactive Level Grid */}
      <SecurityIslandSection />

      {/* The Island's Creature: 3D Dragon & Interactive Gameplay Video */}
      <DragonCreatureSection />

      {/* Inside a Match: 4-Column Gallery with Click-to-Enlarge Lightbox */}
      <GameplayGallery />

      {/* Prize Section: Exam Voucher, Trophy & Benefits */}
      <PrizeSection />

      {/* How it Works: 3 Steps, Badges & Celebration Artwork */}
      <HowItWorksSection />

      {/* How to Join: 6 Steps, Participant Registration & Clean QR Code */}
      <HowToJoinSection />

      {/* Frequently Asked Questions: Accordion */}
      <FAQSection />

      {/* Dark Footer */}
      <ContestFooter />

      {/* Dev Preview Switcher Toolbar */}
      <DevContestPreviewBar
        currentMode={previewMode}
        effectiveStatus={effectiveStatus}
        onSelectMode={handleSelectPreviewMode}
      />
    </div>
  );
}
