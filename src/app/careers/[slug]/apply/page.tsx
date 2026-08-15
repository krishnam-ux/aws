import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';

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

      <form action="/api/career-applications" method="POST" className="space-y-6">
        <input type="hidden" name="opportunityId" value={career.id} />
        <input type="hidden" name="opportunitySlug" value={career.slug} />

        <div className="tech-card-new p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-brand-navy mb-4">Personal Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">Full Name<input name="name" required className="form-input-field mt-1" /></label>
              <label className="block text-sm font-medium text-slate-700">Email<input type="email" name="email" required className="form-input-field mt-1" /></label>
              <label className="block text-sm font-medium text-slate-700">Phone<input name="phone" required className="form-input-field mt-1" /></label>
              <label className="block text-sm font-medium text-slate-700">University<input name="university" required className="form-input-field mt-1" /></label>
              <label className="block text-sm font-medium text-slate-700">Program / Course<input name="program" required className="form-input-field mt-1" /></label>
              <label className="block text-sm font-medium text-slate-700">Graduation Year<input name="graduationYear" required className="form-input-field mt-1" /></label>
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
              <label className="block text-sm font-medium text-slate-700 md:col-span-2">Previous Experience<textarea name="experience" className="form-input-field mt-1 min-h-24" /></label>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-brand-navy mb-4">Application</h2>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">Why are you interested?<textarea name="motivation" required className="form-input-field mt-1 min-h-28" /></label>
              <label className="block text-sm font-medium text-slate-700">Cover Letter / Motivation<textarea name="coverLetter" className="form-input-field mt-1 min-h-28" /></label>
              <label className="block text-sm font-medium text-slate-700">Additional Information<textarea name="additionalInformation" className="form-input-field mt-1 min-h-28" /></label>
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
          <Link href={`/careers/${career.slug}`} className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
