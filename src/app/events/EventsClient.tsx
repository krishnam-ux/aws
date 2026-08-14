'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CommunityEvent {
  id: string;
  number: string;
  month: string;
  title: string;
  focus: string;
  outcome: string;
  overview: string;
  format: string;
  whatYouWillLearn: string[];
  status?: string;
  date?: string;
  time?: string;
  venue?: string;
  speaker?: string;
  registrationLink?: string;
  image?: string;
  registrationStatus?: string;
  maxRegistrations?: number;
  registrationCount?: number;
  collaborations?: string[];
}

interface EventsClientProps {
  initialEvents: CommunityEvent[];
}

export default function EventsClient({ initialEvents }: EventsClientProps) {
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Ongoing' | 'Completed'>('Upcoming');
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);

  const upcomingFiltered = initialEvents.filter(e => {
    const s = (e.status || '').toUpperCase();
    return s === 'PLANNED' || s === 'UPCOMING';
  });
  const ongoingFiltered = initialEvents.filter(e => {
    const s = (e.status || '').toUpperCase();
    return s === 'ONGOING';
  });
  const completedFiltered = initialEvents.filter(e => {
    const s = (e.status || '').toUpperCase();
    return s === 'COMPLETED' || s === 'CANCELLED';
  });

  const renderRegStatusBadge = (status: string | undefined) => {
    const s = (status || 'Not Open').toUpperCase();
    let styleClasses = 'bg-slate-50 text-slate-500 border-slate-200';
    
    if (s === 'OPEN') {
      styleClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (s === 'FULL') {
      styleClasses = 'bg-red-50 text-red-700 border-red-200';
    } else if (s === 'NOT OPEN') {
      styleClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (s === 'CLOSED') {
      styleClasses = 'bg-slate-100 text-slate-650 border-slate-350';
    }

    return (
      <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold font-sans uppercase tracking-wider border ${styleClasses}`}>
        REGISTRATION {s}
      </span>
    );
  };

  const renderRegisterButton = (event: CommunityEvent) => {
    const isCapacityFull = event.maxRegistrations && event.maxRegistrations > 0 && event.registrationCount && event.registrationCount >= event.maxRegistrations;
    const regStatus = (event.registrationStatus || 'Not Open').toUpperCase();

    if (regStatus === 'FULL' || isCapacityFull) {
      return (
        <span
          className="flex-grow text-center py-2 font-bold rounded border border-red-200 text-red-500 bg-red-50 font-sans text-xs"
        >
          REGISTRATION FULL
        </span>
      );
    }

    if (regStatus === 'NOT OPEN') {
      return (
        <span
          className="flex-grow text-center py-2 font-semibold rounded border border-slate-200 text-slate-450 bg-slate-50 font-sans text-xs"
        >
          Registration Not Open
        </span>
      );
    }

    if (regStatus === 'CLOSED') {
      return (
        <span
          className="flex-grow text-center py-2 font-semibold rounded border border-slate-200 text-slate-450 bg-slate-50 font-sans text-xs"
        >
          REGISTRATION CLOSED
        </span>
      );
    }

    return (
      <Link
        href={`/events/${event.id}/register`}
        className="flex-grow text-center py-2 font-bold rounded bg-aws-orange hover:bg-orange-600 text-white transition-colors cursor-pointer font-sans text-xs flex items-center justify-center"
      >
        Register for Event
      </Link>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
      {/* Introduction */}
      <section className="max-w-3xl">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-display">Schedule Log</span>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-navy tracking-tight leading-tight mt-1">
          Community Events
        </h1>
        <p className="mt-4 text-xs sm:text-sm text-slate-505 font-sans leading-relaxed">
          Track upcoming workshops, builder bootcamps, and cloud learning cohorts.
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
                      : 'border-transparent text-slate-505 hover:text-slate-700 hover:border-slate-300'
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
            upcomingFiltered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingFiltered.map((event, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-lg p-6 bg-white border border-slate-200 shadow-sm flex flex-col justify-between h-full hover:border-aws-orange transition-all duration-200"
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-bold font-sans uppercase tracking-wider bg-orange-50 border border-orange-200 text-aws-orange">
                            {event.status || 'Upcoming'}
                          </span>
                          {renderRegStatusBadge(event.registrationStatus)}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">{event.number}</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block font-display">
                          {event.month}
                        </span>
                        <h3 className="font-display font-bold text-base text-slate-900 leading-snug group-hover:text-brand-navy transition-colors">
                          {event.title}
                        </h3>
                        {event.collaborations && event.collaborations.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {event.collaborations.map((collab, cIdx) => (
                              <span key={cIdx} className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold font-sans uppercase bg-slate-100 border border-slate-200 text-slate-600">
                                With {collab}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="h-[1px] w-full bg-slate-100"></div>

                      <div className="space-y-2 text-xs font-sans">
                        <p className="text-slate-700">
                          <strong className="text-slate-900 font-medium">Key Focus:</strong> {event.focus}
                        </p>
                        <p className="text-slate-555 italic leading-relaxed">
                          <strong className="text-slate-900 font-medium not-italic">Learning Outcome:</strong> {event.outcome}
                        </p>
                      </div>

                      {event.registrationStatus?.toUpperCase() === 'NOT OPEN' && (
                        <p className="text-[11px] text-slate-500 italic font-sans font-medium mt-1">
                          Registration will open soon.
                        </p>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3 text-xs">
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="flex-grow text-center py-2 font-semibold rounded border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer font-sans"
                      >
                        View Details
                      </button>
                      {renderRegisterButton(event)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg p-8 text-center bg-slate-50 border border-slate-200 max-w-md mx-auto">
                <p className="text-xs text-slate-550 font-sans">No upcoming community sessions are currently scheduled.</p>
              </div>
            )
          )}

          {activeTab === 'Ongoing' && (
            ongoingFiltered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ongoingFiltered.map((event, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-lg p-6 bg-white border border-slate-200 shadow-sm flex flex-col justify-between h-full hover:border-aws-orange transition-all duration-200"
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-bold font-sans uppercase tracking-wider bg-orange-50 border border-orange-200 text-aws-orange">
                            {event.status || 'Ongoing'}
                          </span>
                          {renderRegStatusBadge(event.registrationStatus)}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">{event.number}</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block font-display">
                          {event.month}
                        </span>
                        <h3 className="font-display font-bold text-base text-slate-900 leading-snug group-hover:text-brand-navy transition-colors">
                          {event.title}
                        </h3>
                        {event.collaborations && event.collaborations.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {event.collaborations.map((collab, cIdx) => (
                              <span key={cIdx} className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold font-sans uppercase bg-slate-100 border border-slate-200 text-slate-600">
                                With {collab}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="h-[1px] w-full bg-slate-100"></div>

                      <div className="space-y-2 text-xs font-sans">
                        <p className="text-slate-700">
                          <strong className="text-slate-900 font-medium">Key Focus:</strong> {event.focus}
                        </p>
                        <p className="text-slate-555 italic leading-relaxed">
                          <strong className="text-slate-900 font-medium not-italic">Learning Outcome:</strong> {event.outcome}
                        </p>
                      </div>

                      {event.registrationStatus?.toUpperCase() === 'NOT OPEN' && (
                        <p className="text-[11px] text-slate-500 italic font-sans font-medium mt-1">
                          Registration will open soon.
                        </p>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3 text-xs">
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="flex-grow text-center py-2 font-semibold rounded border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer font-sans"
                      >
                        View Details
                      </button>
                      {renderRegisterButton(event)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg p-8 text-center bg-slate-50 border border-slate-200 max-w-md mx-auto">
                <p className="text-xs text-slate-550 font-sans">No live or ongoing sessions are currently active.</p>
              </div>
            )
          )}

          {activeTab === 'Completed' && (
            completedFiltered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedFiltered.map((event, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-lg p-6 bg-white border border-slate-200 shadow-sm flex flex-col justify-between h-full hover:border-aws-orange transition-all duration-200"
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-bold font-sans uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-500">
                            {event.status || 'Completed'}
                          </span>
                          {renderRegStatusBadge(event.registrationStatus)}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">{event.number}</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block font-display">
                          {event.month}
                        </span>
                        <h3 className="font-display font-bold text-base text-slate-900 leading-snug group-hover:text-brand-navy transition-colors">
                          {event.title}
                        </h3>
                        {event.collaborations && event.collaborations.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {event.collaborations.map((collab, cIdx) => (
                              <span key={cIdx} className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold font-sans uppercase bg-slate-100 border border-slate-200 text-slate-600">
                                With {collab}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="h-[1px] w-full bg-slate-100"></div>

                      <div className="space-y-2 text-xs font-sans">
                        <p className="text-slate-700">
                          <strong className="text-slate-900 font-medium">Key Focus:</strong> {event.focus}
                        </p>
                        <p className="text-slate-555 italic leading-relaxed">
                          <strong className="text-slate-900 font-medium not-italic">Learning Outcome:</strong> {event.outcome}
                        </p>
                      </div>

                      {event.registrationStatus?.toUpperCase() === 'NOT OPEN' && (
                        <p className="text-[11px] text-slate-505 italic font-sans font-medium mt-1">
                          Registration will open soon.
                        </p>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3 text-xs">
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="flex-grow text-center py-2 font-semibold rounded border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer font-sans"
                      >
                        View Details
                      </button>
                      {renderRegisterButton(event)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg p-8 text-center bg-slate-50 border border-slate-200 max-w-md mx-auto">
                <p className="text-xs text-slate-555 font-sans">Completed session logs will populate our community archive post-launch.</p>
              </div>
            )
          )}
        </div>
      </section>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="relative bg-white rounded-lg border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Top Bar Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-bold font-sans uppercase tracking-wider bg-orange-50 border border-orange-200 text-aws-orange">
                    {selectedEvent.status || 'Upcoming'}
                  </span>
                  {renderRegStatusBadge(selectedEvent.registrationStatus)}
                  <span className="text-[10px] font-mono text-slate-400 font-bold">{selectedEvent.number}</span>
                </div>
                <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block font-display">
                  {selectedEvent.month} Schedule
                </span>
                <h3 className="font-display font-bold text-lg text-slate-900 leading-snug">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-650 p-1 rounded-full hover:bg-slate-50 transition-colors"
                aria-label="Close modal"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="h-[1px] w-full bg-slate-100"></div>

            {/* Event Meta Details */}
            <div className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <h4 className="font-semibold text-slate-900">Event Overview</h4>
                <p className="text-slate-600 leading-relaxed">{selectedEvent.overview || 'Details will be announced soon.'}</p>
              </div>

              {selectedEvent.collaborations && selectedEvent.collaborations.length > 0 && (
                <div className="space-y-1">
                  <h4 className="font-semibold text-slate-900 font-display text-[10px] uppercase tracking-wider text-slate-400">In Collaboration With</h4>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedEvent.collaborations.map((org, index) => (
                      <span
                        key={index}
                        className="bg-brand-navy/5 text-brand-navy border border-brand-navy/10 px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase"
                      >
                        {org}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvent.registrationStatus?.toUpperCase() === 'NOT OPEN' && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded text-amber-800 text-center font-sans text-xs italic font-medium">
                  Registration will open soon.
                </div>
              )}

              <div className="space-y-1">
                <h4 className="font-semibold text-slate-900">Key Focus Topics</h4>
                <p className="text-slate-600 leading-relaxed">{selectedEvent.focus}</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-semibold text-slate-900">Learning Outcome</h4>
                <p className="text-slate-600 italic leading-relaxed">{selectedEvent.outcome}</p>
              </div>

              {selectedEvent.whatYouWillLearn && selectedEvent.whatYouWillLearn.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-semibold text-slate-900">What You Will Learn</h4>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    {selectedEvent.whatYouWillLearn.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <h4 className="font-semibold text-slate-900">Event Format</h4>
                  <p className="text-slate-700 font-semibold">{selectedEvent.format || 'Details will be announced soon.'}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-slate-900">Venue / Time / Speaker</h4>
                  <p className="text-slate-655 leading-relaxed">
                    Venue: {selectedEvent.venue || 'TBA'}<br />
                    Time: {selectedEvent.time || 'TBA'}<br />
                    Speaker: {selectedEvent.speaker || 'TBA'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              <span className="text-[10px] text-slate-400 font-sans italic">
                Schedule subject to department approvals.
              </span>
              <div className="flex space-x-2">
                {selectedEvent.registrationStatus?.toUpperCase() === 'OPEN' && 
                 !(selectedEvent.maxRegistrations && selectedEvent.maxRegistrations > 0 && selectedEvent.registrationCount && selectedEvent.registrationCount >= selectedEvent.maxRegistrations) && (
                  <Link
                    href={`/events/${selectedEvent.id}/register`}
                    className="px-4 py-1.5 text-xs bg-aws-orange hover:bg-orange-600 text-white font-bold rounded cursor-pointer transition-colors font-sans text-center flex items-center justify-center"
                  >
                    Register for Event
                  </Link>
                )}
                {selectedEvent.registrationStatus?.toUpperCase() === 'CLOSED' && (
                  <span className="px-3 py-1.5 text-xs border border-slate-200 text-slate-500 bg-slate-50 rounded font-semibold font-sans">
                    REGISTRATION CLOSED
                  </span>
                )}
                {selectedEvent.registrationStatus?.toUpperCase() === 'FULL' && (
                  <span className="px-3 py-1.5 text-xs border border-red-200 text-red-500 bg-red-50 rounded font-bold font-sans">
                    REGISTRATION FULL
                  </span>
                )}
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="btn-secondary py-1.5 px-4 text-xs cursor-pointer font-sans"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Schema Framework Reference */}
      <section className="bg-slate-50 border border-slate-200 rounded-lg p-6 sm:p-8 max-w-3xl mx-auto space-y-4">
        <h4 className="font-display font-bold text-slate-900 text-xs uppercase tracking-wider">Event Archive Integration</h4>
        <p className="text-[11px] text-slate-505 font-sans leading-relaxed">
          The event registry supports dynamic metadata fields. Confirmed details will populate for:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-mono text-slate-655 bg-white p-4 border border-slate-100 rounded">
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
