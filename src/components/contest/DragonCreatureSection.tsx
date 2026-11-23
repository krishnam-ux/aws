'use client';

import { useState, useRef, useEffect } from 'react';

export default function DragonCreatureSection() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Autoplay muted without sound for cross-browser & mobile compatibility
    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <section id="dragon" className="relative py-24 bg-[#0B0908] border-b border-[#211713] overflow-hidden">
      
      {/* Warm fiery back lighting */}
      <div 
        className="pointer-events-none absolute right-10 top-1/4 w-[500px] h-[500px] bg-gradient-to-br from-[#E98B32]/15 to-[#381F0E]/10 rounded-full blur-[140px]" 
        aria-hidden="true" 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-2xl space-y-4 mb-12">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#F5C451]">
            THE ISLAND&apos;S CREATURE
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#F8F2EA] tracking-tight font-display">
            Watch out for the dragon
          </h2>
          <div className="space-y-4 text-base sm:text-lg text-[#B9AAA0] leading-relaxed">
            <p>
              Every island in AWS Card Clash has a creature. The Security Island has a dragon, and it grows restless with every card you move.
            </p>
            <p>
              When it attacks, it guards one service on each player&apos;s board and removes another. Plan your next turn around it.
            </p>
          </div>
        </div>

        {/* 2-Column Showcase: Left 3D Dragon Model & Right Uncropped Video */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left: 3D Dragon Character (Clean transparent cutout without embedded text) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            
            {/* Dynamic radial glow */}
            <div 
              className="absolute inset-0 bg-radial from-[#F5C451]/15 via-transparent to-transparent rounded-full blur-2xl transform scale-90" 
              aria-hidden="true" 
            />

            <div className="relative z-10 w-full max-w-[420px] transition-transform duration-500 hover:scale-105">
              <img
                src="/contest/dragon-creature-clean.png"
                alt="3D Security Island Dragon in battle stance"
                className="w-full h-auto object-contain filter drop-shadow-[0_25px_35px_rgba(0,0,0,0.9)] animate-[bounce_5s_ease-in-out_infinite]"
              />

              {/* Glowing Dragon Eyes Effect */}
              <div 
                className="absolute top-[48%] right-[28%] w-2 h-2 bg-[#F5C451] rounded-full blur-[1px] shadow-[0_0_8px_#F5C451] animate-pulse pointer-events-none" 
                aria-hidden="true" 
              />
            </div>

          </div>

          {/* Right: Uncropped Gameplay Video Preview with Exact 21:10 Aspect Ratio */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            
            <div className="relative rounded-2xl overflow-hidden bg-[#18110E] border-2 border-[#3A271E] shadow-2xl group">
              
              {/* Native 1280x612 Aspect Ratio container ensures ZERO unwanted cropping */}
              <div 
                onClick={togglePlay}
                className="relative w-full aspect-[1280/612] overflow-hidden bg-black flex items-center justify-center cursor-pointer"
              >
                <video
                  ref={videoRef}
                  src="/contest/dragon-attack.mp4"
                  poster="/contest/gameplay-video-frame.png"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className={`w-full h-full object-contain transition-transform duration-700 ${
                    isPlaying ? 'scale-100' : 'scale-100 grayscale-[15%]'
                  }`}
                />

                {/* Subtle Centered Play Icon when Paused */}
                {!isPlaying && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-[#0B0908]/85 border-2 border-[#F5C451] text-[#F5C451] flex items-center justify-center shadow-[0_0_20px_rgba(245,196,81,0.4)] animate-in fade-in zoom-in duration-200">
                      <svg className="w-8 h-8 fill-current ml-1" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Interactive Pause / Play Video Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className="absolute bottom-4 right-4 z-20 inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[#0B0908]/85 hover:bg-[#0B0908] border border-[#3A271E] hover:border-[#F5C451]/60 text-xs font-bold text-[#F8F2EA] backdrop-blur-md transition-all duration-200 active:scale-95 shadow-lg focus:outline-none focus:ring-2 focus:ring-[#F5C451]"
                  aria-label={isPlaying ? 'Pause gameplay video' : 'Play gameplay video'}
                >
                  {isPlaying ? (
                    <>
                      <svg className="w-3.5 h-3.5 fill-current text-[#F5C451]" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                      </svg>
                      <span>Pause video</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 fill-current text-[#F5C451]" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      <span>Play video</span>
                    </>
                  )}
                </button>

                {/* Live Match HUD Watermark */}
                <div className="absolute top-4 left-4 z-20 px-3 py-1 rounded-md bg-[#0B0908]/75 backdrop-blur-sm border border-[#3A271E] text-[10px] font-mono text-[#F5C451]">
                  BLOCK CYBERSECURITY THREATS
                </div>

              </div>

            </div>

            {/* Subtitle Caption */}
            <p className="text-xs sm:text-sm text-[#B9AAA0] text-center lg:text-left italic">
              Game footage, no sound: the dragon flies over the board and breathes fire across the architecture.
            </p>

          </div>

        </div>

      </div>
    </section>
  );
}
