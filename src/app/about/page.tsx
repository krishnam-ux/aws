import { siteConfig } from '@/data/siteConfig';
import SectionHeader from '@/components/SectionHeader';

export default function About() {
  const studentActions = [
    {
      title: 'Learn Cloud & AI foundations',
      description: 'Study cloud computing parameters, deep learning models, serverless frameworks, and API settings using official guides.',
    },
    {
      title: 'Build secure, hands-on projects',
      description: 'Deploy real-world infrastructures with Infrastructure-as-Code (IaC), build ML algorithms, and configure microservices.',
    },
    {
      title: 'Collaborate in peer study cohorts',
      description: 'Coordinate developer projects, run code studies, and prepare for technical assessments.',
    },
    {
      title: 'Participate in peer learning sessions',
      description: 'Attend structured technical roundtables, hands-on lab sessions, and peer feedback meetings.',
    },
    {
      title: 'Share knowledge & findings',
      description: 'Deliver code reviews, explain architectures, and compile study files for peer reference.',
    },
    {
      title: 'Explore emerging technology',
      description: 'Stay updated with framework updates, serverless parameter optimizations, and secure engineering benchmarks.',
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
      {/* Editorial Intro */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-4">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-display">Who We Are</span>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-navy tracking-tight leading-tight">
            AWS Student Builder Group at Chandigarh University – UP
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
            AWS Student Builder Group at Chandigarh University – Uttar Pradesh is a student-led technology community focused on learning, experimentation, collaboration and project building across cloud computing, artificial intelligence, data, DevOps and emerging technologies.
          </p>
        </div>
        <div className="lg:col-span-5 bg-white border border-border-gray rounded p-6 sm:p-8 space-y-4">
          <h3 className="font-display font-bold text-slate-900 text-sm uppercase tracking-wider">Group Scope</h3>
          <p className="text-xs text-slate-500 font-sans leading-relaxed">
            Our student group acts as a focus circle inside the AWS Builder ecosystem. We facilitate technical competency through practical, self-paced learning and student workshops.
          </p>
        </div>
      </section>

      {/* Action Directory */}
      <section className="space-y-10">
        <SectionHeader 
          eyebrow="ACTIVITIES"
          title="What Students Can Do" 
          subtitle="Explore the different technical activities coordinated by our student volunteers." 
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studentActions.map((action, idx) => (
            <div key={idx} className="tech-card-new rounded p-6 space-y-2 bg-white">
              <span className="text-aws-orange font-bold text-[10px] uppercase tracking-wide font-display">Activity 0{idx + 1}</span>
              <h3 className="font-display font-bold text-slate-900 text-sm">{action.title}</h3>
              <p className="text-xs text-slate-500 font-sans leading-relaxed">{action.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Principles */}
      <section className="space-y-10">
        <SectionHeader 
          eyebrow="VALUES"
          title="Our Operating Principles" 
          subtitle="The governing parameters for our study groups, technical reviews, and community channels." 
          center 
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {siteConfig.principles.map((pr, idx) => (
            <div 
              key={idx} 
              className="tech-card-new rounded p-6 border-t-[3px] border-t-aws-orange bg-white flex flex-col justify-between text-center"
            >
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-display block mb-3">Principle 0{idx + 1}</span>
                <h4 className="font-display font-bold text-slate-900 text-xs mb-2">{pr.title}</h4>
              </div>
              <p className="text-[11px] text-slate-500 font-sans leading-relaxed mt-2">{pr.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
