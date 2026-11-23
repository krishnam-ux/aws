import Link from 'next/link';

export default function ContestFooter() {
  return (
    <footer className="relative bg-[#080605] text-[#B9AAA0] border-t border-[#211713] py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-6">
        
        {/* Centered AWS Card Clash Logo */}
        <div className="flex flex-col items-center space-y-2">
          <img
            src="/contest/card-clash-logo-clean.png"
            alt="AWS Card Clash"
            className="h-12 w-auto object-contain filter drop-shadow-md"
          />
          <p className="text-xs sm:text-sm text-[#F8F2EA] font-medium tracking-tight">
            AWS Card Clash is a game on AWS Skill Builder.
          </p>
        </div>

        {/* Official Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-semibold">
          <a
            href="https://explore.skillbuilder.aws"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#F5C451] hover:text-[#ffcf66] underline transition-colors"
          >
            AWS Skill Builder
          </a>
          <a
            href="https://aws.amazon.com/privacy/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#F5C451] hover:text-[#ffcf66] underline transition-colors"
          >
            Privacy
          </a>
          <a
            href="https://aws.amazon.com/terms/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#F5C451] hover:text-[#ffcf66] underline transition-colors"
          >
            Site terms
          </a>
        </div>

        {/* Copyright notice */}
        <p className="text-[11px] text-[#B9AAA0]/80">
          © 2026, Amazon Web Services, Inc. or its affiliates. All rights reserved.
        </p>

        {/* Student Builder Group Community Context */}
        <div className="pt-4 border-t border-[#1C1410] max-w-xl text-[10px] sm:text-[11px] text-[#B9AAA0]/60 space-y-2 leading-relaxed">
          <p>
            This contest landing page is hosted by the{' '}
            <strong className="text-[#B9AAA0]">AWS Student Builder Group at Chandigarh University – Uttar Pradesh</strong>{' '}
            to guide students participating in the global AWS Card Clash challenge.
          </p>
          <p>
            <Link href="/" className="text-[#F5C451]/80 hover:text-[#F5C451] transition-colors underline">
              Return to Chandigarh University Community Portal
            </Link>
          </p>
        </div>

      </div>
    </footer>
  );
}
