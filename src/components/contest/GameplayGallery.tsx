'use client';

import { useState, useEffect } from 'react';

interface GalleryItem {
  id: number;
  image: string;
  title: string;
  description: string;
}

const galleryItems: GalleryItem[] = [
  {
    id: 1,
    image: '/contest/gallery-clean-1.png',
    title: '15 levels on one path',
    description: 'Explore the full 15-level progression route across the Security Island terrain.'
  },
  {
    id: 2,
    image: '/contest/gallery-clean-2.png',
    title: 'A new hand every turn',
    description: 'Draw fresh architecture and security cards each turn to counter unexpected dragon attacks.'
  },
  {
    id: 3,
    image: '/contest/gallery-clean-3.png',
    title: 'New cards join your hand',
    description: 'Collect gold security cards like AWS KMS, WAF, and GuardDuty to bolster your cloud defense.'
  },
  {
    id: 4,
    image: '/contest/gallery-clean-4.png',
    title: 'Finish it to win the level',
    description: 'Successfully complete and validate your security architecture to earn stars and top the leaderboard.'
  }
];

export default function GameplayGallery() {
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeLightboxIndex === null) return;
      if (e.key === 'Escape') setActiveLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        setActiveLightboxIndex((prev) => (prev === null ? null : (prev + 1) % galleryItems.length));
      }
      if (e.key === 'ArrowLeft') {
        setActiveLightboxIndex((prev) => (prev === null ? null : (prev - 1 + galleryItems.length) % galleryItems.length));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLightboxIndex]);

  return (
    <section className="relative py-20 bg-[#0B0908] border-b border-[#211713] overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Gallery Heading */}
        <div className="mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F8F2EA] tracking-tight font-display">
            Inside a match
          </h2>
          <p className="text-xs sm:text-sm text-[#B9AAA0] mt-1">
            Click any screenshot to inspect live match cards and architecture boards in full detail.
          </p>
        </div>

        {/* 4-Column Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {galleryItems.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => setActiveLightboxIndex(idx)}
              className="group cursor-pointer flex flex-col space-y-3"
            >
              {/* Clean Screenshot Thumbnail (Pure gameplay without embedded captions) */}
              <div className="relative rounded-2xl overflow-hidden bg-[#18110E] border border-[#3A271E] group-hover:border-[#F5C451]/70 transition-all duration-300 shadow-xl group-hover:shadow-[0_10px_25px_rgba(245,196,81,0.2)]">
                <div className="aspect-[1024/490] w-full overflow-hidden flex items-center justify-center bg-black">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                </div>

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                  <div className="p-2 rounded-full bg-[#0B0908]/80 text-[#F5C451] shadow-md">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Single Clean HTML Caption Below */}
              <p className="text-xs sm:text-sm font-semibold text-[#F8F2EA] group-hover:text-[#F5C451] transition-colors leading-snug">
                {item.title}
              </p>
            </div>
          ))}
        </div>

      </div>

      {/* Lightbox Modal */}
      {activeLightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setActiveLightboxIndex(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#1A120E] border border-[#4A2D19] rounded-2xl overflow-hidden shadow-2xl p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setActiveLightboxIndex(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[#0B0908]/80 text-[#B9AAA0] hover:text-[#F5C451] hover:bg-[#0B0908] focus:outline-none focus:ring-2 focus:ring-[#F5C451]"
              aria-label="Close image preview"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Lightbox Image */}
            <div className="w-full aspect-[1024/490] bg-black rounded-xl overflow-hidden mb-4 flex items-center justify-center">
              <img
                src={galleryItems[activeLightboxIndex].image}
                alt={galleryItems[activeLightboxIndex].title}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Lightbox Caption & Details */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-[#3A271E]">
              <div>
                <h3 className="text-lg font-bold text-[#F8F2EA]">
                  {galleryItems[activeLightboxIndex].title}
                </h3>
                <p className="text-xs sm:text-sm text-[#B9AAA0] mt-0.5">
                  {galleryItems[activeLightboxIndex].description}
                </p>
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() =>
                    setActiveLightboxIndex(
                      (activeLightboxIndex - 1 + galleryItems.length) % galleryItems.length
                    )
                  }
                  className="p-2 rounded-lg bg-[#211713] text-[#F8F2EA] hover:text-[#F5C451] border border-[#3A271E]"
                  aria-label="Previous screenshot"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-xs text-[#B9AAA0] font-mono px-2">
                  {activeLightboxIndex + 1} / {galleryItems.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setActiveLightboxIndex((activeLightboxIndex + 1) % galleryItems.length)
                  }
                  className="p-2 rounded-lg bg-[#211713] text-[#F8F2EA] hover:text-[#F5C451] border border-[#3A271E]"
                  aria-label="Next screenshot"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </section>
  );
}
