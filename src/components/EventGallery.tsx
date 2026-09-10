'use client';

import { useState, useEffect, useCallback } from 'react';

export interface EventPhoto {
  id: string;
  url: string;
  caption?: string;
  uploadedAt?: string;
}

interface EventGalleryProps {
  photos: EventPhoto[];
  eventTitle?: string;
  className?: string;
  showSectionHeader?: boolean;
}

export default function EventGallery({
  photos,
  eventTitle = 'Event',
  className = '',
  showSectionHeader = true
}: EventGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [imageLoading, setImageLoading] = useState<boolean>(true);

  const hasPhotos = Array.isArray(photos) && photos.length > 0;

  const openLightbox = (index: number) => {
    setImageLoading(true);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const prevPhoto = useCallback(() => {
    if (lightboxIndex === null || !hasPhotos) return;
    setImageLoading(true);
    setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length);
  }, [lightboxIndex, hasPhotos, photos.length]);

  const nextPhoto = useCallback(() => {
    if (lightboxIndex === null || !hasPhotos) return;
    setImageLoading(true);
    setLightboxIndex((lightboxIndex + 1) % photos.length);
  }, [lightboxIndex, hasPhotos, photos.length]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        prevPhoto();
      } else if (e.key === 'ArrowRight') {
        nextPhoto();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Prevent scrolling behind modal
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [lightboxIndex, prevPhoto, nextPhoto]);

  if (!hasPhotos) {
    return null;
  }

  const currentPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {showSectionHeader && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center space-x-2">
            <svg
              className="h-4 w-4 text-aws-orange"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            <h4 className="font-display font-bold text-slate-900 text-xs uppercase tracking-wider">
              Event Gallery
            </h4>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-aws-orange border border-orange-200">
            {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'}
          </span>
        </div>
      )}

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((photo, index) => (
          <button
            key={photo.id || index}
            type="button"
            onClick={() => openLightbox(index)}
            aria-label={`View photo ${index + 1} of ${photos.length}`}
            className="group relative block aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100 border border-slate-200 hover:border-aws-orange focus:outline-none focus:ring-2 focus:ring-aws-orange/40 transition-all duration-200 cursor-pointer text-left"
          >
            <img
              src={photo.url}
              alt={photo.caption || `${eventTitle} highlight photo ${index + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            
            {/* Hover overlay with zoom icon */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5">
              <div className="self-end">
                <span className="p-1 rounded-full bg-white/80 text-slate-900 backdrop-blur-xs flex items-center justify-center shadow-xs">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                  </svg>
                </span>
              </div>
              {photo.caption && (
                <p className="text-[10px] text-white font-medium line-clamp-1 drop-shadow-xs">
                  {photo.caption}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox / Modal Viewer */}
      {lightboxIndex !== null && currentPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 select-none animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-label="Photo Lightbox"
          onClick={closeLightbox}
        >
          {/* Top Bar Controls */}
          <div
            className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-aws-orange text-white">
                  Event Gallery
                </span>
                <span className="text-xs text-slate-300 font-mono font-medium">
                  {lightboxIndex + 1} / {photos.length}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-display font-medium truncate max-w-xs sm:max-w-md">
                {eventTitle}
              </p>
            </div>

            <button
              onClick={closeLightbox}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-aws-orange"
              aria-label="Close photo viewer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Previous Arrow Button */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevPhoto();
              }}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer backdrop-blur-xs z-10 focus:outline-none focus:ring-2 focus:ring-aws-orange"
              aria-label="Previous photo"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}

          {/* Main Image Container */}
          <div
            className="relative max-w-5xl max-h-[75vh] sm:max-h-[80vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden rounded-lg shadow-2xl border border-white/10 bg-black/40">
              <img
                src={currentPhoto.url}
                alt={currentPhoto.caption || `${eventTitle} photo ${lightboxIndex + 1}`}
                onLoad={() => setImageLoading(false)}
                className={`max-w-full max-h-[70vh] sm:max-h-[75vh] object-contain transition-opacity duration-200 ${
                  imageLoading ? 'opacity-40' : 'opacity-100'
                }`}
              />
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 border-3 border-aws-orange border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Bottom Caption Display */}
            {currentPhoto.caption && (
              <div className="mt-3 px-4 py-2 rounded bg-black/60 backdrop-blur-xs border border-white/10 text-center max-w-xl">
                <p className="text-xs sm:text-sm text-slate-100 font-sans font-medium">
                  {currentPhoto.caption}
                </p>
              </div>
            )}
          </div>

          {/* Next Arrow Button */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextPhoto();
              }}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer backdrop-blur-xs z-10 focus:outline-none focus:ring-2 focus:ring-aws-orange"
              aria-label="Next photo"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}

          {/* Bottom Thumbnails Strip */}
          {photos.length > 1 && (
            <div
              className="absolute bottom-3 left-0 right-0 px-4 flex justify-center items-center space-x-2 overflow-x-auto py-2 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {photos.map((photo, index) => (
                <button
                  key={photo.id || index}
                  onClick={() => {
                    setImageLoading(true);
                    setLightboxIndex(index);
                  }}
                  className={`h-11 w-14 rounded overflow-hidden border transition-all cursor-pointer flex-shrink-0 ${
                    index === lightboxIndex
                      ? 'border-aws-orange ring-2 ring-aws-orange scale-105 opacity-100'
                      : 'border-white/20 opacity-50 hover:opacity-80'
                  }`}
                  aria-label={`Jump to photo ${index + 1}`}
                >
                  <img src={photo.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
