'use client';

import { useState } from 'react';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    id: 1,
    question: 'Is it free?',
    answer: 'Yes. AWS Card Clash and the contest are free. You need a free AWS Skill Builder account.'
  },
  {
    id: 2,
    question: 'Can I play on a computer?',
    answer: 'Yes. The contest runs on iOS, Android and the web, with one account and one leaderboard.'
  },
  {
    id: 3,
    question: 'How are winners chosen?',
    answer: 'The leaderboard ranks players by total stars first and then by score. The official rules explain ties and how winners are confirmed.'
  },
  {
    id: 4,
    question: 'How do winners get their prize?',
    answer: 'Winners see their prize inside the app when they open their contest results.'
  },
  {
    id: 5,
    question: 'Which languages can I play in?',
    answer: 'AWS Card Clash is available in 8 languages: English, French, Italian, Japanese, Korean, Portuguese, Simplified Chinese and Spanish.'
  }
];

export default function FAQSection() {
  const [openId, setOpenId] = useState<number | null>(null);

  const toggle = (id: number) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="relative py-24 bg-[#0B0908] border-b border-[#211713] overflow-hidden">
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="mb-12">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#F5C451]">
            COMMON QUESTIONS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F8F2EA] tracking-tight font-display mt-2">
            Frequently Asked Questions
          </h2>
        </div>

        {/* Accordion List */}
        <div className="divide-y divide-[#2A1D17] border-t border-b border-[#2A1D17]">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div key={faq.id} className="py-6 transition-colors">
                <button
                  type="button"
                  onClick={() => toggle(faq.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between text-left focus:outline-none group"
                >
                  <span className={`text-base sm:text-lg font-bold transition-colors pr-6 ${
                    isOpen ? 'text-[#F5C451]' : 'text-[#F8F2EA] group-hover:text-[#F5C451]'
                  }`}>
                    {faq.question}
                  </span>

                  {/* Gold minus / plus indicator */}
                  <span className="text-xl sm:text-2xl font-mono text-[#F5C451] flex-shrink-0 transition-transform duration-200">
                    {isOpen ? '—' : '+'}
                  </span>
                </button>

                {isOpen && (
                  <div className="pt-4 pr-12 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-sm sm:text-base text-[#B9AAA0] leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
