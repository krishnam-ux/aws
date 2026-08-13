import Link from 'next/link';
import { siteConfig } from '@/data/siteConfig';
import SectionHeader from '@/components/SectionHeader';

export default function Verification() {
  const hasAwsUrl = !!siteConfig.AWS_BUILDER_CENTER_URL;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
      {/* Introduction Header */}
      <section className="max-w-3xl">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-display">Trust & Transparency</span>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-navy tracking-tight leading-tight mt-1">
          Community Verification & Standing
        </h1>
        <p className="mt-4 text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
          The AWS Student Builder Group at Chandigarh University – Uttar Pradesh is a student-led initiative. We maintain high standards of accountability, verifiable records, and transparency.
        </p>
        <div className="h-[2px] w-12 bg-aws-orange mt-4"></div>
      </section>

      {/* Three Verification Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: AWS Builder Center */}
        <div className="tech-card-new rounded p-6 bg-white border border-slate-200 flex flex-col justify-between h-full border-t-[3px] border-t-aws-orange">
          <div className="space-y-4">
            <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold font-sans uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-650">
              PUBLIC LISTING
            </span>
            <h3 className="font-display font-bold text-slate-900 text-sm">AWS Builder Center Listing</h3>
            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              Our community is listed on AWS Builder Center as an AWS Student Builder Group at Chandigarh University – Uttar Pradesh.
            </p>
            <div className="bg-slate-50 rounded p-4 space-y-1 text-xs text-slate-500 font-sans border border-slate-100">
              <p><span className="text-slate-700 font-medium">Group:</span> {siteConfig.orgShortName}</p>
              <p><span className="text-slate-700 font-medium">Group Leader:</span> {siteConfig.leader.name}</p>
              <p><span className="text-slate-700 font-medium">Contact:</span> <a href="mailto:shuklaabhayas0@gmail.com" className="text-aws-orange hover:underline font-mono">shuklaabhayas0@gmail.com</a></p>
            </div>
          </div>
          <div className="mt-8">
            <a
              href="mailto:shuklaabhayas0@gmail.com"
              className="w-full btn-primary text-center py-2 text-xs block"
            >
              Contact
            </a>
          </div>
        </div>

        {/* Card 2: University Association */}
        <div className="tech-card-new rounded p-6 bg-white border border-slate-200 flex flex-col justify-between h-full border-t-[3px] border-t-brand-navy">
          <div className="space-y-4">
            <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold font-sans uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-650">
              UNIVERSITY ASSOCIATION
            </span>
            <h3 className="font-display font-bold text-slate-900 text-sm">University Association</h3>
            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              The AWS Student Community proposal was accepted for launch by the School of Computer Science and Engineering at Chandigarh University – Uttar Pradesh.
            </p>
            <div className="bg-slate-50 rounded p-4 space-y-1 text-xs text-slate-500 font-sans border border-slate-100">
              <p className="text-slate-800 font-bold">{siteConfig.facultyContact.name}</p>
              <p>{siteConfig.facultyContact.department}</p>
              <p>{siteConfig.facultyContact.organization}</p>
            </div>
          </div>
          <div className="mt-8">
            {/* Contact options removed as requested */}
          </div>
        </div>

        {/* Card 3: Community Contact */}
        <div className="tech-card-new rounded p-6 bg-white border border-slate-200 flex flex-col justify-between h-full border-t-[3px] border-t-aws-blue">
          <div className="space-y-4">
            <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold font-sans uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-650">
              COMMUNITY CONTACT
            </span>
            <h3 className="font-display font-bold text-slate-900 text-sm">Community Contact</h3>
            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              For general inquiries, verification checks, or partner collaborations, reach our student administration team directly via our verified email address.
            </p>
            <div className="bg-slate-50 rounded p-4 space-y-1 text-xs text-slate-500 font-sans border border-slate-100">
              <p className="text-slate-800 font-semibold">{siteConfig.orgShortName}</p>
              <p>Email: <a href={siteConfig.safeEmailLink} className="text-aws-orange hover:underline">{siteConfig.email}</a></p>
            </div>
          </div>
          <div className="mt-8">
            <a
              href={siteConfig.safeEmailLink}
              className="w-full btn-secondary text-center py-2 text-xs block"
            >
              Email Administration
            </a>
          </div>
        </div>
      </section>

      {/* Supporting Documentation Portal */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="font-display font-bold text-lg text-slate-900">Supporting Documentation</h2>
          <p className="text-xs text-slate-500 font-sans mt-1">
            Secure records maintained by our student leadership team. To protect student privacy, sensitive files are restricted.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 border border-slate-150 rounded p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-display font-bold text-slate-900 text-sm">AWS Builder Center Listing</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Status: Public Verification</p>
            </div>
            {hasAwsUrl ? (
              <a
                href={siteConfig.AWS_BUILDER_CENTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary py-1.5 text-xs"
              >
                View Official Listing
              </a>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400 font-sans">
                Coming Soon
              </span>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-150 rounded p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-display font-bold text-slate-900 text-sm">University Community Approval</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Status: University Communication Available</p>
            </div>
            <a
              href={siteConfig.safeEmailLink}
              className="btn-secondary py-1.5 text-xs text-center"
            >
              Contact Community
            </a>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 text-[11px] text-slate-500 font-sans flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>🛡️ Additional verification documents can be provided to educational and community partners upon legitimate request.</p>
          <Link href="/verification-request" className="text-brand-navy hover:text-aws-orange font-bold font-sans">
            Submit formal verification request &rarr;
          </Link>
        </div>
      </section>

      <div className="text-[11px] text-slate-450 text-center font-sans">
        This is a community-managed website and is not the official website of AWS or Chandigarh University.
      </div>
    </div>
  );
}
