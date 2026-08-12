import { siteConfig } from '@/data/siteConfig';
import EmptyState from '@/components/EmptyState';

export default function Updates() {
  const announcements = siteConfig.announcements;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
      {/* Introduction */}
      <section className="max-w-3xl">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-display">News & Announcements</span>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-navy tracking-tight leading-tight mt-1">
          Community Updates
        </h1>
        <p className="mt-4 text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
          Stay informed about study schedules, academic permissions, learning credentials, and notifications.
        </p>
        <div className="h-[2px] w-12 bg-aws-orange mt-4"></div>
      </section>

      {/* Announcements Hub */}
      <section className="space-y-6">
        {announcements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {announcements.map((ann, idx) => (
              <div key={idx} className="tech-card rounded-lg p-6 bg-white border border-slate-200">
                <div className="flex justify-between items-center text-[10px] font-sans text-slate-400 mb-2">
                  <span>{ann.date}</span>
                  <span className="inline-flex px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 text-slate-600">
                    {ann.category}
                  </span>
                </div>
                <h3 className="font-display font-bold text-slate-900 text-sm">{ann.title}</h3>
                <p className="text-xs text-slate-500 font-sans leading-relaxed mt-2">{ann.summary}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState 
            title="No announcements have been published yet" 
            description="We are setting up community study cohorts and verification details. Major announcements will be posted here." 
            badgeText="Log Status"
          />
        )}
      </section>

      {/* CMS Schema Documentation */}
      <section className="bg-slate-50 border border-slate-200 rounded-lg p-6 sm:p-8 max-w-3xl mx-auto space-y-4">
        <h4 className="font-display font-bold text-slate-900 text-xs uppercase tracking-wider">Updates Data Integration</h4>
        <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
          Our community updates feed utilizes a structured layout design supporting standard fields. This allows coordinators to quickly draft announcements without modifying markup.
        </p>
        <div className="bg-white rounded p-4 border border-slate-100 text-[10px] font-mono text-slate-600 overflow-x-auto space-y-1">
          <p className="text-aws-orange">// Announcement structure support:</p>
          <p>{`interface Announcement {`}</p>
          <p>{`  title: string;      // Heading`}</p>
          <p>{`  date: string;       // ISO or readable date`}</p>
          <p>{`  category: string;   // Category Tag (e.g. Schedule, Course)`}</p>
          <p>{`  summary: string;    // Short summary description`}</p>
          <p>{`  content?: string;   // Full body text`}</p>
          <p>{`}`}</p>
        </div>
      </section>
    </div>
  );
}
