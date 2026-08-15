import Link from 'next/link';
import { db } from '@/lib/db';

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

      <form action="/api/career-applications" method="POST" className="space-y-6">
        <input type="hidden" name="opportunityId" value={opportunity.id} />
        <input type="hidden" name="opportunitySlug" value={opportunity.slug} />

        <div className="tech-card-new p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-brand-navy mb-4">Personal Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">Full Name<input name="name" required className="form-input-field mt-1" /></label>
              <label className="block text-sm font-medium text-slate-700">Email<input type="email" name="email" required className="form-input-field mt-1" /></label>
              <label className="block text-sm font-medium text-slate-700">Phone<input name="phone" required className="form-input-field mt-1" /></label>
              <label className="block text-sm font-medium text-slate-700">University<input name="university" required className="form-input-field mt-1" /></label>
              <label className="block text-sm font-medium text-slate-700">Course / Program<input name="program" required className="form-input-field mt-1" /></label>
              <label className="block text-sm font-medium text-slate-700">Year<input name="graduationYear" required className="form-input-field mt-1" /></label>
              <label className="block text-sm font-medium text-slate-700 md:col-span-2">Student ID<input name="studentId" required className="form-input-field mt-1" /></label>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-brand-navy mb-4">Professional Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700 md:col-span-2">Resume / CV Upload<input type="file" name="resume" accept=".pdf,.doc,.docx" className="form-input-field mt-1" /></label>
              <label className="block text-sm font-medium text-slate-700">LinkedIn<input type="url" name="linkedin" className="form-input-field mt-1" /></label>
              <label className="block text-sm font-medium text-slate-700">GitHub<input type="url" name="github" className="form-input-field mt-1" /></label>
              <label className="block text-sm font-medium text-slate-700">Portfolio / Website<input type="url" name="portfolio" className="form-input-field mt-1" /></label>
              <label className="block text-sm font-medium text-slate-700 md:col-span-2">Skills<textarea name="skills" required className="form-input-field mt-1 min-h-24" /></label>
              <label className="block text-sm font-medium text-slate-700 md:col-span-2">Experience<textarea name="experience" className="form-input-field mt-1 min-h-24" /></label>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-brand-navy mb-4">Application</h2>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">Why do you want to join?<textarea name="motivation" required className="form-input-field mt-1 min-h-28" /></label>
              <label className="block text-sm font-medium text-slate-700">Additional information<textarea name="additionalInformation" className="form-input-field mt-1 min-h-28" /></label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 rounded border-slate-300 text-aws-orange focus:ring-aws-orange" />
              <span>I confirm that the information provided is accurate and I consent to being considered for this opportunity.</span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-primary">Submit Application</button>
          <Link href={`/opportunities/${opportunity.slug}`} className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
