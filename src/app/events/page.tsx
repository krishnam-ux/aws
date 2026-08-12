'use client';

import { useState } from 'react';
import { siteConfig } from '@/data/siteConfig';

interface CommunityEvent {
  number: string;
  month: string;
  title: string;
  focus: string;
  outcome: string;
}

export default function Events() {
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Ongoing' | 'Completed'>('Upcoming');

  const upcomingEvents: CommunityEvent[] = [
    {
      number: 'Event 01',
      month: 'August',
      title: 'AWS Student Builder Group Inauguration & Cloud Kickstart',
      focus: 'Community Launch, Cloud Computing, AWS Fundamentals, Live Demo',
      outcome: 'Students understand cloud fundamentals, join the community, and create an AWS Skill Builder account.'
    },
    {
      number: 'Event 02',
      month: 'September',
      title: 'AWS Core Services Workshop',
      focus: 'IAM, EC2, S3, AWS Console, Static Website Hosting',
      outcome: 'Students deploy their first static website on AWS and understand core AWS services.'
    },
    {
      number: 'Event 03',
      month: 'November',
      title: 'Build with AI on AWS',
      focus: 'Generative AI, Amazon Bedrock, Amazon Q, Prompt Engineering',
      outcome: 'Students build a simple AI-powered application and understand AI services on AWS.'
    },
    {
      number: 'Event 04',
      month: 'January',
      title: 'Build Modern Applications with AWS (Serverless)',
      focus: 'AWS Lambda, API Gateway, S3 Events, Event-Driven Architecture',
      outcome: 'Students create their first serverless application and learn modern cloud architecture.'
    },
    {
      number: 'Event 05',
      month: 'February',
      title: 'AWS Cloud Practitioner Certification Workshop & Mock Exam',
      focus: 'Certification Strategy, AWS Service Revision, Mock Test, Career Guidance',
      outcome: 'Students assess their certification readiness and create a structured learning plan.'
    },
    {
      number: 'Event 06',
      month: 'April',
      title: 'AWS Buildathon',
      focus: 'Team-Based Innovation, AWS Services, AI, Cloud Solutions, Project Presentation',
      outcome: 'Students build and present a real-world cloud solution using AWS services.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
      {/* Introduction */}
      <section className="max-w-3xl">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-display">Schedule Log</span>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-navy tracking-tight leading-tight mt-1">
          Community Events
        </h1>
        <p className="mt-4 text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
          Track upcoming technical workshops, builder bootcamps, and cloud learning cohorts.
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-lg p-6 bg-white border border-slate-200 shadow-sm flex flex-col justify-between h-full hover:border-aws-orange transition-all duration-200"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-bold font-sans uppercase tracking-wider bg-orange-50 border border-orange-200 text-aws-orange">
                        PLANNED / UPCOMING
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">{event.number}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-display">
                        {event.month}
                      </span>
                      <h3 className="font-display font-bold text-base text-slate-900 leading-snug group-hover:text-brand-navy transition-colors">
                        {event.title}
                      </h3>
                    </div>

                    <div className="h-[1px] w-full bg-slate-100"></div>

                    <div className="space-y-2 text-xs font-sans">
                      <p className="text-slate-700">
                        <strong className="text-slate-900 font-medium">Key Focus:</strong> {event.focus}
                      </p>
                      <p className="text-slate-505 italic leading-relaxed">
                        <strong className="text-slate-900 font-medium not-italic">Learning Outcome:</strong> {event.outcome}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-50">
                    <button className="w-full text-center py-2 text-xs font-semibold rounded border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 transition-colors cursor-default">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Ongoing' && (
            <div className="rounded-lg p-8 text-center bg-slate-50 border border-slate-200 max-w-md mx-auto">
              <p className="text-xs text-slate-500 font-sans">No live or ongoing sessions are currently active.</p>
            </div>
          )}

          {activeTab === 'Completed' && (
            <div className="rounded-lg p-8 text-center bg-slate-50 border border-slate-200 max-w-md mx-auto">
              <p className="text-xs text-slate-500 font-sans">Completed session logs will populate our community archive post-launch.</p>
            </div>
          )}
        </div>
      </section>

      {/* Event Schema Framework Reference */}
      <section className="bg-slate-50 border border-slate-200 rounded-lg p-6 sm:p-8 max-w-3xl mx-auto space-y-4">
        <h4 className="font-display font-bold text-slate-900 text-xs uppercase tracking-wider">Event Archive Integration</h4>
        <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
          The event registry supports dynamic metadata fields. Confirmed details will populate for:
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
