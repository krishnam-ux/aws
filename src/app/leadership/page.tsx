import Link from 'next/link';
import { siteConfig } from '@/data/siteConfig';
import SectionHeader from '@/components/SectionHeader';

// Reusable custom initials avatar component
function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n.replace(/[^A-Za-z]/g, ''))
    .filter((n) => n.length > 0)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="h-12 w-12 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-display font-extrabold text-sm text-brand-navy flex-shrink-0">
      {initials}
    </div>
  );
}

export default function Leadership() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
      {/* Introduction */}
      <section className="max-w-3xl">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-display">Directory</span>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-navy tracking-tight leading-tight mt-1">
          Group Leadership
        </h1>
        <p className="mt-4 text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
          The AWS Student Builder Group at Chandigarh University – Uttar Pradesh operations are managed by student leaders under department advisement.
        </p>
        <div className="h-[2px] w-12 bg-aws-orange mt-4"></div>
      </section>

      {/* Leadership Directory */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Abhay Shukla */}
        <div className="tech-card-new rounded p-6 sm:p-8 bg-white border border-slate-200 relative overflow-hidden flex flex-col justify-between border-t-[4px] border-t-aws-orange">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <InitialsAvatar name={siteConfig.leader.name} />
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 font-display block">Student Group Leader</span>
                <h3 className="font-display font-bold text-base text-slate-900 mt-0.5">{siteConfig.leader.name}</h3>
                <p className="text-[10px] text-slate-500 font-sans">{siteConfig.leader.organization}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              {siteConfig.leader.description}
            </p>
          </div>
          <div className="mt-8 border-t border-slate-100 pt-4 flex justify-between items-center text-[10px] font-sans text-slate-400">
            <span>Verified Coordinator</span>
            <Link href="/contact" className="text-brand-navy hover:text-aws-orange font-bold">
              Contact &rarr;
            </Link>
          </div>
        </div>

        {/* Prof. Ajay Kumar Singh */}
        <div className="tech-card-new rounded p-6 sm:p-8 bg-white border border-slate-200 relative overflow-hidden flex flex-col justify-between border-t-[4px] border-t-brand-navy">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <InitialsAvatar name={siteConfig.facultyContact.name} />
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 font-display block">Faculty Advisory</span>
                <h3 className="font-display font-bold text-base text-slate-900 mt-0.5">{siteConfig.facultyContact.name}</h3>
                <p className="text-[10px] text-slate-500 font-sans">{siteConfig.facultyContact.department}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              {siteConfig.facultyContact.description}
            </p>
          </div>
          <div className="mt-8 border-t border-slate-100 pt-4 flex justify-between items-center text-[10px] font-sans text-slate-400">
            <span>{siteConfig.facultyContact.organization}</span>
            <a href={siteConfig.safeEmailLink} className="text-brand-navy hover:text-aws-orange font-bold">
              Contact Liaison &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* Advisory policy notice */}
      <section className="bg-slate-50 border border-slate-200 rounded-lg p-6 max-w-xl mx-auto text-center">
        <p className="text-[11px] text-slate-500 font-sans">
          🛡️ In compliance with transparency guidelines, personal phone numbers, student registration IDs, and internal faculty credentials are not publicly exposed on this website.
        </p>
      </section>
    </div>
  );
}
