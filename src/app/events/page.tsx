'use client';

import { useState } from 'react';
import { siteConfig } from '@/data/siteConfig';
import EmptyState from '@/components/EmptyState';

export default function Events() {
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Ongoing' | 'Completed'>('Upcoming');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
      {/* Introduction */}
      <section className="max-w-3xl">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-display">Schedule Log</span>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-navy tracking-tight leading-tight mt-1">
          Community Events
        </h1>
        <p className="mt-4 text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
          Track upcoming technical webcasts, panel discussions, and coding study groups.
        </p>
        <div className="h-[2px] w-12 bg-aws-orange mt-4"></div>
      </section>

      {/* Tabs */}
      <section className="space-y-6">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {(['Upcoming', 'Ongoing', 'Completed'] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                    isActive
                      ? 'border-aws-orange text-aws-orange'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Contents */}
        <div className="py-6">
          {activeTab === 'Upcoming' && (
            <EmptyState 
              title="No upcoming events have been published yet" 
              description="Our event schedules are awaiting department clearances. Confirmed events will list speaker outlines, registration links, and topics." 
              badgeText="Schedule Status"
            />
          )}

          {activeTab === 'Ongoing' && (
            <div className="tech-card rounded-lg p-8 text-center bg-white border border-slate-200 max-w-md mx-auto">
              <p className="text-xs text-slate-500 font-sans">No live or ongoing sessions are currently active.</p>
            </div>
          )}

          {activeTab === 'Completed' && (
            <div className="tech-card rounded-lg p-8 text-center bg-white border border-slate-200 max-w-md mx-auto">
              <p className="text-xs text-slate-500 font-sans">Completed session logs will populate our community archive post-launch.</p>
            </div>
          )}
        </div>
      </section>

      {/* Event Schema Framework (Factual reference of what will be supported) */}
      <section className="bg-slate-50 border border-slate-200 rounded-lg p-6 sm:p-8 max-w-3xl mx-auto space-y-4">
        <h4 className="font-display font-bold text-slate-900 text-xs uppercase tracking-wider">Event Archive Integration</h4>
        <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
          The event registry supports flexible CMS fields. When data is populated, it dynamically displays:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-mono text-slate-600 bg-white p-4 border border-slate-100 rounded">
          <div>&bull; Event Name</div>
          <div>&bull; Date & Time</div>
          <div>&bull; Location</div>
          <div>&bull; Speaker Profile</div>
          <div>&bull; Organizer</div>
          <div>&bull; Description</div>
          <div>&bull; Registration</div>
          <div>&bull; Event Photos</div>
          <div>&bull; Slide Resources</div>
          <div>&bull; Certificate details</div>
        </div>
      </section>
    </div>
  );
}
