'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { siteConfig } from '@/data/siteConfig';

// Custom error-tolerant logo loader that hides broken image indicators and shows fallback text
function HeaderLogo({ src, fallbackText, width, height, className }: { src: string; fallbackText: string; width?: string; height?: string; className?: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <span className="font-sans font-bold text-brand-navy tracking-tight text-xs flex-shrink-0">
        {fallbackText}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt="" // Must be empty to prevent visible alt text when broken
      className={className}
      onError={() => setHasError(true)}
      style={{ width: width || 'auto', height: height || 'auto', objectFit: 'contain' }}
    />
  );
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Keep the shortcut disabled while already inside the Admin Portal
      if (pathname?.startsWith('/admin')) {
        return;
      }
      
      // Detect Windows/Meta key + Shift + K
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        
        const token = typeof window !== 'undefined' ? sessionStorage.getItem('adminToken') : null;
        if (token) {
          router.push('/admin/dashboard');
        } else {
          router.push('/admin/login');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pathname, router]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const [isExamPublished, setIsExamPublished] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadStatus() {
      try {
        const res = await fetch('/api/exam/status', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.published === 'boolean') {
            setIsExamPublished(data.published);
          }
        }
      } catch (err) {
        // Fallback to unpublished
      }
    }
    loadStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const mainLinks = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Activities', href: '/activities' },
    { label: 'Events', href: '/events' },
    ...(isExamPublished ? [{ label: 'Exams', href: '/exam' }] : []),
    { label: 'Resources', href: '/resources' },
    { label: 'Verification', href: '/verification' },
    { label: 'Leadership', href: '/leadership' },
    { label: 'Feedback', href: '/feedback' }
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full h-[72px] transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-xs border-b border-slate-200/90'
          : 'bg-white border-b border-[#E5E7EB]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Left: Compact brand lockup */}
        <div className="flex-shrink-0 flex items-center h-full">
          <Link href="/" className="flex items-center space-x-3 group h-full">
            {/* AWS Logo (approx 40-45px wide) */}
            <HeaderLogo src={siteConfig.awsLogoUrl} fallbackText="AWS" width="42px" className="flex-shrink-0 transition-transform duration-200 group-hover:scale-105" />
            
            <div className="flex flex-col justify-center">
              <span className="font-display font-black text-brand-navy text-sm sm:text-base tracking-tight leading-none group-hover:text-[#FF9900] transition-colors duration-200">
                AWS Student Builder Group
              </span>
              <span className="text-[9px] text-slate-500 font-sans tracking-wide leading-none mt-1">
                Chandigarh University – Uttar Pradesh
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Desktop Nav */}
        <nav className="hidden lg:flex items-center space-x-1 h-full">
          {mainLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 text-xs font-semibold tracking-wide h-full flex items-center transition-all duration-200 border-b-2 hover:-translate-y-0.5 ${
                  isActive
                    ? 'text-aws-orange border-aws-orange'
                    : 'text-slate-700 hover:text-brand-navy border-transparent hover:border-slate-200 hover:bg-slate-50/50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Join CTA button & CU Logo */}
        <div className="hidden lg:flex items-center space-x-4">
          <a
            href="https://chat.whatsapp.com/HuEI5i4I8KkEya47yBKynD"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary py-1.5 px-3.5 text-xs flex-shrink-0 group"
          >
            <span>Join Community</span>
            <span className="group-hover-arrow ml-1">&rarr;</span>
          </a>
          <div className="h-6 w-[1px] bg-slate-200 flex-shrink-0"></div>
          <HeaderLogo
            src={siteConfig.cuLogoUrl}
            fallbackText="Chandigarh University"
            height="44px"
            className="flex-shrink-0 transition-transform duration-200 hover:scale-105"
          />
        </div>

        {/* Mobile Hamburger menu */}
        <div className="flex lg:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            type="button"
            className="inline-flex items-center justify-center p-1.5 rounded text-slate-500 hover:text-brand-navy hover:bg-slate-100 transition-colors focus:outline-none"
            aria-controls="mobile-menu"
            aria-expanded={isOpen}
          >
            <span className="sr-only">Open menu</span>
            {isOpen ? (
              <svg className="block h-5 w-5 transition-transform duration-200 rotate-90" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="block h-5 w-5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Layout */}
      <div
        className={`lg:hidden border-t border-slate-100 bg-white transition-all duration-300 ease-out overflow-hidden ${
          isOpen ? 'max-h-screen opacity-100 border-b border-slate-200 shadow-lg' : 'max-h-0 opacity-0'
        }`}
        id="mobile-menu"
      >
        <div className="px-4 py-3 space-y-1">
          {mainLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 text-sm font-semibold rounded transition-all duration-150 ${
                  isActive
                    ? 'text-aws-orange bg-orange-50/60 font-bold'
                    : 'text-slate-700 hover:bg-slate-50 hover:translate-x-1'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          
          <div className="pt-3 border-t border-slate-100 flex items-center space-x-3.5">
            <a
              href="https://chat.whatsapp.com/HuEI5i4I8KkEya47yBKynD"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-grow text-center py-2.5 rounded bg-aws-orange hover:bg-aws-orange-hover text-brand-navy font-display font-bold text-xs transition-all duration-150 hover:shadow-xs active:scale-95"
            >
              Join Community &rarr;
            </a>
            <div className="h-6 w-[1px] bg-slate-200 flex-shrink-0"></div>
            <HeaderLogo
              src={siteConfig.cuLogoUrl}
              fallbackText="Chandigarh University"
              height="40px"
              className="flex-shrink-0"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
