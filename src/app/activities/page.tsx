import { siteConfig } from '@/data/siteConfig';
import SectionHeader from '@/components/SectionHeader';
import EmptyState from '@/components/EmptyState';

export default function Activities() {
  const categories = [
    'Cloud Learning',
    'Technical Workshops',
    'Hands-on Labs',
    'Project Building',
    'AI & Machine Learning',
    'Data & Analytics',
    'DevOps',
    'Cybersecurity',
    'Hackathons',
    'Community Discussions'
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
      {/* Introduction */}
      <section className="max-w-3xl">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-display">Technical Modules</span>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-navy tracking-tight leading-tight mt-1">
          Activity Directory
        </h1>
        <p className="mt-4 text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
          Our community facilitates peer learning, study circles, and coding walkthroughs. All official workshop dates and timelines will be logged here once validated.
        </p>
        <div className="h-[2px] w-12 bg-aws-orange mt-4"></div>
      </section>

      {/* Focus Verticals */}
      <section className="space-y-4">
        <h3 className="font-display font-bold text-slate-900 text-xs uppercase tracking-wider">Activity Verticals</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-3 py-1.5 rounded bg-white border border-slate-200 text-xs font-semibold text-slate-700 font-sans"
            >
              {cat}
            </span>
          ))}
        </div>
      </section>

      {/* Main Empty State */}
      <section className="py-6">
        <EmptyState 
          title="No upcoming activities have been published yet" 
          description="We are configuring academic study timetables and workshop lab resources. Verified schedules will be listed here." 
          badgeText="Operational Directory"
        />
      </section>

      {/* Policy card */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 max-w-xl mx-auto text-center space-y-1">
        <p className="text-[11px] text-slate-500 font-sans">
          📢 <strong>Notice:</strong> In alignment with our authenticity principles, we do not populate our directory with mock events or unconfirmed schedules.
        </p>
      </section>
    </div>
  );
}
