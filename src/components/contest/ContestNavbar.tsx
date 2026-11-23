'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ContestNavbarProps {
  activeSection: string;
}

export default function ContestNavbar({ activeSection }: ContestNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'The island', href: '#island' },
    { label: 'The dragon', href: '#dragon' },
    { label: 'The contest', href: '#contest' },
    { label: 'How to join', href: '#how-to-join' },
    { label: 'FAQ', href: '#faq' },
  ];

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
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
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-[#0B0908]/95 backdrop-blur-md shadow-2xl border-b border-[#3A271E]/80 py-3'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: AWS Card Clash Logo */}
        <div className="flex items-center space-x-3">
          <Link
            href="#top"
            onClick={(e) => handleSmoothScroll(e, '#top')}
            className="flex items-center space-x-2 group focus:outline-none focus:ring-2 focus:ring-[#F5C451] rounded-lg p-1"
          >
            <img
              src="/contest/card-clash-logo-clean.png"
              alt="AWS Card Clash"
              className="h-10 sm:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <div className="hidden sm:flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-[#B9AAA0] font-semibold">
                AWS Student Builder Group
              </span>
              <span className="text-xs font-bold text-[#F8F2EA] tracking-tight">
                Security Island Challenge
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8" aria-label="Contest Navigation">
          {navLinks.map((link) => {
            const isActive = activeSection === link.href.replace('#', '');
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className={`text-sm font-medium tracking-wide transition-colors duration-200 relative py-1 focus:outline-none focus:text-[#F5C451] ${
                  isActive
                    ? 'text-[#F5C451]'
                    : 'text-[#F8F2EA]/85 hover:text-[#F5C451]'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F5C451] rounded-full shadow-[0_0_8px_#F5C451]" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Right: Join the Contest CTA Button & Mobile Hamburger */}
        <div className="flex items-center space-x-4">
          <a
            href="#how-to-join"
            onClick={(e) => handleSmoothScroll(e, '#how-to-join')}
            className="inline-flex items-center justify-center px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold text-[#0B0908] bg-[#F5C451] hover:bg-[#ffcf66] active:scale-95 transition-all duration-200 shadow-[0_0_15px_rgba(245,196,81,0.35)] hover:shadow-[0_0_25px_rgba(245,196,81,0.55)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F5C451]"
          >
            Join the contest
          </a>

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#F8F2EA] hover:text-[#F5C451] hover:bg-[#211713] focus:outline-none focus:ring-2 focus:ring-[#F5C451]"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0B0908]/98 border-b border-[#3A271E] px-4 pt-3 pb-6 space-y-3 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => {
              const isActive = activeSection === link.href.replace('#', '');
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleSmoothScroll(e, link.href)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#211713] text-[#F5C451] font-semibold'
                      : 'text-[#F8F2EA] hover:bg-[#211713]/60 hover:text-[#F5C451]'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#3A271E]/60 flex flex-col space-y-2">
            <a
              href="#how-to-join"
              onClick={(e) => handleSmoothScroll(e, '#how-to-join')}
              className="w-full text-center px-4 py-2.5 rounded-full text-sm font-bold text-[#0B0908] bg-[#F5C451] hover:bg-[#ffcf66] shadow-[0_0_15px_rgba(245,196,81,0.35)]"
            >
              Join the contest
            </a>
            <Link
              href="/"
              className="text-center text-xs text-[#B9AAA0] hover:text-[#F8F2EA] py-1"
            >
              ← Back to CU-UP Community Portal
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
