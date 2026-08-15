import Link from 'next/link';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function formatDate(dateValue?: string) {
  if (!dateValue) return 'No deadline';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export default async function CareersPage() {
  const careers = await db.careers.getAll();
  const publicCareers = careers.filter((career: any) => career.published && (career.status || '').toLowerCase() !== 'draft' && (career.status || '').toLowerCase() !== 'unpublished');

  return (
    <main className="bg-white">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="max-w-3xl mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-aws-orange mb-4">Careers & Opportunities</p>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-brand-navy tracking-tight mb-4">Careers & Opportunities</h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Discover internships, jobs, student leadership opportunities, community roles, and other opportunities to grow your career.
          </p>
        </div>

        {publicCareers.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center">
            <p className="text-lg font-semibold text-brand-navy">No opportunities are currently available.</p>
            <p className="text-slate-600 mt-2">Please check back soon for new internships, roles, and community opportunities.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {publicCareers.map((career: any) => {
              const deadline = formatDate(career.applicationDeadline);
              const isClosed = career.status === 'Closed' || (career.applicationDeadline && new Date(career.applicationDeadline).getTime() < Date.now());

              return (
                <article key={career.id} className="tech-card-new tech-card-new-hover p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {career.organizationLogo ? (
                        <img src={career.organizationLogo} alt={career.organizationName} className="h-12 w-12 rounded-lg object-cover border border-slate-200 bg-white" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-sm font-bold text-brand-navy">
                          {String(career.organizationName || 'A').slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{career.organizationName}</p>
                        <h2 className="text-lg font-bold text-brand-navy leading-snug break-words">{career.title}</h2>
                      </div>
                    </div>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      isClosed ? 'border-slate-300 bg-slate-100 text-slate-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}>
                      {isClosed ? 'Closed' : 'Open'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600 mb-4">
                    <div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-500">Type</span><span>{career.opportunityType}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-500">Location</span><span>{career.location}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-500">Mode</span><span>{career.workMode}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-500">Deadline</span><span>{deadline}</span></div>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed mb-4">{career.shortDescription}</p>

                  <div className="mt-auto pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                      <span>Posted: {formatDate(career.createdAt)}</span>
                      <span>{career.status}</span>
                    </div>
                    <Link href={`/careers/${career.slug}`} className="btn-primary w-full justify-center text-center">View Opportunity</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
