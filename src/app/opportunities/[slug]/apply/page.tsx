import Link from 'next/link';
import { db } from '@/lib/db';
import OpportunityApplicationForm from '@/components/OpportunityApplicationForm';

export const dynamic = 'force-dynamic';

export default async function OpportunityApplicationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const opportunity = await db.careers.getBySlug(slug);

  if (!opportunity || !opportunity.published || (opportunity.status || '').toLowerCase() === 'draft' || (opportunity.status || '').toLowerCase() === 'unpublished') {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-aws-orange mb-3">Application unavailable</p>
          <h1 className="text-3xl font-black text-brand-navy mb-3">Opportunity not available</h1>
          <p className="text-slate-600">This opportunity is no longer accepting applications.</p>
          <Link href="/opportunities" className="btn-primary mt-6 inline-flex">Back to Opportunities</Link>
        </div>
      </main>
    );
  }

  const isClosed = opportunity.status === 'Closed' || (opportunity.applicationDeadline && new Date(opportunity.applicationDeadline).getTime() < Date.now());
  if (isClosed || !opportunity.internalApplications) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-aws-orange mb-3">Applications Closed</p>
          <h1 className="text-3xl font-black text-brand-navy mb-3">This opportunity is no longer accepting applications.</h1>
          <Link href={`/opportunities/${opportunity.slug}`} className="btn-primary mt-6 inline-flex">View Opportunity</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-aws-orange mb-3">Application form</p>
        <h1 className="text-3xl font-black text-brand-navy tracking-tight">Apply for {opportunity.title}</h1>
        <p className="text-slate-600 mt-2">Complete the form below to submit your application for this opportunity.</p>
      </div>

      <OpportunityApplicationForm
        opportunityId={opportunity.id}
        opportunitySlug={opportunity.slug}
        opportunityTitle={opportunity.title}
        backHref={`/opportunities/${opportunity.slug}`}
        variant="opportunity"
      />
    </main>
  );
}
