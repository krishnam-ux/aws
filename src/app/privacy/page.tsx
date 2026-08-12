import Link from 'next/link';
import { siteConfig } from '@/data/siteConfig';

export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-10">
      <section className="space-y-4">
        <span className="text-xs uppercase tracking-widest text-aws-orange font-bold font-display">Legal Policies</span>
        <h1 className="font-display font-extrabold text-4xl text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-500 font-sans">Last Updated: August 2026</p>
        <div className="h-[2px] w-20 bg-aws-orange mt-6"></div>
      </section>

      <section className="glass-panel border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 font-sans text-sm text-slate-300 leading-relaxed">
        <div className="space-y-3">
          <h3 className="font-display font-bold text-white text-lg">1. Student Registration Data</h3>
          <p>
            The AWS Student Builder Group at Chandigarh University – Uttar Pradesh community operates forms on this site (e.g. Join the Community, Contact Us, and Verification Requests) as frontend components.
          </p>
          <p>
            Because we do not have an active database backend connected to this static build, your inputted form details are processed strictly inside your local browser scripts. They are not stored on our server, transmitted to third parties, or cached in any database.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-display font-bold text-white text-lg">2. Email Communications</h3>
          <p>
            When you send emails to our official Gmail address (<a href={siteConfig.safeEmailLink} className="text-aws-orange hover:underline">{siteConfig.email}</a>), your email address, message body, and attachment data are handled securely via standard Gmail servers. We use these details strictly to respond to student inquiries or verify partnership proposals. We never sell, distribute, or compile these emails into marketing lists.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-display font-bold text-white text-lg">3. Non-Disclosure of Confidential Records</h3>
          <p>
            In accordance with our community policy, we do not host, leak, or publish sensitive student IDs, phone numbers, department administrative grades, or private email listings. If you need details on specific records, please contact our university liaison.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-display font-bold text-white text-lg">4. University & Corporate Disclaimer</h3>
          <p>
            This website is a student-managed community resource. It is not operating under direct administrative control of Chandigarh University. We do not store or read university login database records. This site is also independent of Amazon Web Services corporate cloud management.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-display font-bold text-white text-lg">5. Contact Information</h3>
          <p>
            For questions regarding privacy parameters or local browser data, please write to: <br />
            <a href={siteConfig.safeEmailLink} className="text-white hover:text-aws-orange font-bold font-mono">{siteConfig.email}</a>
          </p>
        </div>
      </section>
    </div>
  );
}
