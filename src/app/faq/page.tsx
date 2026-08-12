'use client';

import { useState } from 'react';
import { siteConfig } from '@/data/siteConfig';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    if (openIndex === index) {
      setOpenIndex(null);
    } else {
      setOpenIndex(index);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-12">
      {/* Introduction */}
      <section className="text-center max-w-2xl mx-auto space-y-4">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-display">Answers</span>
        <h1 className="font-display font-extrabold text-3xl text-brand-navy tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-slate-500 font-sans text-xs sm:text-sm leading-relaxed">
          Quick answers to inquiries regarding group standing, university association, AWS listings, and student eligibility.
        </p>
      </section>

      {/* FAQ Accordion List */}
      <section className="space-y-3 max-w-3xl mx-auto">
        {siteConfig.faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="tech-card rounded-lg overflow-hidden bg-white border border-slate-200"
            >
              <button
                onClick={() => toggleFAQ(idx)}
                className="w-full px-5 py-4 flex items-center justify-between text-left focus:outline-none cursor-pointer hover:bg-slate-50 transition-colors"
                aria-expanded={isOpen}
              >
                <span className="font-display font-bold text-slate-900 text-xs sm:text-sm pr-4">
                  {faq.question}
                </span>
                <span className={`flex-shrink-0 ml-2 text-aws-orange transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : 'rotate-0'
                }`}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              <div
                className={`transition-all duration-250 ease-in-out ${
                  isOpen ? 'max-h-96 border-t border-slate-100' : 'max-h-0 overflow-hidden'
                }`}
              >
                <div className="px-5 py-4 text-xs text-slate-600 font-sans leading-relaxed bg-slate-50">
                  {faq.answer}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Direct Contact CTA */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 text-center max-w-md mx-auto space-y-2">
        <h4 className="font-display font-bold text-slate-900 text-xs uppercase tracking-wider">Have more questions?</h4>
        <p className="text-xs text-slate-500 font-sans leading-relaxed">
          If your question is not answered above, please contact our student organizing committee.
        </p>
        <a
          href={siteConfig.safeEmailLink}
          className="inline-flex text-xs font-bold text-brand-navy hover:text-aws-orange gap-1 font-mono mt-1"
        >
          Email: {siteConfig.email}
        </a>
      </section>
    </div>
  );
}
