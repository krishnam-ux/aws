import Link from 'next/link';
import { siteConfig } from '@/data/siteConfig';

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
    <div className="h-10 w-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center font-display font-extrabold text-xs text-brand-navy flex-shrink-0">
      {initials}
    </div>
  );
}

export default function Home() {
  const exploreTechnologies = [
    { title: 'AWS Cloud', desc: 'Core cloud infrastructure, virtualization foundations, VPC networks, and serverless compute paradigms.' },
    { title: 'AI & Machine Learning', desc: 'Exploring prediction pipelines, modeling, dataset training steps, and SageMaker toolsets.' },
    { title: 'Data & Analytics', desc: 'Data lakes, warehouse scaling, stream event processing, and reporting frameworks.' },
    { title: 'DevOps', desc: 'Continuous deployment pipelines, automated tests, and Infrastructure as Code workflows.' },
    { title: 'Cybersecurity', desc: 'Identity access security rules, encryption, security group filters, and audit logs.' },
    { title: 'Generative AI', desc: 'Understanding Foundation Models, token configurations, and building search agents.' }
  ];

  const aboutPrinciples = [
    { label: 'Learn', desc: 'Study cloud architectures, artificial intelligence, and developer methodologies.' },
    { label: 'Build', desc: 'Deploy cloud repositories, script automations, and launch software products.' },
    { label: 'Collaborate', desc: 'Coordinate peer study cohorts and review codebase designs.' },
    { label: 'Participate', desc: 'Engage in workshops, discussion panels, and group reviews.' },
    { label: 'Share', desc: 'Contribute technical notes, write docs, and showcase projects.' },
    { label: 'Explore', desc: 'Track release schedules, evaluate cloud metrics, and learn new frameworks.' }
  ];

  return (
    <div className="flex flex-col w-full bg-white text-slate-900 font-sans">
      {/* 1. HERO SECTION (55/45 Split Grid, max-width 1240px) */}
      <section className="bg-white border-b border-border-gray py-12 sm:py-16">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Hero Left (55% content) */}
          <div className="lg:col-span-7 space-y-4">
            <span className="text-[10px] font-bold tracking-widest text-aws-orange font-display block uppercase">
              AWS STUDENT BUILDER GROUP
            </span>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5.5xl text-brand-navy tracking-tight leading-none">
              Build. Learn. Explore.
            </h1>
            <h2 className="font-display font-semibold text-xs sm:text-sm text-slate-655 tracking-tight leading-tight uppercase tracking-wider">
              AWS Student Builder Group at Chandigarh University – Uttar Pradesh
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-sans leading-relaxed max-w-lg">
              A student-led technology community focused on cloud computing, artificial intelligence, data, DevOps and hands-on technology learning.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="https://chat.whatsapp.com/HuEI5i4I8KkEya47yBKynD"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary py-1.5 px-4 text-xs"
              >
                Join the Community
              </a>
              <Link href="/activities" className="btn-secondary py-1.5 px-4 text-xs">
                Explore Activities
              </Link>
            </div>
          </div>

          {/* Hero Right (45% visual): Premium Cloud Architecture Visual */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm aspect-square bg-[#F8FAFC] border border-border-gray rounded-md p-6 flex items-center justify-center relative overflow-hidden">
              <svg className="w-full h-full text-slate-200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 10h180v180H10z" stroke="#ECEFF3" strokeWidth="1" strokeDasharray="4 4" />
                <path d="M50 10v180M100 10v180M150 10v180M10 50h180M10 100h180M10 150h180" stroke="#F4F6F9" strokeWidth="1" />
                
                {/* Cloud Boundary Outline Path */}
                <path d="M60 90a20 20 0 0118-20 25 25 0 0144-10 20 20 0 0134 10 20 20 0 014 40H60a20 20 0 010-20z" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeDasharray="2 2" />

                {/* Server blocks in deep navy (6-8px radius style) */}
                <rect x="75" y="85" width="22" height="14" rx="2" fill="#0B1B2B" stroke="#D8DEE6" strokeWidth="1" />
                <rect x="105" y="85" width="22" height="14" rx="2" fill="#0B1B2B" stroke="#D8DEE6" strokeWidth="1" />
                <rect x="75" y="115" width="22" height="14" rx="2" fill="#0B1B2B" stroke="#D8DEE6" strokeWidth="1" />
                <rect x="105" y="115" width="22" height="14" rx="2" fill="#0B1B2B" stroke="#D8DEE6" strokeWidth="1" />

                {/* Network topology line mappings */}
                <line x1="86" y1="99" x2="86" y2="115" stroke="#146EF5" strokeWidth="1.5" />
                <line x1="116" y1="99" x2="116" y2="115" stroke="#146EF5" strokeWidth="1.5" />
                <line x1="97" y1="92" x2="105" y2="92" stroke="#FF9900" strokeWidth="1.5" />
                <line x1="97" y1="122" x2="105" y2="122" stroke="#FF9900" strokeWidth="1.5" />

                {/* Connector Nodes */}
                <circle cx="100" cy="50" r="5" fill="#146EF5" />
                <circle cx="138" cy="70" r="4.5" fill="#FF9900" />
                
                {/* Connecting lines from Cloud to main network */}
                <path d="M100 55v15M138 75l-10 10" stroke="#CBD5E1" strokeWidth="1" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* 2. COMMUNITY SNAPSHOT (Light Gray Background, py-8 spacing, dividers) */}
      <section className="bg-[#F5F7FA] border-b border-border-gray py-8">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs font-sans text-slate-500 divide-y md:divide-y-0 lg:divide-x divide-slate-200">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-display">COMMUNITY</span>
              <p className="font-bold text-slate-800 text-xs">{siteConfig.orgShortName}</p>
            </div>
            <div className="pt-4 md:pt-0 lg:pl-6 space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-display">UNIVERSITY</span>
              <p className="font-bold text-slate-800 text-xs">Chandigarh University – Uttar Pradesh</p>
            </div>
            <div className="pt-4 md:pt-0 lg:pl-6 space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-display">LEADERSHIP</span>
              <p className="font-bold text-slate-800 text-xs">{siteConfig.leader.name}</p>
            </div>
            <div className="pt-4 md:pt-0 lg:pl-6 space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-display">FOCUS</span>
              <p className="font-bold text-slate-800 text-xs">Cloud &bull; AI &bull; Data &bull; DevOps</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DARK CLOUD SECTION (Deep Navy background `#0B1B2B`) */}
      <section className="py-16 sm:py-20 bg-brand-navy border-b border-navy-dark text-white">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-aws-orange font-display">WHAT WE EXPLORE</span>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight leading-tight">
              Cloud, AI & Emerging Technology
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exploreTechnologies.map((tech, idx) => (
              <div
                key={idx}
                className="group p-6 bg-navy-dark border border-slate-800 rounded-md flex flex-col justify-between h-full transition-colors hover:border-aws-orange"
              >
                <div className="space-y-4">
                  {/* Clean Technical monochrome icon accent */}
                  <div className="h-6 w-6 text-aws-orange mb-2">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <h4 className="font-display font-bold text-white text-sm">{tech.title}</h4>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">{tech.desc}</p>
                </div>
                <div className="pt-6 flex items-center text-[10px] font-bold text-aws-orange transition-colors">
                  <span>Explore Parameters</span>
                  <span className="inline-block transition-transform duration-200 group-hover:translate-x-1 ml-1">&rarr;</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. ABOUT SECTION (Split Editorial Layout with bullet list) */}
      <section className="py-16 sm:py-20 bg-white border-b border-border-gray">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-display block">ABOUT THE COMMUNITY</span>
            <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-brand-navy tracking-tight">
              Learn. Build. Collaborate.
            </h3>
          </div>
          
          {/* Right Column */}
          <div className="lg:col-span-7 space-y-8">
            <p className="text-xs sm:text-sm text-slate-600 font-sans leading-relaxed">
              AWS Student Builder Group at Chandigarh University – Uttar Pradesh is a student-led technology community focused on learning, experimentation, collaboration and project building across cloud computing, artificial intelligence, data, DevOps and emerging technologies.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              {aboutPrinciples.map((item, idx) => (
                <div key={idx} className="space-y-1 font-sans text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-aws-orange"></span>
                    <strong className="text-slate-800">{item.label}</strong>
                  </div>
                  <p className="text-slate-500 pl-3 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. VERIFICATION SECTION */}
      <section className="py-16 sm:py-20 bg-[#F5F7FA] border-b border-border-gray">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-display">VERIFICATION</span>
            <h2 className="font-display font-extrabold text-2xl text-brand-navy tracking-tight leading-tight mt-1">
              Community Verification
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* AWS Builder Center */}
            <div className="tech-card-new rounded-md p-6 flex flex-col justify-between h-full border-t-[3px] border-t-aws-orange bg-white">
              <div className="space-y-4">
                <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold font-sans uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-650">
                  PUBLIC LISTING
                </span>
                <h4 className="font-display font-bold text-slate-900 text-sm">AWS BUILDER CENTER</h4>
                <p className="text-xs text-slate-500 font-sans leading-relaxed">
                  AWS Student Builder Group listing status.
                </p>
              </div>
              <div className="pt-6">
                {siteConfig.AWS_BUILDER_CENTER_URL ? (
                  <a href={siteConfig.AWS_BUILDER_CENTER_URL} target="_blank" rel="noopener noreferrer" className="btn-primary py-1.5 text-xs w-full text-center">
                    View Official Listing
                  </a>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400 font-sans">
                    Coming Soon
                  </span>
                )}
              </div>
            </div>

            {/* University Association */}
            <div className="tech-card-new rounded-md p-6 flex flex-col justify-between h-full border-t-[3px] border-t-brand-navy bg-white">
              <div className="space-y-4">
                <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold font-sans uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-650">
                  UNIVERSITY ASSOCIATION
                </span>
                <h4 className="font-display font-bold text-slate-900 text-sm">UNIVERSITY ASSOCIATION</h4>
                <div className="text-xs text-slate-500 font-sans space-y-1">
                  <p className="font-bold text-slate-800">School of Computer Science and Engineering</p>
                  <p>Chandigarh University – Uttar Pradesh</p>
                </div>
              </div>
              <div className="pt-6">
                <Link href="/verification" className="text-xs text-brand-navy hover:text-aws-orange font-bold font-sans">
                  Learn Verification standing &rarr;
                </Link>
              </div>
            </div>

            {/* Community Contact */}
            <div className="tech-card-new rounded-md p-6 flex flex-col justify-between h-full border-t-[3px] border-t-aws-blue bg-white">
              <div className="space-y-4">
                <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold font-sans uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-650">
                  COMMUNITY CONTACT
                </span>
                <h4 className="font-display font-bold text-slate-900 text-sm">COMMUNITY LEADERSHIP</h4>
                <div className="text-xs text-slate-500 font-sans space-y-1">
                  <p className="font-bold text-slate-800">Abhay Shukla</p>
                  <p>AWS Student Builder Group Leader</p>
                </div>
              </div>
              <div className="pt-6">
                <a href="mailto:shuklaabhayas0@gmail.com" className="text-xs text-brand-navy hover:text-aws-orange font-bold font-sans">
                  Get in Touch &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. LEADERSHIP (Initials Avatars) */}
      <section className="py-16 sm:py-20 bg-white border-b border-border-gray">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-display">COORDINATORS</span>
            <h2 className="font-display font-extrabold text-2xl text-brand-navy tracking-tight leading-tight mt-1">
              Community Leadership
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Abhay Shukla */}
            <div className="tech-card-new rounded-md p-6 flex items-start space-x-4 bg-white">
              <InitialsAvatar name={siteConfig.leader.name} />
              <div className="space-y-2 font-sans text-xs">
                <h4 className="font-bold text-slate-900 text-sm font-display">{siteConfig.leader.name}</h4>
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">{siteConfig.leader.role}</p>
                <p className="text-slate-600 leading-relaxed">{siteConfig.leader.description}</p>
              </div>
            </div>

            {/* Prof. Ajay Kumar Singh */}
            <div className="tech-card-new rounded-md p-6 flex items-start space-x-4 bg-white">
              <InitialsAvatar name={siteConfig.facultyContact.name} />
              <div className="space-y-2 font-sans text-xs">
                <h4 className="font-bold text-slate-900 text-sm font-display">{siteConfig.facultyContact.name}</h4>
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Faculty Advisory</p>
                <p className="text-slate-600 leading-relaxed">{siteConfig.facultyContact.description}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. EVENTS Section Empty State */}
      <section className="py-16 sm:py-20 bg-[#F5F7FA] border-b border-border-gray">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="max-w-2xl">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-display">CALENDAR</span>
            <h2 className="font-display font-extrabold text-2xl text-brand-navy tracking-tight leading-tight mt-1">
              NO UPCOMING EVENTS
            </h2>
          </div>

          <div className="tech-card-new rounded-md p-8 sm:p-12 text-center bg-white border border-border-gray max-w-xl mx-auto">
            <h4 className="font-display font-bold text-slate-900 text-sm mb-2">No upcoming events have been published yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              We are working to complete academic clearances for our local study workshops. Please check back later.
            </p>
          </div>
        </div>
      </section>

      {/* 8. COLLABORATE */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-display">PARTNERSHIP</span>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-brand-navy">
            COLLABORATE WITH THE COMMUNITY
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed font-sans">
            We welcome opportunities to collaborate with educational organizations, technology communities, mentors, speakers and learning platforms on student-focused technical initiatives.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <a
              href="https://chat.whatsapp.com/HuEI5i4I8KkEya47yBKynD"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs py-1.5 px-4"
            >
              Join the Community
            </a>
            <Link href="/collaborate" className="btn-secondary text-xs py-1.5 px-4">
              Start a Conversation
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
