import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import OpportunityApplicationForm from '@/components/OpportunityApplicationForm';

export const dynamic = 'force-dynamic';

export default async function CareerApplicationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const career = await db.careers.getBySlug(slug);

  if (!career || !career.published || (career.status || '').toLowerCase() === 'draft' || (career.status || '').toLowerCase() === 'unpublished') {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-aws-orange mb-3">Application unavailable</p>
          <h1 className="text-3xl font-black text-brand-navy mb-3">Opportunity currently unavailable</h1>
          <p className="text-slate-600">This opportunity is no longer accepting applications.</p>
          <Link href="/careers" className="btn-primary mt-6 inline-flex">Back to Careers</Link>
        </div>
      </main>
    );
  }

  const isClosed = career.status === 'Closed' || (career.applicationDeadline && new Date(career.applicationDeadline).getTime() < Date.now());
  if (isClosed || !career.internalApplications) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-aws-orange mb-3">Applications Closed</p>
          <h1 className="text-3xl font-black text-brand-navy mb-3">This opportunity is no longer accepting applications.</h1>
          <Link href={`/careers/${career.slug}`} className="btn-primary mt-6 inline-flex">View Opportunity</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-aws-orange mb-3">Application form</p>
        <h1 className="text-3xl font-black text-brand-navy tracking-tight">Apply for {career.title}</h1>
        <p className="text-slate-600 mt-2">Complete the form below to submit your application for this opportunity.</p>
      </div>

      <OpportunityApplicationForm
        opportunityId={career.id}
        opportunitySlug={career.slug}
        opportunityTitle={career.title}
        backHref={`/careers/${career.slug}`}
        variant="career"
      />
    </main>
  );
}
