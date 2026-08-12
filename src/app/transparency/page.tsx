import Link from 'next/link';

export default function Transparency() {
  const policies = [
    {
      title: 'COMMUNITY STATUS',
      statement: 'This website represents the AWS Student Builder Group community at Chandigarh University – Uttar Pradesh.',
      details: 'We are a student-coordinated technical community focused on cloud competency, coding, and technology projects. We do not operate as an official administrative division of Chandigarh University or AWS corporate.'
    },
    {
      title: 'WEBSITE STATUS',
      statement: 'This is a community-managed website and is not the official website of Chandigarh University.',
      details: 'This website is built, deployed, and updated entirely by student leaders and volunteers of the AWS Student Builder Group. It does not replace or represent the official Chandigarh University web portal.'
    },
    {
      title: 'AWS STATUS',
      statement: 'This website represents a student community within the AWS Student Builder Group ecosystem and is not the AWS corporate website.',
      details: 'This site is independent of Amazon Web Services corporate operations. AWS does not host, grade, review, or control the assets or operations of this community website.'
    },
    {
      title: 'PARTNERSHIP STATUS',
      statement: 'Organizations listed as partners must have an actual confirmed collaboration.',
      details: 'We strictly adhere to factual disclosures. No corporate logos, certificates, or educational partnerships are displayed on this site unless formal, written approvals have been exchanged and verified by our university faculty advisors.'
    },
    {
      title: 'INFORMATION POLICY',
      statement: 'We aim to keep community information accurate and update information when official details change.',
      details: 'All profiles (students, faculty advisors), listing directory URLs, and study track descriptions are reviewed regularly. When external resource URLs or registry status change, this site config is updated promptly.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
      {/* Introduction */}
      <section className="max-w-3xl">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-display">Governance & Trust</span>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-navy tracking-tight leading-tight mt-1">
          Transparency Statement
        </h1>
        <p className="mt-4 text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
          AWS Student Builder Group at Chandigarh University – Uttar Pradesh operates under strict integrity guidelines. We provide transparent and verifiable information.
        </p>
        <div className="h-[2px] w-12 bg-aws-orange mt-4"></div>
      </section>

      {/* Policies List - Formal Institutional layout */}
      <section className="space-y-8 max-w-4xl">
        {policies.map((p, idx) => (
          <div key={idx} className="tech-card rounded-lg p-6 bg-white border border-slate-200 relative overflow-hidden space-y-4">
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-display block">{p.title}</span>
            <div className="border-l-4 border-aws-orange pl-4 text-xs sm:text-sm text-slate-800 font-sans font-semibold leading-relaxed">
              &ldquo;{p.statement}&rdquo;
            </div>
            <p className="text-xs text-slate-500 font-sans leading-relaxed pl-5">
              {p.details}
            </p>
          </div>
        ))}
      </section>

      {/* Safety Notice */}
      <section className="bg-slate-50 border border-slate-200 rounded-lg p-8 max-w-3xl mx-auto text-center space-y-4">
        <h4 className="font-display font-bold text-slate-900 text-sm uppercase tracking-wider">Verification Request</h4>
        <p className="text-xs text-slate-500 leading-relaxed font-sans max-w-xl mx-auto">
          We welcome verification audits from university administrators, industry partners, and community members. Sensitive document details are kept confidential to protect student privacy but can be requested through official academic channels.
        </p>
        <div className="flex justify-center">
          <Link
            href="/verification-request"
            className="btn-secondary py-2 text-xs"
          >
            Submit Audit Request &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
