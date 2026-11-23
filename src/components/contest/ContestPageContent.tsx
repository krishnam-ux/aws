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

export default function ContestPageContent() {
  const [activeSection, setActiveSection] = useState<string>('');

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
    </div>
  );
}
