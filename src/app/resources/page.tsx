'use client';

import { useState } from 'react';
import { siteConfig } from '@/data/siteConfig';

export default function Resources() {
  const categories = [
    'All',
    'AWS Cloud',
    'AI',
    'Machine Learning',
    'Data Science',
    'DevOps',
    'Cybersecurity',
    'Generative AI'
  ];

  const [activeTab, setActiveTab] = useState('All');

  const getCategoryFromTitle = (title: string): string => {
    const t = title.toLowerCase();
    if (t.includes('generative ai') || t.includes('bedrock')) return 'Generative AI';
    if (t.includes('machine learning') || t.includes('sagemaker')) return 'Machine Learning';
    if (t.includes('security') || t.includes('identity')) return 'Cybersecurity';
    if (t.includes('devops') || t.includes('terraform') || t.includes('well-architected')) return 'DevOps';
    if (t.includes('data') || t.includes('analytics')) return 'Data Science';
    if (t.includes('academy') || t.includes('essentials')) return 'AWS Cloud';
    return 'AI';
  };

  const filteredResources = siteConfig.resources.filter((res) => {
    if (activeTab === 'All') return true;
    const cat = getCategoryFromTitle(res.title);
    if (activeTab === 'AI' && cat === 'Artificial Intelligence') return true;
    return cat === activeTab;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-12">
      {/* Introduction */}
      <section className="max-w-3xl">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-display">Technical Documentation</span>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-navy tracking-tight mt-1">
          AWS & Technology Learning Resources
        </h1>
        <p className="mt-4 text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
          Access curated technical guides, whitepapers, and official course outlines. We prioritize official documentation.
        </p>
        <div className="h-[2px] w-12 bg-aws-orange mt-4"></div>
      </section>

      {/* Filter Tabs */}
      <section className="space-y-4">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-display">Select Domain</span>
        <div className="flex flex-wrap gap-2">
          {categories.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold font-sans transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'bg-aws-orange text-brand-navy'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {/* Resources Grid */}
      <section className="space-y-10">
        {filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((res, idx) => {
              const difficultyBadge = 
                res.difficulty === 'Beginner' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                  : res.difficulty === 'Intermediate'
                    ? 'bg-amber-50 text-amber-700 border-amber-250'
                    : 'bg-blue-50 text-blue-700 border-blue-250';

              return (
                <div key={idx} className="tech-card rounded-lg p-6 bg-white border border-slate-200 flex flex-col justify-between h-full relative orange-accent-line">
                  <div className="space-y-4 pl-3">
                    <div className="flex justify-between items-center gap-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold font-sans border ${difficultyBadge}`}>
                        {res.difficulty}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-sans">
                        {res.officialSource}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-slate-900 text-sm">
                      {res.title}
                    </h3>
                    
                    <p className="text-xs text-slate-500 font-sans leading-relaxed">
                      {res.description}
                    </p>
                  </div>

                  <div className="mt-8 border-t border-slate-100 pt-4 flex items-center justify-between pl-3">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-display">
                      {getCategoryFromTitle(res.title)}
                    </span>
                    <a
                      href={res.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs font-bold text-brand-navy hover:text-aws-orange transition-colors"
                    >
                      Open Resource &rarr;
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="tech-card rounded-lg p-12 text-center bg-white border border-slate-200 max-w-md mx-auto">
            <p className="text-slate-500 text-xs font-sans mb-4">No documentation items listed under this category yet.</p>
            <button 
              onClick={() => setActiveTab('All')}
              className="text-xs text-brand-navy hover:text-aws-orange font-bold font-sans"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
