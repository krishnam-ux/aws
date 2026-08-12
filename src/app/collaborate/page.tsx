import { siteConfig } from '@/data/siteConfig';
import SectionHeader from '@/components/SectionHeader';

export default function Collaborate() {
  const collaborationCategories = [
    {
      title: 'Educational Collaboration',
      description: 'Co-design study material, structure technical cohorts, or share cloud resources for computer science education.'
    },
    {
      title: 'Technical Workshops',
      description: 'Host peer-to-peer technical workshops on serverless application deployment, data lake setups, or CI/CD pipelines.'
    },
    {
      title: 'Guest Sessions',
      description: 'Invite industry cloud engineers, solutions architects, security consultants, or AI developers to share industry practices.'
    },
    {
      title: 'Mentorship Program',
      description: 'Provide developer mentorship, resume reviews, portfolio feedback, or technical roadmap advice to university students.'
    },
    {
      title: 'Joint Hackathons',
      description: 'Collaborate with other student technical societies or organizations to run cloud development or AI hackathons.'
    },
    {
      title: 'Structured Learning Programs',
      description: 'Participate in verified free student programs provided by cloud learning platforms or developer networks.'
    },
    {
      title: 'Community Events',
      description: 'Co-organize regional meetups, cloud networking roundtables, or technical panel discussions.'
    },
    {
      title: 'Technology Challenges',
      description: 'Introduce developer tasks, algorithmic puzzles, or infrastructure challenges for students to build solutions.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
      {/* Introduction */}
      <section className="max-w-3xl">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-display">Partnership</span>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-navy tracking-tight leading-tight mt-1">
          Collaborate With the Community
        </h1>
        <p className="mt-4 text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
          We welcome opportunities to collaborate with educational organizations, technology communities, mentors, speakers and learning platforms on student-focused technical initiatives.
        </p>
        <div className="h-[2px] w-12 bg-aws-orange mt-4"></div>
      </section>

      {/* Grid of Collaboration Areas */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {collaborationCategories.map((collab, idx) => (
          <div key={idx} className="tech-card rounded-lg p-6 bg-white border border-slate-200 hover:border-slate-300 transition-all">
            <h4 className="font-display font-bold text-slate-900 text-sm mb-2">{collab.title}</h4>
            <p className="text-xs text-slate-500 font-sans leading-relaxed">{collab.description}</p>
          </div>
        ))}
      </section>

      {/* Trust & Collaboration Status Notice */}
      <section className="tech-card rounded-lg p-8 bg-white border border-slate-200 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <h3 className="font-display font-bold text-slate-900 text-sm uppercase tracking-wider">Partner Verification Policy</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-sans">
            We list partners only after a formal agreement is completed. We do not claim any official affiliations under discussion.
          </p>
          <p className="text-aws-orange font-bold text-xs uppercase tracking-wider font-display pt-2">
            Exploring Educational Collaborations
          </p>
        </div>
        <div className="flex-shrink-0">
          <a
            href={siteConfig.safeEmailLink}
            className="btn-primary py-3 text-xs"
          >
            Start a Conversation
          </a>
        </div>
      </section>

      {/* Email Information card */}
      <section className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center max-w-md mx-auto">
        <p className="text-xs text-slate-500 font-sans">
          📧 To initiate a formal collaboration, reach us directly at: <br />
          <a href={siteConfig.safeEmailLink} className="text-brand-navy hover:text-aws-orange font-bold select-all font-mono text-sm block mt-2">
            {siteConfig.email}
          </a>
        </p>
      </section>
    </div>
  );
}
