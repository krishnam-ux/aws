'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

/* =========================================================================
   ADMIN-READY DATA TYPES FOR HERO SLIDER
   ========================================================================= */
export interface HeroSlideMedia {
  src: string;
  poster?: string;
  label?: string;
  duration?: string;
  mimeType?: string;
}

export interface HeroSlideData {
  id: string;
  badge: string;
  title: string;
  subtitle?: string;
  description: string;
  mediaType: 'visual' | 'video';
  video?: HeroSlideMedia;
  highlightVideo: {
    src: string;
    title: string;
    duration: string;
    description: string;
    poster?: string;
  };
  primaryCta: {
    label: string;
    url: string;
    isExternal?: boolean;
  };
  secondaryCta?: {
    label: string;
    url: string;
    isExternal?: boolean;
  };
  active?: boolean;
  order?: number;
}

/* =========================================================================
   LOCAL VERIFIED VIDEO ASSETS & CONFIGURATION
   ========================================================================= */
const SLIDES: HeroSlideData[] = [
  {
    id: 'community',
    badge: 'AWS STUDENT BUILDER GROUP',
    title: 'Build. Learn. Explore.',
    subtitle: 'AWS Student Builder Group at Chandigarh University – Uttar Pradesh',
    description:
      'A student-led technology community focused on cloud computing, artificial intelligence, data, DevOps and hands-on technology learning.',
    mediaType: 'visual',
    highlightVideo: {
      src: '/videos/community-highlights.mp4',
      title: 'AWS Student Builder Group — Community Overview & Highlights',
      duration: '01:45',
      description: 'Discover how student builders at Chandigarh University learn, build cloud infrastructure, and collaborate on hands-on technology projects.',
    },
    primaryCta: {
      label: 'Join the Community',
      url: 'https://chat.whatsapp.com/HuEI5i4I8KkEya47yBKynD',
      isExternal: true,
    },
    secondaryCta: {
      label: 'Explore Activities',
      url: '/activities',
      isExternal: false,
    },
    active: true,
    order: 1,
  },
  {
    id: 'events',
    badge: 'COMMUNITY SESSIONS & LABS',
    title: 'Learn Together. Build Together.',
    subtitle: 'Workshops, Technical Sessions & Hands-on Labs',
    description:
      'Explore workshops, technical sessions, community events and hands-on learning experiences designed to help students build real cloud skills.',
    mediaType: 'video',
    video: {
      src: '/videos/workshops-overview.mp4',
      label: 'Workshop & Lab Highlights',
      duration: '01:15',
    },
    highlightVideo: {
      src: '/videos/workshops-overview.mp4',
      title: 'Technical Workshops & Interactive Cloud Labs Reel',
      duration: '01:15',
      description: 'Overview of student-led workshops covering VPC architectures, Serverless development, and Generative AI on AWS.',
    },
    primaryCta: {
      label: 'Explore Events',
      url: '/events',
      isExternal: false,
    },
    secondaryCta: {
      label: 'Explore Activities',
      url: '/activities',
      isExternal: false,
    },
    active: true,
    order: 2,
  },
  {
    id: 'learning',
    badge: 'HANDS-ON CLOUD & DEVELOPMENT',
    title: 'Learn AWS. Build Real Projects.',
    subtitle: 'Practical Cloud Skills & Project Building',
    description:
      'Hands-on learning through workshops, projects, technical sessions and community collaboration across modern cloud infrastructure.',
    mediaType: 'visual',
    highlightVideo: {
      src: '/videos/learning-projects.mp4',
      title: 'Real Projects & Cloud Architecture Demos',
      duration: '02:10',
      description: 'Live AWS CDK deployments, serverless microservices, and AI inference pipelines built by students.',
    },
    primaryCta: {
      label: 'Explore Activities',
      url: '/activities',
      isExternal: false,
    },
    secondaryCta: {
      label: 'View Resources',
      url: '/resources',
      isExternal: false,
    },
    active: true,
    order: 3,
  },
  {
    id: 'moments',
    badge: 'STUDENT BUILDER NETWORK',
    title: 'Where Builders Meet.',
    subtitle: 'Collaboration, Mentorship & Growth',
    description:
      'Discover the people, sessions and moments that make our student community active, collaborative and focused on peer growth.',
    mediaType: 'video',
    video: {
      src: '/videos/community-moments.mp4',
      label: 'Student Builder Showcase',
      duration: '01:30',
    },
    highlightVideo: {
      src: '/videos/community-moments.mp4',
      title: 'Campus Moments & Student Builder Spotlight',
      duration: '01:30',
      description: 'Collaborative study cohorts, campus tech talks, and project showcase moments at Chandigarh University – Uttar Pradesh.',
    },
    primaryCta: {
      label: 'View Gallery',
      url: '/events',
      isExternal: false,
    },
    secondaryCta: {
      label: 'Meet Leadership',
      url: '/leadership',
      isExternal: false,
    },
    active: true,
    order: 4,
  },
];

const AUTO_SLIDE_INTERVAL = 6000; // 6 seconds

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeMediaTab, setActiveMediaTab] = useState<'architecture' | 'video'>('architecture');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Video Modal State
  const [modalVideo, setModalVideo] = useState<{
    isOpen: boolean;
    src: string;
    title: string;
    description?: string;
    duration?: string;
  }>({
    isOpen: false,
    src: '',
    title: '',
  });

  // Reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const totalSlides = SLIDES.length;

  // Check reduced motion
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Sync tab with slide mediaType when slide changes
  useEffect(() => {
    const slide = SLIDES[currentSlide];
    if (slide.mediaType === 'video') {
      setActiveMediaTab('video');
    } else {
      setActiveMediaTab('architecture');
    }
  }, [currentSlide]);

  // Auto slide timer
  useEffect(() => {
    if (isPaused || modalVideo.isOpen || prefersReducedMotion) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      nextSlide();
    }, AUTO_SLIDE_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, modalVideo.isOpen, prefersReducedMotion, nextSlide, currentSlide]);

  // Handle visibility change (tab switch)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsPaused(true);
      } else if (!modalVideo.isOpen) {
        setIsPaused(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [modalVideo.isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalVideo.isOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalVideo.isOpen, nextSlide, prevSlide]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
    setTouchStartX(null);
  };

  // Open Video Lightbox
  const handleOpenHighlights = (customVideo?: { src: string; title: string; description?: string; duration?: string }) => {
    const target = customVideo || SLIDES[currentSlide].highlightVideo;
    setIsPaused(true);
    setModalVideo({
      isOpen: true,
      src: target.src,
      title: target.title,
      description: target.description,
      duration: target.duration,
    });
  };

  const handleCloseModal = () => {
    setModalVideo((prev) => ({ ...prev, isOpen: false }));
    setIsPaused(false);
  };

  const slide = SLIDES[currentSlide];

  return (
    <>
      <section
        className="relative w-full bg-white border-b border-[#D5DCE5] overflow-hidden select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => {
          if (!modalVideo.isOpen) setIsPaused(false);
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="region"
        aria-roledescription="carousel"
        aria-label="AWS Community Hero Slider"
      >
        {/* Subtle Architectural Grid Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.35]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(213, 220, 229, 0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(213, 220, 229, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Ambient Warm Gradient Accent */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-gradient-to-b from-[#FF9900]/5 to-transparent blur-3xl pointer-events-none" />

        {/* Main Viewport Container */}
        <div className="relative max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12 flex flex-col justify-between min-h-[520px] lg:min-h-[560px]">

          {/* 55/45 Hero Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center flex-grow py-2">
            
            {/* Left Column: Typography, Mission & CTAs */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-4">
              
              {/* Category Tag */}
              <div>
                <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-[#0B1B2B] text-white border border-slate-800 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-aws-orange mr-1.5"></span>
                  {slide.badge}
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-[2.85rem] text-brand-navy tracking-tight leading-[1.12]">
                {slide.title}
              </h1>

              {/* Subtitle */}
              {slide.subtitle && (
                <h2 className="font-display font-semibold text-xs sm:text-sm text-slate-700 tracking-wide uppercase">
                  {slide.subtitle}
                </h2>
              )}

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-600 font-sans leading-relaxed max-w-xl">
                {slide.description}
              </p>

              {/* Clean CTA Hierarchy */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                {/* Primary CTA: AWS Orange */}
                {slide.primaryCta.isExternal ? (
                  <a
                    href={slide.primaryCta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary py-2 px-4.5 text-xs sm:text-sm shadow-xs flex items-center space-x-1.5 group"
                  >
                    <span>{slide.primaryCta.label}</span>
                    <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </a>
                ) : (
                  <Link
                    href={slide.primaryCta.url}
                    className="btn-primary py-2 px-4.5 text-xs sm:text-sm shadow-xs flex items-center space-x-1.5 group"
                  >
                    <span>{slide.primaryCta.label}</span>
                    <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                )}

                {/* Secondary CTA: Clean Navy Border */}
                {slide.secondaryCta && (
                  slide.secondaryCta.isExternal ? (
                    <a
                      href={slide.secondaryCta.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary py-2 px-4 text-xs sm:text-sm"
                    >
                      {slide.secondaryCta.label}
                    </a>
                  ) : (
                    <Link
                      href={slide.secondaryCta.url}
                      className="btn-secondary py-2 px-4 text-xs sm:text-sm"
                    >
                      {slide.secondaryCta.label}
                    </Link>
                  )
                )}

                {/* Video CTA: Dark Navy with Play Badge */}
                <button
                  type="button"
                  onClick={() => handleOpenHighlights(slide.highlightVideo)}
                  className="inline-flex items-center space-x-2 py-2 px-3.5 rounded-md text-xs sm:text-sm font-bold font-sans bg-[#0B1B2B] hover:bg-[#15293E] text-white border border-[#1E293B] shadow-xs transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-aws-orange"
                  aria-label={`Watch highlights video: ${slide.title}`}
                >
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-aws-orange text-brand-navy group-hover:scale-110 transition-transform">
                    <svg className="w-2 h-2 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  <span>Watch Highlights</span>
                  <span className="text-[10px] font-mono text-slate-400 font-normal pl-1 border-l border-slate-700">
                    {slide.highlightVideo.duration}
                  </span>
                </button>
              </div>

            </div>

            {/* Right Column: Premium AWS Cloud Engineering Workspace */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <div className="w-full max-w-lg aspect-[1.25/1] rounded-lg bg-[#0B1B2B] border border-[#1E293B] shadow-xl overflow-hidden relative flex flex-col justify-between">
                
                {/* Console Header Bar */}
                <div className="h-9 bg-[#112233] border-b border-slate-800 px-3.5 flex items-center justify-between text-xs z-10">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] inline-block opacity-80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] inline-block opacity-80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] inline-block opacity-80" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-300 font-semibold pl-2 border-l border-slate-700">
                      aws-cloud-workspace // {slide.id}
                    </span>
                  </div>

                  {/* Mode Selector Toggle */}
                  <div className="flex items-center space-x-1 bg-[#091522] p-0.5 rounded border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveMediaTab('architecture')}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-colors cursor-pointer ${
                        activeMediaTab === 'architecture'
                          ? 'bg-aws-orange text-brand-navy shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ARCH
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMediaTab('video')}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-colors cursor-pointer ${
                        activeMediaTab === 'video'
                          ? 'bg-aws-orange text-brand-navy shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      REEL
                    </button>
                  </div>
                </div>

                {/* Main Workspace Body */}
                <div className="flex-grow p-3 sm:p-4 flex items-center justify-center relative overflow-hidden text-slate-100 bg-[#08131F]">
                  {activeMediaTab === 'video' ? (
                    <SlideVideoPlayer
                      key={slide.id}
                      video={slide.video || {
                        src: slide.highlightVideo.src,
                        label: slide.badge,
                        duration: slide.highlightVideo.duration,
                      }}
                      title={slide.title}
                      isActive={true}
                      onOpenModal={() => handleOpenHighlights(slide.highlightVideo)}
                      onPlaybackChange={(playing) => setIsPaused(playing)}
                    />
                  ) : (
                    <CloudArchitectureVisual slideId={slide.id} />
                  )}
                </div>

                {/* Console Telemetry Footer */}
                <div className="h-7 bg-[#091522] border-t border-slate-800 px-3.5 flex items-center justify-between text-[9px] font-mono text-slate-400 z-10">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500">REGION:</span>
                    <span className="text-slate-300 font-semibold">ap-south-1</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-emerald-400 font-bold">OPERATIONAL</span>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Bottom Slider Navigation Tabs & Controls */}
          <div className="pt-4 sm:pt-6 mt-4 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Quick-Jump Slide Tabs */}
            <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {SLIDES.map((s, idx) => {
                const isActive = idx === currentSlide;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goToSlide(idx)}
                    className={`group flex items-center space-x-2 px-3 py-1.5 rounded text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#0B1B2B] text-white shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                    }`}
                    aria-label={`Go to slide ${idx + 1}: ${s.title}`}
                    aria-current={isActive ? 'true' : 'false'}
                  >
                    <span
                      className={`font-mono text-[10px] font-bold ${
                        isActive ? 'text-aws-orange' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    >
                      0{idx + 1}
                    </span>
                    <span className="text-xs font-display font-semibold hidden sm:inline">
                      {idx === 0 && 'Community'}
                      {idx === 1 && 'Events'}
                      {idx === 2 && 'Learning'}
                      {idx === 3 && 'Moments'}
                    </span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-aws-orange"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Previous/Next Arrows & Auto-Slide Progress Bar */}
            <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
              
              <div className="hidden md:flex flex-col space-y-1 w-24">
                <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    key={currentSlide}
                    className={`h-full bg-aws-orange transition-all duration-200 rounded-full ${
                      isPaused || prefersReducedMotion ? 'opacity-50' : 'animate-sliderProgress'
                    }`}
                    style={{
                      animationDuration: `${AUTO_SLIDE_INTERVAL}ms`,
                      animationPlayState: isPaused || prefersReducedMotion ? 'paused' : 'running',
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={prevSlide}
                  className="p-1.5 sm:p-2 rounded bg-white border border-slate-200 hover:border-aws-orange hover:text-aws-orange text-brand-navy shadow-xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-aws-orange"
                  aria-label="Previous slide"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={nextSlide}
                  className="p-1.5 sm:p-2 rounded bg-white border border-slate-200 hover:border-aws-orange hover:text-aws-orange text-brand-navy shadow-xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-aws-orange"
                  aria-label="Next slide"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Video Lightbox Modal */}
      {modalVideo.isOpen && (
        <HeroVideoModal
          src={modalVideo.src}
          title={modalVideo.title}
          description={modalVideo.description}
          duration={modalVideo.duration}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

/* =========================================================================
   AUTHENTIC AWS CLOUD ARCHITECTURE VISUAL (Technical Canvas)
   ========================================================================= */
function CloudArchitectureVisual({ slideId }: { slideId: string }) {
  return (
    <div className="w-full h-full flex flex-col justify-between relative">
      {/* Top Architecture Status Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-1">
        <div className="flex items-center space-x-2">
          <span className="px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-400/30 text-blue-400 font-mono text-[9px] font-bold">
            VPC: 10.0.0.0/16
          </span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 font-mono text-[9px] font-bold">
            TLS 1.3
          </span>
        </div>
        <span className="text-[9px] font-mono text-slate-400">
          {slideId === 'community' && 'TOPOLOGY MAP'}
          {slideId === 'events' && 'WORKSHOP PIPELINE'}
          {slideId === 'learning' && 'CDK INFRASTRUCTURE'}
          {slideId === 'moments' && 'BUILDER NETWORK'}
        </span>
      </div>

      {/* SVG Circuit Canvas */}
      <div className="w-full flex-grow relative flex items-center justify-center">
        <svg className="w-full h-44" viewBox="0 0 420 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Subtle Grid Lines */}
          <path d="M10 10h400v160H10z" stroke="#172230" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M70 10v160M140 10v160M210 10v160M280 10v160M350 10v160" stroke="#0E1A27" strokeWidth="1" />
          <path d="M10 50h400M10 90h400M10 130h400" stroke="#0E1A27" strokeWidth="1" />

          {/* VPC Boundary Perimeter */}
          <rect x="20" y="22" width="380" height="136" rx="6" fill="none" stroke="#2B3E54" strokeWidth="1" strokeDasharray="4 4" />
          <text x="32" y="38" fill="#64748B" fontSize="9" fontFamily="monospace" fontWeight="bold">
            AWS Multi-AZ Cloud Perimeter (ap-south-1)
          </text>

          {/* Connection Route Vectors */}
          <path d="M75 90h65M195 90h65M315 90h40" stroke="#334155" strokeWidth="1.5" />
          <path d="M170 70v-16h90v16" stroke="#FF9900" strokeWidth="1.5" strokeDasharray="2 2" />
          <path d="M170 110v16h90v-16" stroke="#146EF5" strokeWidth="1.5" strokeDasharray="2 2" />

          {/* Node 1: Edge & API Gateway */}
          <g transform="translate(35, 68)">
            <rect width="48" height="44" rx="4" fill="#112233" stroke="#475569" strokeWidth="1" />
            <circle cx="24" cy="16" r="6" fill="#FF9900" />
            <text x="24" y="34" fill="#FFFFFF" fontSize="8" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">API GW</text>
          </g>

          {/* Node 2: Serverless Lambda / Compute Cluster */}
          <g transform="translate(145, 62)">
            <rect width="56" height="54" rx="4" fill="#0B1B2B" stroke="#FF9900" strokeWidth="1.5" />
            <rect x="6" y="8" width="44" height="12" rx="2" fill="#FF9900" fillOpacity="0.2" />
            <text x="28" y="17" fill="#FF9900" fontSize="7" fontFamily="monospace" textAnchor="middle" fontWeight="bold">LAMBDA</text>
            <text x="28" y="34" fill="#FFFFFF" fontSize="8" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">Compute</text>
            <text x="28" y="46" fill="#94A3B8" fontSize="7" fontFamily="monospace" textAnchor="middle">v20.x</text>
          </g>

          {/* Node 3: AI Model Inference / Bedrock */}
          <g transform="translate(260, 42)">
            <rect width="55" height="44" rx="4" fill="#112233" stroke="#146EF5" strokeWidth="1" />
            <circle cx="27.5" cy="15" r="5" fill="#146EF5" />
            <text x="27.5" y="33" fill="#FFFFFF" fontSize="8" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">SageMaker</text>
          </g>

          {/* Node 4: DynamoDB / S3 Data Layer */}
          <g transform="translate(260, 96)">
            <rect width="55" height="44" rx="4" fill="#112233" stroke="#10B981" strokeWidth="1" />
            <rect x="17.5" y="10" width="20" height="10" rx="1" fill="#10B981" fillOpacity="0.3" stroke="#10B981" strokeWidth="1" />
            <text x="27.5" y="33" fill="#FFFFFF" fontSize="8" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">DynamoDB</text>
          </g>

          {/* Animated Data Telemetry Pulses */}
          <circle cx="108" cy="90" r="3" fill="#FF9900" />
          <circle cx="228" cy="90" r="3" fill="#146EF5" />
        </svg>
      </div>

      {/* Badges Strip */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80">
        <div className="p-1 rounded bg-[#091522] border border-slate-800 text-center">
          <span className="block text-[7px] text-slate-400 font-mono uppercase">COMPUTE</span>
          <span className="text-[9px] font-bold text-slate-200">Serverless &amp; VPC</span>
        </div>
        <div className="p-1 rounded bg-[#091522] border border-slate-800 text-center">
          <span className="block text-[7px] text-slate-400 font-mono uppercase">AI / ML</span>
          <span className="text-[9px] font-bold text-aws-orange">Bedrock &amp; Models</span>
        </div>
        <div className="p-1 rounded bg-[#091522] border border-slate-800 text-center">
          <span className="block text-[7px] text-slate-400 font-mono uppercase">STORAGE</span>
          <span className="text-[9px] font-bold text-emerald-400">DynamoDB &amp; S3</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   IN-SLIDE VIDEO PLAYER COMPONENT (Real HTML5 Video with Custom Controls)
   ========================================================================= */
interface SlideVideoPlayerProps {
  video: HeroSlideMedia;
  title: string;
  isActive: boolean;
  onOpenModal: () => void;
  onPlaybackChange: (isPlaying: boolean) => void;
}

function SlideVideoPlayer({
  video,
  title,
  isActive,
  onOpenModal,
  onPlaybackChange,
}: SlideVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (isActive) {
      vid.muted = true;
      const promise = vid.play();
      if (promise !== undefined) {
        promise
          .then(() => {
            setIsPlaying(true);
            onPlaybackChange(true);
          })
          .catch(() => {
            // Autoplay not permitted by browser
            setIsPlaying(false);
            onPlaybackChange(false);
          });
      }
    } else {
      vid.pause();
      setIsPlaying(false);
      onPlaybackChange(false);
    }

    return () => {
      if (vid) {
        vid.pause();
      }
    };
  }, [isActive, video.src, onPlaybackChange]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;

    if (vid.paused) {
      vid.play()
        .then(() => {
          setIsPlaying(true);
          onPlaybackChange(true);
        })
        .catch(() => {
          setIsPlaying(false);
          onPlaybackChange(false);
        });
    } else {
      vid.pause();
      setIsPlaying(false);
      onPlaybackChange(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (vid && vid.duration) {
      setProgress((vid.currentTime / vid.duration) * 100);
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.requestFullscreen) {
      vid.requestFullscreen().catch(() => {});
    }
  };

  if (hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-2 text-center p-4">
        <span className="text-xs font-mono text-amber-400">Video preview unavailable</span>
        <button
          type="button"
          onClick={() => {
            setHasError(false);
            if (videoRef.current) videoRef.current.load();
          }}
          className="px-3 py-1 text-[10px] font-mono rounded bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer"
        >
          Retry Stream
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative rounded overflow-hidden bg-black flex flex-col justify-between group">
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        src={video.src}
        poster={video.poster}
        preload="metadata"
        playsInline
        muted
        loop
        onTimeUpdate={handleTimeUpdate}
        onError={() => setHasError(true)}
        className="absolute inset-0 w-full h-full object-cover cursor-pointer"
        onClick={togglePlay}
      />

      {/* Top Stream Header Overlay */}
      <div className="relative z-10 p-2 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
          <span className="text-[9px] font-mono font-bold tracking-wider text-white uppercase">
            {video.label || 'COMMUNITY REEL'}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenModal}
          className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs flex items-center space-x-1 cursor-pointer transition-colors"
        >
          <span>Full Lightbox</span>
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </div>

      {/* Center Play Button Overlay */}
      <div 
        onClick={togglePlay}
        className="relative z-10 flex-grow flex items-center justify-center cursor-pointer"
      >
        {!isPlaying && (
          <div className="w-11 h-11 rounded-full bg-black/70 border border-white/30 flex items-center justify-center text-white backdrop-blur-xs shadow-lg transform transition-transform hover:scale-110">
            <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="relative z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 space-y-1">
        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-aws-orange transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={togglePlay}
              className="p-1 hover:text-aws-orange transition-colors cursor-pointer"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="p-1 hover:text-aws-orange transition-colors cursor-pointer"
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? (
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.414 0-.75-.336-.75-.75V9.75c0-.414.336-.75.75-.75h4.74z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.414 0-.75-.336-.75-.75V9.75c0-.414.336-.75.75-.75h4.74z" />
                </svg>
              )}
            </button>

            <span className="text-[9px] font-mono text-slate-300 truncate max-w-[130px]">
              {title}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1 hover:text-aws-orange transition-colors cursor-pointer"
            aria-label="Fullscreen"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   PREMIUM VIDEO MODAL / LIGHTBOX
   ========================================================================= */
interface HeroVideoModalProps {
  src: string;
  title: string;
  description?: string;
  duration?: string;
  onClose: () => void;
}

function HeroVideoModal({
  src,
  title,
  description,
  duration,
  onClose,
}: HeroVideoModalProps) {
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('0:00');
  const [durationStr, setDurationStr] = useState<string>(duration || '0:00');

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        const vid = modalVideoRef.current;
        if (vid) {
          if (vid.paused) {
            vid.play().then(() => setIsPlaying(true)).catch(() => {});
          } else {
            vid.pause();
            setIsPlaying(false);
          }
        }
      } else if (e.key === 'm' || e.key === 'M') {
        const vid = modalVideoRef.current;
        if (vid) {
          vid.muted = !vid.muted;
          setIsMuted(vid.muted);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    const vid = modalVideoRef.current;
    if (vid) {
      vid.muted = true;
      vid.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [src]);

  const togglePlay = () => {
    const vid = modalVideoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const vid = modalVideoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  };

  const handleTimeUpdate = () => {
    const vid = modalVideoRef.current;
    if (vid && vid.duration) {
      setProgress((vid.currentTime / vid.duration) * 100);
      setCurrentTimeStr(formatTime(vid.currentTime));
      setDurationStr(formatTime(vid.duration));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const vid = modalVideoRef.current;
    if (!vid || !vid.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    vid.currentTime = pos * vid.duration;
  };

  const toggleFullscreen = () => {
    const vid = modalVideoRef.current;
    if (!vid) return;
    if (vid.requestFullscreen) {
      vid.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Video Highlights Lightbox"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[#0B1B2B] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-4.5 border-b border-slate-800 flex items-center justify-between bg-[#112233]">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-aws-orange text-brand-navy">
                HIGHLIGHTS REEL
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {currentTimeStr} / {durationStr}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-display font-bold text-white tracking-tight">
              {title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-aws-orange"
            aria-label="Close video player"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Video Screen */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={modalVideoRef}
            src={src}
            preload="metadata"
            playsInline
            muted={isMuted}
            onTimeUpdate={handleTimeUpdate}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
          />

          {!isPlaying && (
            <div
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-aws-orange text-brand-navy flex items-center justify-center shadow-xl transform transition-transform hover:scale-110">
                <svg className="w-7 h-7 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Player Controls Bar */}
        <div className="p-4 bg-[#091522] border-t border-slate-800 space-y-2.5">
          {/* Progress Scrubber */}
          <div
            className="w-full h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer hover:h-2.5 transition-all relative"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-aws-orange transition-all duration-75 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-white text-xs">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={togglePlay}
                className="p-1.5 rounded hover:bg-slate-800 text-white hover:text-aws-orange transition-colors cursor-pointer"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 rounded hover:bg-slate-800 text-white hover:text-aws-orange transition-colors cursor-pointer flex items-center space-x-1"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <>
                    <svg className="w-4.5 h-4.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.414 0-.75-.336-.75-.75V9.75c0-.414.336-.75.75-.75h4.74z" />
                    </svg>
                    <span className="text-[10px] text-amber-400 font-mono">MUTED</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4.5 h-4.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.414 0-.75-.336-.75-.75V9.75c0-.414.336-.75.75-.75h4.74z" />
                    </svg>
                    <span className="text-[10px] text-emerald-400 font-mono">AUDIO ON</span>
                  </>
                )}
              </button>

              <span className="text-xs font-mono text-slate-400">
                {currentTimeStr} / {durationStr}
              </span>
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Fullscreen player"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            </button>
          </div>

          {description && (
            <p className="text-xs text-slate-400 font-sans border-t border-slate-800/80 pt-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
