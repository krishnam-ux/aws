import { siteConfig } from '@/data/siteConfig';
import SectionHeader from '@/components/SectionHeader';

export default function Governance() {
  const roles = [
    {
      title: 'Group Leader',
      description: 'Coordinates core community operations, manages AWS Builder Center directory listing, acts as student liaison, and communicates with faculty advisors.',
      responsibility: 'Overall steering, administrative approvals, external partner relations, program coordination.',
      status: 'Assigned (Abhay Shukla)'
    },
    {
      title: 'Student Organizing Team',
      description: 'Handles event coordination, student registration processes, community communications, website updates, and study cohort management.',
      responsibility: 'Logistics management, resource compilation, marketing within university regulations, form review.',
      status: 'Volunteer positions will be announced as the community grows.'
    },
    {
      title: 'Event Volunteers',
      description: 'Supports session operations, workshop assistance, set up virtual channels or workspace setups, and gathers feedback.',
      responsibility: 'Technical support during sessions, attendee lists, post-event resource sharing.',
      status: 'Volunteer positions will be announced as the community grows.'
    },
    {
      title: 'Technical Volunteers',
      description: 'Assists in project code reviews, designs sandbox tutorial setups, answers technical queries, and guides project cohorts.',
      responsibility: 'Answering technical channel questions, compiling official documentation links, mentoring peer developers.',
      status: 'Volunteer positions will be announced as the community grows.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
      {/* Introduction */}
      <section className="max-w-3xl">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-display">How We Operate</span>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-navy tracking-tight leading-tight mt-1">
          Community Governance
        </h1>
        <p className="mt-4 text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
          The community is student-led and operates around learning, technical activities, collaboration and responsible technology exploration.
        </p>
        <div className="h-[2px] w-12 bg-aws-orange mt-4"></div>
      </section>

      {/* Governance Model & Principles */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="tech-card rounded-lg p-6 sm:p-8 bg-white border border-slate-200 space-y-4">
          <h3 className="font-display font-bold text-slate-900 text-sm uppercase tracking-wider">Structure & Alignment</h3>
          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            Our governance models are structured to encourage transparency, verify technical accuracy, and respect student and faculty parameters. We run this group in accordance with standard student community operational guidelines.
          </p>
          <div className="border-t border-slate-100 pt-4 space-y-2.5 text-xs text-slate-500 font-sans">
            <p className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-aws-orange"></span>
              <strong>Facilitation:</strong> Peer learning rather than hierarchical instruction.
            </p>
            <p className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-aws-orange"></span>
              <strong>Moderation:</strong> Moderated by student volunteers under department advisement.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-3">
          <h3 className="font-display font-bold text-slate-900 text-sm uppercase tracking-wider">Responsible Exploration</h3>
          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            All code repositories, project collaborations, and learning labs are monitored to prevent security risks, software plagiarism, or misuse of cloud sandboxes. We require members to adhere to academic integrity rules and ethical cloud usage.
          </p>
          <p className="text-[10px] text-slate-400 font-sans">
            *No internal database access or account details of Chandigarh University are accessed, stored, or operated by this website or group.
          </p>
        </div>
      </section>

      {/* Governance Roles Table/Grid */}
      <section className="space-y-8">
        <SectionHeader 
          title="Community Roles & Status" 
          subtitle="Specific team scopes and their current enrollment status." 
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role, idx) => (
            <div key={idx} className="tech-card rounded-lg p-6 bg-white border border-slate-200 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <h4 className="font-display font-bold text-slate-900 text-sm">{role.title}</h4>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold font-sans uppercase tracking-wider border ${
                    role.status.includes('Assigned') 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    {role.status.includes('Assigned') ? 'Active' : 'Pending'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-sans leading-relaxed">{role.description}</p>
                <div className="text-[10px] text-slate-500 font-sans bg-slate-50 p-3 rounded border border-slate-100">
                  <strong>Responsibility:</strong> {role.responsibility}
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3 text-[10px] text-slate-400 font-sans">
                {role.status}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
