import Link from 'next/link';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function formatDate(dateValue?: string) {
  if (!dateValue) return 'No deadline';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function getCategoryIcon(type?: string) {
  const t = String(type || '').toLowerCase();
  if (t.includes('lead')) {
    return (
      <svg className="h-5 w-5 text-aws-orange shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.9 1.513-.9 1.813 0a1.653 1.653 0 001.515 1.1l3.52.325c.981.09 1.372 1.29.663 1.986l-2.614 2.54a1.653 1.653 0 00-.475 1.462l.628 3.504c.175.979-.85 1.719-1.728 1.26L12 13.002l-3.155 1.66c-.878.46-1.9-.282-1.728-1.26l.628-3.504a1.653 1.653 0 00-.475-1.462l-2.614-2.54c-.709-.696-.318-1.896.663-1.986l3.52-.325a1.653 1.653 0 001.515-1.1z" />
      </svg>
    );
  }
  if (t.includes('volunteer')) {
    return (
      <svg className="h-5 w-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 text-brand-navy shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function getOpportunityStatus(career: any) {
  const status = String(career.status || '').toLowerCase();
  const now = Date.now();
  const deadline = career.applicationDeadline ? new Date(career.applicationDeadline).getTime() : null;

  if (status === 'closed' || (deadline && deadline < now)) {
    return {
      label: 'Closed',
      classes: 'border-slate-250 bg-slate-100 text-slate-700'
    };
  }
  if (status === 'expired') {
    return {
      label: 'Expired',
      classes: 'border-red-200 bg-red-50 text-red-700'
    };
  }
  if (status === 'upcoming') {
    return {
      label: 'Upcoming',
      classes: 'border-blue-200 bg-blue-50 text-blue-750'
    };
  }
  return {
    label: 'Open',
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  };
}

export default async function OpportunitiesPage() {
  const careers = await db.careers.getAll();
  const publicOpportunities = careers.filter((career: any) =>
    career.published &&
    (career.status || '').toLowerCase() !== 'draft' &&
    (career.status || '').toLowerCase() !== 'unpublished'
  );

  return (
    <main className="bg-slate-50/50 min-h-screen py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-aws-orange mb-3">Opportunities Portal</p>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-brand-navy tracking-tight mb-4">Community Opportunities</h1>
          <p className="text-base sm:text-lg text-slate-650 leading-relaxed font-sans">
            Discover student leadership roles, founding community opportunities, internships, volunteering experiences, and campus initiatives that help you build your future.
          </p>
          <div className="h-1 w-12 bg-aws-orange mt-5 rounded-full"></div>
        </div>

        {publicOpportunities.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <svg className="mx-auto h-12 w-12 text-slate-350 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-bold text-brand-navy">No opportunities are currently active.</p>
            <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">Please check back soon for new roles, volunteering positions, and campus leadership listings.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {publicOpportunities.map((career: any) => {
              const deadline = formatDate(career.applicationDeadline);
              const statusBadge = getOpportunityStatus(career);

              return (
                <article key={career.id} className="bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-slate-300 transition-all duration-300 p-6 flex flex-col h-full group">
                  {/* Top Header Section */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {career.organizationLogo ? (
                        <img 
                          src={career.organizationLogo} 
                          alt={career.organizationName} 
                          className="h-10 w-10 rounded-lg object-cover border border-slate-200 bg-white shrink-0" 
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg border border-slate-200/60 bg-slate-50 flex items-center justify-center shrink-0">
                          {getCategoryIcon(career.opportunityType)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 block mb-0.5">
                          {career.organizationName || 'AWS STUDENT BUILDER GROUP'}
                        </span>
                        <h2 className="text-base font-extrabold text-brand-navy leading-snug break-words group-hover:text-aws-orange transition-colors duration-200">
                          {career.title}
                        </h2>
                      </div>
                    </div>
                    
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0 ${statusBadge.classes}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-3 py-3.5 my-3 border-y border-slate-100 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">TYPE</span>
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{career.opportunityType}</span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">MODE</span>
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <span className="truncate">{career.workMode}</span>
                      </div>
                    </div>
                    <div className="col-span-2 space-y-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">LOCATION</span>
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate" title={career.location}>
                        <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{career.location}</span>
                      </div>
                    </div>
                    <div className="col-span-2 space-y-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">DEADLINE</span>
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{deadline}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description Preview */}
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed line-clamp-3 mb-5 font-sans">
                    {career.shortDescription || career.description}
                  </p>

                  {/* Divider and Footer CTA */}
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                    <span className="text-[10px] font-medium text-slate-400">
                      Posted: {new Date(career.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <Link 
                      href={`/opportunities/${career.slug}`} 
                      className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg bg-aws-orange text-white text-xs font-bold hover:bg-aws-orange/90 transition-colors shadow-sm group/btn shrink-0"
                    >
                      View Opportunity
                      <span className="group-hover/btn:translate-x-0.5 transition-transform duration-150">&rarr;</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
