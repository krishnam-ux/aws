'use client';

export default function PrizeSection() {
  const benefits = [
    {
      title: 'A free certification exam.',
      detail: 'The voucher covers the 100 USD exam fee.'
    },
    {
      title: 'An industry-recognized credential.',
      detail: 'AWS Certified AI Practitioner validates foundational knowledge of AI, machine learning and generative AI on AWS.'
    },
    {
      title: 'Take it your way.',
      detail: 'Sit the exam online with a proctor or at a Pearson VUE test center.'
    }
  ];

  return (
    <section id="contest" className="relative py-24 bg-[#0B0908] border-b border-[#211713] overflow-hidden">
      
      {/* Golden glow aura behind trophy */}
      <div 
        className="pointer-events-none absolute left-10 top-1/3 w-[450px] h-[450px] bg-gradient-to-br from-[#F5C451]/15 to-[#E98B32]/10 rounded-full blur-[130px]" 
        aria-hidden="true" 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left: Trophy Graphic, Golden Exam Voucher Ticket & Certification Badge */}
          <div className="lg:col-span-5 flex items-center justify-center relative">
            <div className="relative w-full max-w-[440px] group transition-transform duration-500 hover:scale-105">
              
              {/* Radial backdrop */}
              <div 
                className="absolute inset-0 bg-radial from-[#F5C451]/20 via-transparent to-transparent rounded-full blur-2xl transform scale-105" 
                aria-hidden="true" 
              />

              <img
                src="/contest/prize-graphic-blended.png"
                alt="AWS Certified AI Practitioner Exam Voucher Winner Ticket and Gold Trophy"
                className="w-full h-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)] filter"
              />

              {/* Shimmer sparkle */}
              <div 
                className="absolute top-10 right-12 w-3 h-3 bg-white rounded-full blur-[1px] animate-ping" 
                aria-hidden="true" 
              />
            </div>
          </div>

          {/* Right: Contest Title, Description & 3 Dark Cards */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            
            {/* Date Tag */}
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#F5C451]">
              NOVEMBER 24 TO DECEMBER 4, 2026
            </span>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#F8F2EA] tracking-tight font-display leading-[1.15]">
              The first Security Island contest
            </h2>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-[#B9AAA0] leading-relaxed">
              Play the Security Island levels and others against the AI and climb the leaderboard. When the contest ends, the top players win a voucher for the AWS Certified AI Practitioner exam.
            </p>

            {/* 3 Dark Benefit Cards */}
            <div className="space-y-4 pt-2">
              {benefits.map((b, i) => (
                <div
                  key={i}
                  className="flex items-start space-x-4 p-4 sm:p-5 rounded-2xl bg-[#211713]/80 border border-[#3A271E] hover:border-[#F5C451]/50 transition-all duration-300 shadow-lg hover:shadow-[0_8px_20px_rgba(245,196,81,0.12)] hover:-translate-y-0.5"
                >
                  {/* Glowing Gold Bullet */}
                  <div className="w-3.5 h-3.5 rounded-full bg-[#F5C451] flex-shrink-0 mt-1 shadow-[0_0_8px_#F5C451]" />

                  {/* Benefit Text */}
                  <div className="text-sm sm:text-base text-[#B9AAA0] leading-snug">
                    <strong className="text-[#F8F2EA] font-semibold">{b.title}</strong>{' '}
                    <span>{b.detail}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Callout */}
            <div className="pt-2 flex items-center space-x-3 text-xs text-[#F5C451]">
              <span>⭐</span>
              <span className="font-medium">
                Vouchers will be awarded to eligible top leaderboard participants upon verification.
              </span>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
