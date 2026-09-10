import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import EventGallery, { EventPhoto } from '@/components/EventGallery';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    'event-id': string;
  }>;
}

const renderCollabLogo = (orgName: string, customLogoUrl?: string, className: string = "h-4 w-4 object-contain inline-block") => {
  if (orgName === 'GitHub') {
    return (
      <svg className={`${className} text-slate-800`} fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
      </svg>
    );
  }
  if (orgName === 'DataCamp') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <rect width="24" height="24" rx="4" fill="#03EF8A" />
        <path d="M6 6h6a4 4 0 014 4v4a4 4 0 01-4 4H6V6zm2 2v8h4a2 2 0 002-2v-4a2 2 0 00-2-2H8z" fill="#05234A" />
      </svg>
    );
  }
  if (orgName === 'AI/ML Club') {
    return (
      <svg className={`${className} text-[#FF9900]`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    );
  }
  if (customLogoUrl) {
    return (
      <img
        src={customLogoUrl}
        alt={`${orgName} Logo`}
        className={className}
      />
    );
  }
  return null;
};

export async function generateMetadata({ params }: PageProps) {
  const { 'event-id': eventId } = await params;
  const events = await db.events.getAll();
  const event = events.find((e: any) => e.id === eventId);
  if (!event) {
    return {
      title: 'Event Not Found | AWS SBG CU-UP'
    };
  }
  return {
    title: `${event.title} | AWS Student Builder Group`,
    description: event.overview || event.description || 'Join the AWS Student Builder Group community session.'
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { 'event-id': eventId } = await params;
  const events = await db.events.getAll();
  const event = events.find((e: any) => e.id === eventId);

  if (!event) {
    notFound();
  }

  const registrations = await db.eventRegistrations.getAll();
  const dbRegistrationCount = registrations.filter(
    (r: any) => r.eventId === event.id && r.status !== 'Rejected' && r.status !== 'Cancelled'
  ).length;
  const registrationCount = event.attendees !== undefined ? event.attendees : dbRegistrationCount;

  const regStatus = (event.registrationStatus || 'Not Open').toUpperCase();
  const isCapacityFull = event.maxRegistrations && event.maxRegistrations > 0 && registrationCount >= event.maxRegistrations;

  const galleryPhotos: EventPhoto[] = Array.isArray(event.gallery) ? event.gallery : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-xs font-sans text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-navy transition-colors">Home</Link>
        <span>/</span>
        <Link href="/events" className="hover:text-brand-navy transition-colors">Events</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold truncate max-w-xs sm:max-w-md">{event.title}</span>
      </nav>

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex px-2.5 py-1 rounded text-[9px] font-bold font-sans uppercase tracking-wider border ${
              (event.status || '').toUpperCase() === 'COMPLETED'
                ? 'bg-slate-100 text-slate-700 border-slate-200'
                : (event.status || '').toUpperCase() === 'ONGOING'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-orange-50 text-aws-orange border-orange-200'
            }`}>
              {event.status || 'Upcoming'}
            </span>
            {(event.status || '').toUpperCase() !== 'COMPLETED' && (
              <span className={`inline-flex px-2.5 py-1 rounded text-[9px] font-bold font-sans uppercase tracking-wider border ${
                regStatus === 'OPEN'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : regStatus === 'FULL'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                REGISTRATION {regStatus}
              </span>
            )}
            {registrationCount > 0 && (
              <span className="inline-flex px-2.5 py-1 rounded text-[9px] font-bold font-sans uppercase tracking-wider bg-slate-50 border border-slate-200 text-slate-600">
                {registrationCount} Attendees
              </span>
            )}
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              {event.number}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display">
            {event.month} Schedule
          </span>
        </div>

        <div className="space-y-3">
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-brand-navy tracking-tight leading-tight">
            {event.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-sans leading-relaxed max-w-3xl">
            {event.overview || event.description}
          </p>
        </div>

        {event.collaborations && event.collaborations.length > 0 && (
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-2 font-display">
              In Collaboration With:
            </span>
            {event.collaborations.map((collab: string, idx: number) => {
              const isPre = ['GitHub', 'DataCamp', 'AI/ML Club'].includes(collab);
              const logo = renderCollabLogo(collab, isPre ? undefined : event.customCollabLogo, "h-4 w-4 object-contain inline-block mr-1.5 flex-shrink-0");
              return (
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-1 rounded text-[9px] font-bold uppercase bg-slate-100 border border-slate-200 text-slate-700"
                >
                  {logo}
                  <span>{collab}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Grid: Content (Left) & Sidebar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Gallery */}
        <div className="lg:col-span-2 space-y-8">
          {/* About / Overview */}
          <section className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-xs">
            <h2 className="font-display font-bold text-base text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-aws-orange"></span>
              <span>About the Event</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-650 leading-relaxed font-sans">
              {event.aboutTheEvent || event.description || event.overview}
            </p>
          </section>

          {/* Key Focus & Learning Outcomes */}
          <section className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="space-y-2">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400">Key Focus Topics</h3>
              <p className="text-xs sm:text-sm text-slate-800 font-medium font-sans">
                {event.focus}
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400">Learning Outcome</h3>
              <p className="text-xs sm:text-sm text-slate-700 italic font-sans leading-relaxed">
                {event.outcome}
              </p>
            </div>

            {event.whatYouWillLearn && event.whatYouWillLearn.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400">What You Will Learn</h3>
                <ul className="space-y-2">
                  {event.whatYouWillLearn.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start text-xs sm:text-sm text-slate-700 font-sans">
                      <svg className="h-4 w-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* DEDICATED EVENT GALLERY SECTION */}
          {galleryPhotos.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full bg-aws-orange"></span>
                  <h2 className="font-display font-bold text-lg text-brand-navy">
                    Event Gallery
                  </h2>
                </div>
                <p className="text-xs text-slate-500 font-sans">
                  Moments, presentations, and highlights captured during {event.title}. Click any photo to view in full resolution.
                </p>
              </div>

              <EventGallery
                photos={galleryPhotos}
                eventTitle={event.title}
                showSectionHeader={false}
              />
            </section>
          )}

          {/* Requirements & Additional Info */}
          {(event.requirements || event.additionalInfo) && (
            <section className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-xs">
              {event.requirements && (
                <div className="space-y-2">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400">Requirements & Eligibility</h3>
                  <p className="text-xs sm:text-sm text-slate-700 font-sans leading-relaxed">{event.requirements}</p>
                </div>
              )}
              {event.additionalInfo && (
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400">Additional Information</h3>
                  <p className="text-xs sm:text-sm text-slate-700 font-sans leading-relaxed">{event.additionalInfo}</p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right Column: Event Meta Card & Registration CTA */}
        <div className="space-y-6">
          <div className="sticky top-24 bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Event Details
            </h3>

            <div className="space-y-4 text-xs font-sans">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded bg-orange-50 text-aws-orange flex-shrink-0">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <div>
                  <span className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">Date</span>
                  <span className="text-slate-800 font-semibold">{event.date || event.month || 'TBA'}</span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 rounded bg-orange-50 text-aws-orange flex-shrink-0">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <span className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">Time</span>
                  <span className="text-slate-800 font-semibold">{event.time ? `${event.time}${event.endTime ? ` - ${event.endTime}` : ''}` : 'TBA'}</span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 rounded bg-orange-50 text-aws-orange flex-shrink-0">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <div>
                  <span className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">Venue</span>
                  <span className="text-slate-800 font-semibold">{event.venue || 'TBA'}</span>
                  {event.city && <span className="block text-slate-500 text-[11px]">{event.city}</span>}
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 rounded bg-orange-50 text-aws-orange flex-shrink-0">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                </div>
                <div>
                  <span className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">Format</span>
                  <span className="text-slate-800 font-semibold">{event.format || 'Interactive Workshop'}</span>
                </div>
              </div>

              {event.speaker && (
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded bg-orange-50 text-aws-orange flex-shrink-0">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">Speaker</span>
                    <span className="text-slate-800 font-semibold">{event.speaker}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Registration CTA Button */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              {(event.status || '').toUpperCase() === 'COMPLETED' ? (
                <div className="w-full text-center py-3 px-4 font-bold rounded-lg border border-slate-200 text-slate-700 bg-slate-50 font-sans text-xs flex items-center justify-center space-x-1.5">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Event Successfully Concluded</span>
                </div>
              ) : regStatus === 'OPEN' && !isCapacityFull ? (
                <Link
                  href={`/events/${event.id}/register`}
                  className="w-full text-center py-3 px-4 font-bold rounded-lg bg-aws-orange hover:bg-orange-600 text-white transition-colors cursor-pointer font-sans text-xs flex items-center justify-center shadow-sm"
                >
                  Register for This Event
                </Link>
              ) : regStatus === 'FULL' || isCapacityFull ? (
                <div className="w-full text-center py-3 px-4 font-bold rounded-lg border border-red-200 text-red-600 bg-red-50 font-sans text-xs">
                  Registration Capacity Full
                </div>
              ) : regStatus === 'NOT OPEN' ? (
                <div className="w-full text-center py-3 px-4 font-semibold rounded-lg border border-slate-200 text-slate-500 bg-slate-50 font-sans text-xs">
                  Registration Not Open Yet
                </div>
              ) : (
                <div className="w-full text-center py-3 px-4 font-semibold rounded-lg border border-slate-200 text-slate-500 bg-slate-50 font-sans text-xs">
                  Registration Closed
                </div>
              )}

              <Link
                href="/events"
                className="w-full text-center py-2 px-4 font-semibold rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer font-sans text-xs block"
              >
                ← Back to All Events
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
