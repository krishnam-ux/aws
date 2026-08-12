import Link from 'next/link';
import { siteConfig } from '@/data/siteConfig';

export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-10">
      <section className="space-y-4">
        <span className="text-xs uppercase tracking-widest text-aws-orange font-bold font-display">Legal Policies</span>
        <h1 className="font-display font-extrabold text-4xl text-white tracking-tight">
          Terms of Use
        </h1>
        <p className="text-xs text-slate-500 font-sans">Last Updated: August 2026</p>
        <div className="h-[2px] w-20 bg-aws-orange mt-6"></div>
      </section>

      <section className="glass-panel border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 font-sans text-sm text-slate-300 leading-relaxed">
        <div className="space-y-3">
          <h3 className="font-display font-bold text-white text-lg">1. Operational Scope</h3>
          <p>
            Welcome to the community website of the AWS Student Builder Group at Chandigarh University – Uttar Pradesh. These Terms of Use govern your access to and use of this site. By browsing this website or submitting registration inputs, you agree to these terms.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-display font-bold text-white text-lg">2. Community Nature</h3>
          <p>
            This website is maintained by student volunteers. It is designed to share learning materials, official resource links, and study schedule logs. We do not charge fees for membership, workshops, study materials, or event registrations.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-display font-bold text-white text-lg">3. Technical Accuracy & Resource Links</h3>
          <p>
            We compile links to official cloud documentation (AWS Skill Builder, AWS Whitepapers) for educational purposes. We make no warranties regarding the uptime, validity, or content of these external links. We encourage students to cross-reference guides directly with official documentation.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-display font-bold text-white text-lg">4. University & AWS Disclaimers</h3>
          <p>
            📢 <strong>Chandigarh University:</strong> This is a student-managed website and is not the official website of Chandigarh University.
          </p>
          <p>
            ☁️ <strong>Amazon Web Services:</strong> This website represents a student community within the AWS Student Builder Group ecosystem and is not the AWS corporate website.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-display font-bold text-white text-lg">5. Modification of Content</h3>
          <p>
            Our student organizing team reserves the right to edit, modify, or delete any content on this website, including listing details, leadership records, and activity schedules, to ensure compliance with university codes.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-display font-bold text-white text-lg">6. Contact Email</h3>
          <p>
            For questions regarding these terms, please contact: <br />
            <a href={siteConfig.safeEmailLink} className="text-white hover:text-aws-orange font-bold font-mono">{siteConfig.email}</a>
          </p>
        </div>
      </section>
    </div>
  );
}
