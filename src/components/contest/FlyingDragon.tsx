'use client';

import { useState, useEffect, useRef } from 'react';

type FlightTrajectory = 'swoop-dive' | 'soaring-climb' | 's-curve';

export default function FlyingDragon() {
  const [isFlying, setIsFlying] = useState(false);
  const [trajectory, setTrajectory] = useState<FlightTrajectory>('swoop-dive');
  const [reducedMotion, setReducedMotion] = useState(false);
  const flightCount = useRef(0);

  useEffect(() => {
    // Check user preference for reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleMotionChange);

    if (mediaQuery.matches) {
      return () => mediaQuery.removeEventListener('change', handleMotionChange);
    }

    const trajectories: FlightTrajectory[] = ['swoop-dive', 'soaring-climb', 's-curve'];

    const triggerFlight = () => {
      // Pick next trajectory
      const nextTrajectory = trajectories[flightCount.current % trajectories.length];
      flightCount.current += 1;
      setTrajectory(nextTrajectory);
      setIsFlying(true);

      // Flight duration is 5.2s
      setTimeout(() => {
        setIsFlying(false);
      }, 5200);
    };

    // First flight pass after 3.5 seconds
    const initialTimer = setTimeout(triggerFlight, 3500);

    // Natural random interval between 20 and 28 seconds
    const scheduleNextFlight = () => {
      const delay = Math.floor(Math.random() * 8000) + 20000; // 20s - 28s
      return setTimeout(() => {
        triggerFlight();
        intervalTimer = scheduleNextFlight();
      }, delay);
    };

    let intervalTimer = setTimeout(() => {
      intervalTimer = scheduleNextFlight();
    }, 24000);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(intervalTimer);
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  if (reducedMotion || !isFlying) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-35 overflow-hidden select-none"
      style={{ perspective: '1200px' }}
      aria-hidden="true"
    >
      <div className={`flying-dragon-carrier trajectory-${trajectory}`}>
        
        {/* Soft Dynamic Shadow (Projected on page below) */}
        <div className="absolute inset-0 translate-x-8 translate-y-16 scale-90 opacity-35 filter blur-[10px] pointer-events-none">
          <img
            src="/contest/dragon-flight-shadow.png"
            alt=""
            className="w-full h-full object-contain"
          />
        </div>

        {/* 3D Dragon Rig (Width proportional & responsive) */}
        <div className="relative w-[180px] sm:w-[230px] md:w-[280px] aspect-[408/274] will-change-transform">
          
          {/* Upper Left Wing (Flapping around shoulder joint) */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none wing-left-animated"
            style={{ transformOrigin: '43.3% 51.8%' }}
          >
            <img
              src="/contest/dragon-flight-wing-left.png"
              alt=""
              className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
            />
          </div>

          {/* Dragon Torso, Head, Spine, and Tail */}
          <div className="absolute inset-0 w-full h-full pointer-events-none body-animated">
            <img
              src="/contest/dragon-flight-body.png"
              alt=""
              className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]"
            />
          </div>

          {/* Lower Right Wing (Flapping synchronously around shoulder joint) */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none wing-right-animated"
            style={{ transformOrigin: '50.8% 67.7%' }}
          >
            <img
              src="/contest/dragon-flight-wing-right.png"
              alt=""
              className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
            />
          </div>

          {/* Golden & Orange Fiery Ember Particles trailing the dragon */}
          <div className="absolute left-[15%] top-[65%] w-2.5 h-2.5 bg-[#F5C451] rounded-full blur-[1px] opacity-80 animate-ping" />
          <div className="absolute left-[20%] top-[60%] w-2 h-2 bg-[#E98B32] rounded-full blur-[1px] opacity-70 animate-pulse" />
          <div className="absolute left-[10%] top-[70%] w-1.5 h-1.5 bg-[#F5C451] rounded-full opacity-60" />

        </div>
      </div>

      <style jsx>{`
        /* Flight Carrier Positioning and Trajectories */
        .flying-dragon-carrier {
          position: absolute;
          will-change: transform, opacity;
          pointer-events: none;
        }

        /* TRAJECTORY 1: SWOOP DIVE (Top-Right to Bottom-Left) */
        .trajectory-swoop-dive {
          animation: flightSwoopDive 5.2s cubic-bezier(0.38, 0.05, 0.32, 1) forwards;
        }

        @keyframes flightSwoopDive {
          0% {
            transform: translate3d(115vw, 8vh, 100px) rotate(182deg) rotateX(15deg) scale(0.65);
            opacity: 0;
          }
          10% {
            opacity: 0.98;
          }
          35% {
            transform: translate3d(70vw, 24vh, 180px) rotate(175deg) rotateX(20deg) scale(0.9);
          }
          65% {
            transform: translate3d(32vw, 44vh, 220px) rotate(168deg) rotateX(25deg) scale(1.05);
          }
          85% {
            opacity: 0.98;
          }
          100% {
            transform: translate3d(-28vw, 68vh, 80px) rotate(162deg) rotateX(15deg) scale(0.72);
            opacity: 0;
          }
        }

        /* TRAJECTORY 2: SOARING CLIMB (Bottom-Left to Top-Right) */
        .trajectory-soaring-climb {
          animation: flightSoaringClimb 5.0s cubic-bezier(0.35, 0.1, 0.25, 1) forwards;
        }

        @keyframes flightSoaringClimb {
          0% {
            transform: translate3d(-25vw, 75vh, 60px) rotate(2deg) rotateX(-15deg) scale(0.68);
            opacity: 0;
          }
          12% {
            opacity: 0.98;
          }
          40% {
            transform: translate3d(28vw, 50vh, 180px) rotate(6deg) rotateX(-20deg) scale(0.92);
          }
          70% {
            transform: translate3d(72vw, 28vh, 200px) rotate(-2deg) rotateX(-18deg) scale(1.02);
          }
          88% {
            opacity: 0.98;
          }
          100% {
            transform: translate3d(120vw, 10vh, 80px) rotate(-6deg) rotateX(-10deg) scale(0.75);
            opacity: 0;
          }
        }

        /* TRAJECTORY 3: S-CURVE CROSSING */
        .trajectory-s-curve {
          animation: flightSCurve 5.2s cubic-bezier(0.42, 0.05, 0.35, 1) forwards;
        }

        @keyframes flightSCurve {
          0% {
            transform: translate3d(115vw, -5vh, 80px) rotate(190deg) rotateX(12deg) scale(0.62);
            opacity: 0;
          }
          10% {
            opacity: 0.98;
          }
          30% {
            transform: translate3d(75vw, 18vh, 160px) rotate(178deg) rotateX(24deg) scale(0.85);
          }
          55% {
            transform: translate3d(40vw, 36vh, 230px) rotate(162deg) rotateX(28deg) scale(1.08);
          }
          80% {
            transform: translate3d(8vw, 56vh, 160px) rotate(172deg) rotateX(18deg) scale(0.9);
            opacity: 0.98;
          }
          100% {
            transform: translate3d(-30vw, 78vh, 60px) rotate(180deg) rotateX(10deg) scale(0.68);
            opacity: 0;
          }
        }

        /* REALISTIC BIOLOGICAL WING FLAP ANIMATIONS */
        .wing-left-animated {
          animation: flapLeftWing 0.44s ease-in-out infinite;
        }

        @keyframes flapLeftWing {
          0%, 100% {
            transform: rotate3d(1, 0.3, 0, 16deg) scaleY(1);
          }
          32% {
            /* Upstroke: wing folds slightly, tilts upward, foreshortened */
            transform: rotate3d(1, 0.4, 0, -32deg) scaleY(0.72) translateY(-5px);
          }
          68% {
            /* Downstroke: wing sweeps broadly down pushing air */
            transform: rotate3d(1, 0.2, 0, 24deg) scaleY(1.08) translateY(4px);
          }
        }

        .wing-right-animated {
          animation: flapRightWing 0.44s ease-in-out infinite;
        }

        @keyframes flapRightWing {
          0%, 100% {
            transform: rotate3d(1, -0.3, 0, -16deg) scaleY(1);
          }
          32% {
            /* Upstroke: matching fold */
            transform: rotate3d(1, -0.4, 0, 32deg) scaleY(0.72) translateY(5px);
          }
          68% {
            /* Downstroke: matching broad beat */
            transform: rotate3d(1, -0.2, 0, -24deg) scaleY(1.08) translateY(-4px);
          }
        }

        /* BODY UNDULATION (Heaves dynamically with wing beats) */
        .body-animated {
          animation: dragonBodyHeave 0.44s ease-in-out infinite;
        }

        @keyframes dragonBodyHeave {
          0%, 100% {
            transform: translate3d(0, 0, 0) rotate(0deg);
          }
          32% {
            /* Torso dips slightly as wings lift */
            transform: translate3d(0, 2.5px, 0) rotate(-1.2deg);
          }
          68% {
            /* Torso lifts on downstroke */
            transform: translate3d(0, -2.5px, 0) rotate(1.2deg);
          }
        }
      `}</style>
    </div>
  );
}
