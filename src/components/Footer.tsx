'use client';

import { useState } from 'react';
import Link from 'next/link';
import { siteConfig } from '@/data/siteConfig';

// Custom error-tolerant logo loader that hides broken image indicators and shows fallback text in footer
function FooterLogo({ src, fallbackText, height, width }: { src: string; fallbackText: string; height?: string; width?: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <span className="font-sans font-bold text-slate-400 tracking-tight text-[10px] flex-shrink-0">
        {fallbackText}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt="" // Must be empty to prevent visible alt text when broken
      onError={() => setHasError(true)}
      style={{ height: height || 'auto', width: width || 'auto', objectFit: 'contain' }}
    />
  );
}

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  if (pathname?.startsWith('/admin')) {
    return null;
  }
  return (
    <footer className="bg-brand-navy text-slate-350 border-t border-navy-dark py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Main Footer columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
          {/* Left Column: Logos & Name */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-3">
              {/* AWS Logo: approx 45-50px wide */}
              <FooterLogo src={siteConfig.awsLogoUrl} fallbackText="AWS" width="48px" />
              <span className="text-slate-800">|</span>
              {/* Chandigarh University Logo: approx 45-55px high */}
              <FooterLogo src={siteConfig.cuLogoUrl} fallbackText="Chandigarh University" height="48px" />
            </div>

            <div className="space-y-1">
              <span className="font-display font-bold text-white text-xs block leading-tight">
                AWS Student Builder Group
              </span>
              <span className="text-[10px] text-slate-400 font-sans block">
                at Chandigarh University – Uttar Pradesh
              </span>
            </div>
            
            <p className="text-[10px] text-slate-400 font-sans">
              Student-led technology community.
            </p>
          </div>

          {/* Column 2: COMMUNITY */}
          <div className="space-y-2">
            <h4 className="font-display font-bold text-white text-[11px] uppercase tracking-wider">
              Community
            </h4>
            <ul className="space-y-1.5 text-[11px] font-sans text-slate-400">
              <li>
                <Link href="/about" className="hover:text-aws-orange transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/activities" className="hover:text-aws-orange transition-colors">
                  Activities
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-aws-orange transition-colors">
                  Events
                </Link>
              </li>
              <li>
                <Link href="/leadership" className="hover:text-aws-orange transition-colors">
                  Leadership
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: RESOURCES */}
          <div className="space-y-2">
            <h4 className="font-display font-bold text-white text-[11px] uppercase tracking-wider">
              Resources
            </h4>
            <ul className="space-y-1.5 text-[11px] font-sans text-slate-400">
              <li>
                <Link href="/resources" className="hover:text-aws-orange transition-colors">
                  Resources
                </Link>
              </li>
              <li>
                <Link href="/verification" className="hover:text-aws-orange transition-colors">
                  Verification
                </Link>
              </li>
              <li>
                <Link href="/transparency" className="hover:text-aws-orange transition-colors">
                  Transparency
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-aws-orange transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: CONNECT */}
          <div className="space-y-2">
            <h4 className="font-display font-bold text-white text-[11px] uppercase tracking-wider">
              Connect
            </h4>
            <ul className="space-y-1.5 text-[11px] font-sans text-slate-400">
              <li>
                <Link href="/join" className="hover:text-aws-orange transition-colors">
                  Join Community
                </Link>
              </li>
              <li>
                <Link href="/collaborate" className="hover:text-aws-orange transition-colors">
                  Collaborate
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-aws-orange transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* BOTTOM FOOTER */}
        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left text-[9px] text-slate-505 font-sans">
          <div className="space-y-1">
            <p className="font-bold text-slate-400">AWS Student Builder Group</p>
            <p className="font-bold text-slate-400">Chandigarh University – Uttar Pradesh</p>
            <p className="text-slate-500">
              &copy; {currentYear} AWS Student Builder Group at Chandigarh University – Uttar Pradesh
            </p>
          </div>

          <div className="flex flex-col md:items-end gap-1.5 md:text-right">
            <span className="font-semibold text-slate-400">
              The AWS Student Builder Group at Chandigarh University – Uttar Pradesh is managed by the AWS team at Chandigarh University – Uttar Pradesh.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
