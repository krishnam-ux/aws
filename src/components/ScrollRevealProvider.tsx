'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ScrollRevealProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Preserve admin dashboard and active proctored exam sessions without scroll-reveal alteration
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/exam/')) {
      return;
    }

    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Small delay to ensure the DOM for the new route has finished mounting
    const timer = setTimeout(() => {
      const main = document.querySelector('main');
      if (!main) return;

      if (isReducedMotion) {
        // Immediately reveal all elements without motion
        const elements = main.querySelectorAll('.reveal, .reveal-fade, .reveal-scale, [data-reveal]');
        elements.forEach((el) => el.classList.add('is-revealed'));
        return;
      }

      // 1. Automatically enhance content sections and card grids across public pages
      const sections = main.querySelectorAll('section:not(.no-reveal)');
      sections.forEach((sec) => {
        if (!sec.classList.contains('reveal') && !sec.classList.contains('is-revealed')) {
          sec.classList.add('reveal');
        }

        // Apply staggered reveals to child grids if present
        const grids = sec.querySelectorAll('.grid');
        grids.forEach((grid) => {
          const items = Array.from(grid.children);
          items.forEach((item, idx) => {
            if (!item.classList.contains('no-reveal')) {
              item.classList.add('reveal');
              const staggerIndex = (idx % 8) + 1;
              item.classList.add(`stagger-${staggerIndex}`);
            }
          });
        });
      });

      // 2. Discover all reveal elements
      const revealElements = main.querySelectorAll('.reveal, .reveal-fade, .reveal-scale, [data-reveal]');

      if (!('IntersectionObserver' in window)) {
        revealElements.forEach((el) => el.classList.add('is-revealed'));
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              observer.unobserve(entry.target);
            }
          });
        },
        {
          root: null,
          rootMargin: '0px 0px -30px 0px',
          threshold: 0.05,
        }
      );

      revealElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // If element is already in the viewport on initial page load, reveal immediately
        if (rect.top < window.innerHeight * 0.85 && rect.bottom > 0) {
          el.classList.add('is-revealed');
        } else {
          observer.observe(el);
        }
      });

      return () => {
        observer.disconnect();
      };
    }, 60);

    return () => clearTimeout(timer);
  }, [pathname]);

  return <>{children}</>;
}

/**
 * Reusable component for wrapping specific elements with scroll-reveal animations.
 */
export function ScrollReveal({
  children,
  className = '',
  animation = 'up',
  stagger = 0,
}: {
  children: React.ReactNode;
  className?: string;
  animation?: 'up' | 'fade' | 'scale';
  stagger?: number;
}) {
  const animClass =
    animation === 'fade' ? 'reveal-fade' : animation === 'scale' ? 'reveal-scale' : 'reveal';
  const staggerClass = stagger > 0 ? `stagger-${Math.min(stagger, 8)}` : '';

  return (
    <div className={`${animClass} ${staggerClass} ${className}`.trim()}>
      {children}
    </div>
  );
}
