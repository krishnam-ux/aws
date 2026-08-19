import Link from 'next/link';
import { notFound } from 'next/navigation';
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

export default async function CareerDetailsPage({
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
      <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-10">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600 shadow-inner">
                ✓
              </div>
            </div>

            <div className="space-y-5 text-center">
              <h1 className="text-3xl font-black tracking-tight text-brand-navy sm:text-4xl">
                Application Submitted Successfully
              </h1>

              <p className="text-lg font-medium text-slate-700">
                Thank you for your interest in this opportunity.
              </p>

              <p className="text-base leading-8 text-slate-600">
                Your application has been successfully submitted and is now under review by our recruitment team. If your profile is shortlisted, our team will contact you with the next steps.
              </p>

              <p className="text-base leading-8 text-slate-600">
                Please keep an eye on your registered email for further updates.
              </p>

              <div className="pt-4">
                <p className="text-lg font-bold tracking-[0.14em] text-aws-blue uppercase">AWS Student Builder Group</p>
                <p className="mt-2 text-base italic text-slate-600">Chandigarh University – Uttar Pradesh</p>
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
      <main className="max-w-4xl mx-auto px-4 py-20">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-aws-orange mb-3">Opportunity unavailable</p>
          <h1 className="text-3xl font-black text-brand-navy mb-3">Opportunity currently unavailable</h1>
          <p className="text-slate-600">This opportunity is no longer available or has been unpublished.</p>
          <Link href="/careers" className="btn-primary mt-6 inline-flex">Back to Careers</Link>
        </div>
      </main>
    );
  }

  const isClosed = career.status === 'Closed' || (career.applicationDeadline && new Date(career.applicationDeadline).getTime() < Date.now());
  const canApply = Boolean(career.internalApplications) && !isClosed;

  return (
    <main className="bg-white">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {career.organizationLogo ? (
              <img src={career.organizationLogo} alt={career.organizationName} className="h-16 w-16 rounded-xl object-cover border border-slate-200 bg-white" />
            ) : (
              <div className="h-16 w-16 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center text-lg font-bold text-brand-navy">
                {String(career.organizationName || 'A').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{career.organizationName}</p>
              <h1 className="text-3xl font-black text-brand-navy tracking-tight">{career.title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">{career.opportunityType}</span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">{career.workMode}</span>
            <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${isClosed ? 'border-slate-300 bg-slate-100 text-slate-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              {isClosed ? 'Applications Closed' : 'Open'}
            </span>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.7fr_0.9fr]">
          <div className="space-y-8">
            <div className="tech-card-new p-6">
              <h2 className="text-xl font-bold text-brand-navy mb-4">About the opportunity</h2>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">{career.description}</p>
            </div>

            <div className="tech-card-new p-6">
              <h2 className="text-xl font-bold text-brand-navy mb-4">Responsibilities</h2>
              <ul className="list-disc list-inside space-y-2 text-slate-700 leading-relaxed">
                {toList(career.responsibilities).length > 0 ? toList(career.responsibilities).map((item) => <li key={item}>{item}</li>) : <li>No responsibilities listed.</li>}
              </ul>
            </div>

            <div className="tech-card-new p-6">
              <h2 className="text-xl font-bold text-brand-navy mb-4">Required skills</h2>
              <ul className="list-disc list-inside space-y-2 text-slate-700 leading-relaxed">
                {toList(career.requiredSkills).length > 0 ? toList(career.requiredSkills).map((item) => <li key={item}>{item}</li>) : <li>No required skills listed.</li>}
              </ul>
            </div>

            <div className="tech-card-new p-6">
              <h2 className="text-xl font-bold text-brand-navy mb-4">Preferred skills</h2>
              <ul className="list-disc list-inside space-y-2 text-slate-700 leading-relaxed">
                {toList(career.preferredSkills).length > 0 ? toList(career.preferredSkills).map((item) => <li key={item}>{item}</li>) : <li>No preferred skills listed.</li>}
              </ul>
            </div>

            <div className="tech-card-new p-6">
              <h2 className="text-xl font-bold text-brand-navy mb-4">Eligibility</h2>
              <ul className="list-disc list-inside space-y-2 text-slate-700 leading-relaxed">
                {toList(career.eligibility).length > 0 ? toList(career.eligibility).map((item) => <li key={item}>{item}</li>) : <li>No eligibility details listed.</li>}
              </ul>
            </div>

            <div className="tech-card-new p-6">
              <h2 className="text-xl font-bold text-brand-navy mb-4">Benefits / What you'll gain</h2>
              <ul className="list-disc list-inside space-y-2 text-slate-700 leading-relaxed">
                {toList(career.benefits).length > 0 ? toList(career.benefits).map((item) => <li key={item}>{item}</li>) : <li>No benefits listed.</li>}
              </ul>
            </div>

            <div className="tech-card-new p-6">
              <h2 className="text-xl font-bold text-brand-navy mb-4">Additional information</h2>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">{career.additionalInformation || 'No extra information provided.'}</p>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="tech-card-new p-6">
              <h2 className="text-lg font-bold text-brand-navy mb-4">Opportunity details</h2>
              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex justify-between gap-3"><span className="text-slate-500">Location</span><span>{career.location}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Work mode</span><span>{career.workMode}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Posted</span><span>{formatDate(career.createdAt)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Deadline</span><span>{formatDate(career.applicationDeadline)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Status</span><span>{career.status}</span></div>
              </div>

              <div className="mt-6">
                {canApply ? (
                  <Link href={`/careers/${career.slug}/apply`} className="btn-primary w-full justify-center">Apply Now</Link>
                ) : (
                  <div className="w-full text-center rounded-md border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                    Applications Closed
                  </div>
                )}
              </div>
            </div>

            <div className="tech-card-new p-6">
              <h2 className="text-lg font-bold text-brand-navy mb-4">Quick links</h2>
              <div className="space-y-2">
                <Link href="/careers" className="block text-sm text-aws-blue hover:underline">← Back to careers</Link>
                {career.applicationLink ? (
                  <a href={career.applicationLink} target="_blank" rel="noreferrer" className="block text-sm text-aws-blue hover:underline">Open external application</a>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
