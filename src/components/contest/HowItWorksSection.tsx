'use client';

export default function HowItWorksSection() {
  const steps = [
    {
      num: 1,
      title: 'Play the Security Island',
      description: 'Win its 15 levels against the AI, on your phone or the web.'
    },
    {
      num: 2,
      title: 'Earn up to 45 stars',
      description: 'Each level you win gives up to three stars.'
    },
    {
      num: 3,
      title: 'Top the leaderboard',
      description: 'Most stars wins. Your score breaks ties.'
    }
  ];

  const badges = [
    'Nov 23 to Dec 4, 2026 (UTC)',
    'Free with AWS Skill Builder',
    'Ages 18+, eligible countries',
    'iOS, Android and web'
  ];

  return (
    <section className="relative py-24 bg-[#0B0908] border-b border-[#211713] overflow-hidden">
      
      {/* Background warm lighting */}
      <div 
        className="pointer-events-none absolute right-10 top-1/4 w-[450px] h-[450px] bg-amber-600/10 rounded-full blur-[140px]" 
        aria-hidden="true" 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F8F2EA] tracking-tight font-display">
            How it works
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left: 3 Steps + Pill Badges */}
          <div className="lg:col-span-6 flex flex-col space-y-8">
            
            {/* Step 1, 2, 3 */}
            <div className="space-y-6">
              {steps.map((s) => (
                <div key={s.num} className="flex items-start space-x-4 sm:space-x-5 group">
                  {/* Number Badge */}
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-[#F5C451] to-[#E98B32] text-[#0B0908] font-mono font-bold text-base sm:text-lg flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(245,196,81,0.4)] group-hover:scale-110 transition-transform">
                    {s.num}
                  </div>

                  {/* Step Content */}
                  <div className="flex flex-col space-y-1 pt-0.5">
                    <h3 className="text-base sm:text-lg font-bold text-[#F8F2EA]">
                      {s.title}
                    </h3>
                    <p className="text-sm sm:text-base text-[#B9AAA0] leading-relaxed">
                      {s.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pill Badges Grid */}
            <div className="pt-4 flex flex-wrap gap-2.5">
              {badges.map((b, i) => (
                <span
                  key={i}
                  className="px-4 py-2 rounded-full bg-[#18110E] border border-[#3A271E] text-xs sm:text-sm font-medium text-[#F8F2EA] hover:border-[#F5C451]/60 transition-colors shadow-sm"
                >
                  {b}
                </span>
              ))}
            </div>

          </div>

          {/* Right: Character Celebration Image */}
          <div className="lg:col-span-6 flex items-center justify-center">
            <div className="relative w-full max-w-[560px] rounded-2xl overflow-hidden bg-[#18110E]/40 border border-[#3A271E] p-2 shadow-2xl group hover:border-[#F5C451]/50 transition-all duration-300">
              <img
                src="/contest/characters-celebration.png"
                alt="AWS Card Clash Character Celebration: Kong, ducks, dragon, and octopus professor with confetti"
                className="w-full h-auto aspect-[1024/576] object-cover rounded-xl transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
