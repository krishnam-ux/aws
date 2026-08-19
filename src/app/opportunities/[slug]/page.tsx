import Link from 'next/link';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

type SearchParamsValue = string | string[] | undefined;

function isSubmittedState(value: SearchParamsValue): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => item === '1');
  }

  return value === '1';
}

function formatDate(dateValue?: string) {
  if (!dateValue) return 'No deadline';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function toList(value?: string) {
  if (!value) return [];
  return value
    .split(/\n|\r\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBullet(item: string): string {
  return item.replace(/^[•\*\-\s\d\.\:\-\»\>\–\—\•]+/, '').trim();
}

function getCategoryIcon(type?: string) {
  const t = String(type || '').toLowerCase();
  if (t.includes('lead')) {
    return (
      <svg className="h-6 w-6 text-aws-orange shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.9 1.513-.9 1.813 0a1.653 1.653 0 001.515 1.1l3.52.325c.981.09 1.372 1.29.663 1.986l-2.614 2.54a1.653 1.653 0 00-.475 1.462l.628 3.504c.175.979-.85 1.719-1.728 1.26L12 13.002l-3.155 1.66c-.878.46-1.9-.282-1.728-1.26l.628-3.504a1.653 1.653 0 00-.475-1.462l-2.614-2.54c-.709-.696-.318-1.896.663-1.986l3.52-.325a1.653 1.653 0 001.515-1.1z" />
      </svg>
    );
  }
  if (t.includes('volunteer')) {
    return (
      <svg className="h-6 w-6 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    );
  }
  return (
    <svg className="h-6 w-6 text-brand-navy shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

export default async function OpportunityDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, SearchParamsValue>>;
}) {
  const { slug } = await params;
  const submitted = isSubmittedState((await searchParams)?.submitted);

  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="mx-auto max-w-2xl w-full">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-55 border border-emerald-200 text-3xl text-emerald-600 shadow-sm">
                ✓
              </div>
            </div>

            <div className="space-y-5">
              <h1 className="text-3xl font-black tracking-tight text-brand-navy sm:text-4xl">
                Application Submitted
              </h1>

              <p className="text-base sm:text-lg font-medium text-slate-700">
                Thank you for your interest in this opportunity.
              </p>

              <p className="text-sm sm:text-base leading-relaxed text-slate-500 max-w-md mx-auto">
                Your application has been successfully submitted and is now under review by our recruitment team. If your profile is shortlisted, our team will contact you with the next steps.
              </p>

              <div className="h-px bg-slate-100 my-6"></div>

              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-aws-orange uppercase">AWS Student Builder Group</p>
                <p className="mt-1 text-sm text-slate-400">Chandigarh University – Uttar Pradesh</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const career = await db.careers.getBySlug(slug);

  if (!career || !career.published || (career.status || '').toLowerCase() === 'draft' || (career.status || '').toLowerCase() === 'unpublished') {
    return (
      <main className="max-w-4xl mx-auto px-4 py-24">
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-10 text-center max-w-lg mx-auto">
          <div className="h-12 w-12 rounded-full bg-red-50 border border-red-200 text-red-650 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-aws-orange mb-2">Opportunity Unavailable</p>
          <h1 className="text-2xl font-black text-brand-navy mb-3">Not Available</h1>
          <p className="text-sm text-slate-500 mb-6">This listing is currently unavailable, closed, or has been draft-archived.</p>
          <Link href="/opportunities" className="inline-flex px-5 py-2.5 rounded-lg bg-aws-orange text-white text-xs font-bold hover:bg-aws-orange/90 transition-colors shadow-sm">
            Back to Opportunities
          </Link>
        </div>
      </main>
    );
  }

  const isClosed = career.status === 'Closed' || (career.applicationDeadline && new Date(career.applicationDeadline).getTime() < Date.now());
  const canApply = Boolean(career.internalApplications) && !isClosed;

  return (
    <main className="bg-slate-50/50 min-h-screen py-12 sm:py-16">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Premium Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 sm:p-8 mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            {career.organizationLogo ? (
              <img 
                src={career.organizationLogo} 
                alt={career.organizationName} 
                className="h-16 w-16 rounded-full object-cover border border-slate-200 bg-white shrink-0 shadow-sm" 
              />
            ) : (
              <div className="h-16 w-16 rounded-full border border-slate-200/60 bg-slate-50 flex items-center justify-center shrink-0 shadow-sm">
                {getCategoryIcon(career.opportunityType)}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-1">
                AWS STUDENT BUILDER GROUP
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-brand-navy tracking-tight leading-tight break-words">
                {career.title}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 md:self-center">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              {career.opportunityType}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              {career.workMode}
            </span>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              isClosed ? 'border-slate-350 bg-slate-100 text-slate-700' : 'border-emerald-250 bg-emerald-50 text-emerald-700'
            }`}>
              {isClosed ? 'Closed' : 'Open'}
            </span>
          </div>
        </div>

        {/* Content Layout Grid */}
        <div className="grid gap-8 lg:grid-cols-[1.7fr_0.9fr]">
          
          {/* Left Column Content Cards */}
          <div className="space-y-6">
            
            {/* About card */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 sm:p-8">
              <h2 className="text-lg font-bold text-brand-navy mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                About the Opportunity
              </h2>
              <p className="text-slate-650 leading-relaxed whitespace-pre-line text-sm sm:text-base font-sans">
                {career.description}
              </p>
            </div>

            {/* Responsibilities card */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 sm:p-8">
              <h2 className="text-lg font-bold text-brand-navy mb-4 pb-2 border-b border-slate-100">
                Responsibilities
              </h2>
              <ul className="space-y-3 text-sm sm:text-base text-slate-650 font-sans">
                {toList(career.responsibilities).length > 0 ? (
                  toList(career.responsibilities).map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="text-aws-orange shrink-0 mt-1">&bull;</span>
                      <span>{normalizeBullet(item)}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-400 italic">No responsibilities listed.</li>
                )}
              </ul>
            </div>

            {/* Required Skills card */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 sm:p-8">
              <h2 className="text-lg font-bold text-brand-navy mb-4 pb-2 border-b border-slate-100">
                Required Skills
              </h2>
              <ul className="space-y-3 text-sm sm:text-base text-slate-650 font-sans">
                {toList(career.requiredSkills).length > 0 ? (
                  toList(career.requiredSkills).map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="text-aws-orange shrink-0 mt-1">&bull;</span>
                      <span>{normalizeBullet(item)}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-400 italic">No required skills listed.</li>
                )}
              </ul>
            </div>

            {/* Preferred Skills card */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 sm:p-8">
              <h2 className="text-lg font-bold text-brand-navy mb-4 pb-2 border-b border-slate-100">
                Preferred Skills
              </h2>
              <ul className="space-y-3 text-sm sm:text-base text-slate-650 font-sans">
                {toList(career.preferredSkills).length > 0 ? (
                  toList(career.preferredSkills).map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="text-aws-orange shrink-0 mt-1">&bull;</span>
                      <span>{normalizeBullet(item)}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-400 italic">No preferred skills listed.</li>
                )}
              </ul>
            </div>

            {/* Eligibility card */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 sm:p-8">
              <h2 className="text-lg font-bold text-brand-navy mb-4 pb-2 border-b border-slate-100">
                Eligibility & Qualifications
              </h2>
              <ul className="space-y-3 text-sm sm:text-base text-slate-650 font-sans">
                {toList(career.eligibility).length > 0 ? (
                  toList(career.eligibility).map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="text-aws-orange shrink-0 mt-1">&bull;</span>
                      <span>{normalizeBullet(item)}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-400 italic">No eligibility details listed.</li>
                )}
              </ul>
            </div>

            {/* Benefits card */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 sm:p-8">
              <h2 className="text-lg font-bold text-brand-navy mb-4 pb-2 border-b border-slate-100">
                Benefits / What you'll gain
              </h2>
              <ul className="space-y-3 text-sm sm:text-base text-slate-650 font-sans">
                {toList(career.benefits).length > 0 ? (
                  toList(career.benefits).map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="text-aws-orange shrink-0 mt-1">&bull;</span>
                      <span>{normalizeBullet(item)}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-400 italic">No benefits listed.</li>
                )}
              </ul>
            </div>

            {/* Additional info card */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 sm:p-8">
              <h2 className="text-lg font-bold text-brand-navy mb-4 pb-2 border-b border-slate-100">
                Additional Information
              </h2>
              <p className="text-slate-655 leading-relaxed whitespace-pre-line text-sm sm:text-base font-sans">
                {career.additionalInformation || 'No extra information provided.'}
              </p>
            </div>
          </div>

          {/* Right Column Sticky Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            
            {/* Opportunity Overview Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
              <h2 className="text-base font-bold text-brand-navy mb-4 pb-2 border-b border-slate-100">Opportunity Overview</h2>
              <div className="space-y-4 text-xs sm:text-sm text-slate-700">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mt-0.5">Location</span>
                  <span className="font-semibold text-brand-navy text-right">{career.location}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mt-0.5">Work mode</span>
                  <span className="font-semibold text-brand-navy text-right">{career.workMode}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mt-0.5">Type</span>
                  <span className="font-semibold text-brand-navy text-right">{career.opportunityType}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mt-0.5">Posted Date</span>
                  <span className="font-semibold text-brand-navy text-right">{formatDate(career.createdAt)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mt-0.5">Deadline</span>
                  <span className="font-semibold text-brand-navy text-right">{formatDate(career.applicationDeadline)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mt-0.5">Status</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${
                    isClosed ? 'border-slate-350 bg-slate-50 text-slate-700' : 'border-emerald-250 bg-emerald-50 text-emerald-700'
                  }`}>
                    {isClosed ? 'Closed' : career.status || 'Open'}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                {canApply ? (
                  <Link 
                    href={`/opportunities/${career.slug}/apply`} 
                    className="inline-flex w-full items-center justify-center gap-1.5 px-5 py-3 rounded-lg bg-aws-orange text-white text-sm font-bold hover:bg-aws-orange/90 transition-colors shadow-sm group/btn text-center"
                  >
                    Apply Now
                    <span className="group-hover/btn:translate-x-0.5 transition-transform duration-150">&rarr;</span>
                  </Link>
                ) : (
                  <div className="w-full text-center rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 shadow-inner">
                    Applications Closed
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
              <h2 className="text-base font-bold text-brand-navy mb-4 pb-2 border-b border-slate-100">Quick Links</h2>
              <div className="space-y-3 font-sans">
                <Link 
                  href="/opportunities" 
                  className="inline-flex items-center gap-1.5 text-xs text-aws-blue hover:text-aws-blue/80 hover:underline font-semibold"
                >
                  &larr; Back to opportunities
                </Link>
                {career.applicationLink ? (
                  <a 
                    href={career.applicationLink} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center gap-1.5 text-xs text-aws-blue hover:text-aws-blue/80 hover:underline font-semibold"
                  >
                    Open external application
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 00-2 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
