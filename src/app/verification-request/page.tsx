'use client';

import { useState } from 'react';
import { siteConfig } from '@/data/siteConfig';

export default function VerificationRequest() {
  const [formData, setFormData] = useState({
    orgName: '',
    name: '',
    email: '',
    reason: 'Academic Verification',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [consent, setConsent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      alert('Please accept the verification check terms before submitting.');
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-12">
      {/* Introduction */}
      <section className="text-center max-w-2xl mx-auto space-y-4">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-display">Academic Audit</span>
        <h1 className="font-display font-extrabold text-3xl text-brand-navy tracking-tight">
          Verification Request
        </h1>
        <p className="text-slate-500 font-sans text-xs sm:text-sm leading-relaxed">
          Educational institutions, organizations and legitimate partners may contact the community for additional verification regarding community leadership, university association or AWS community listing.
        </p>
      </section>

      {submitted ? (
        <div className="tech-card rounded-lg p-8 sm:p-12 text-center space-y-6 max-w-xl mx-auto bg-white border border-slate-200">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="font-display font-bold text-slate-900 text-lg">Verification Request Processed</h3>
          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            Thank you, <strong className="text-slate-800">{formData.name}</strong> ({formData.orgName}). Your request details have been validated.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 text-left text-xs text-amber-800 font-sans space-y-2">
            <p className="font-bold">⚠️ Submission Destination Unconfigured</p>
            <p>
              Because this website runs on a static hosting preview without backend services, request messages are not sent to our database.
            </p>
            <p>
              Please forward your official academic verification check directly to the community coordinator: <br />
              <a href={siteConfig.safeEmailLink} className="underline text-brand-navy font-semibold font-mono block mt-1 hover:text-aws-orange">
                {siteConfig.email}
              </a>
            </p>
          </div>

          <button
            onClick={() => setSubmitted(false)}
            className="btn-secondary py-2 text-xs"
          >
            Edit Request details
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="tech-card rounded-lg p-6 sm:p-10 space-y-6 max-w-2xl mx-auto bg-white border border-slate-200">
          {/* Org & Contact name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label htmlFor="orgName" className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
                Organization / Institution Name *
              </label>
              <input
                type="text"
                id="orgName"
                required
                value={formData.orgName}
                onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                className="form-input-field"
                placeholder="e.g. Chandigarh University, Tech Corp"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
                Your Full Name *
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input-field"
                placeholder="e.g. Dean Name, Manager Name"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
                Official institutional Email *
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="form-input-field"
                placeholder="representative@domain.edu"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reason" className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
                Reason for Verification *
              </label>
              <select
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="form-input-field bg-white"
              >
                <option value="Academic Verification">Academic Standing Verification</option>
                <option value="Directory Listing Status">AWS Builder Center Listing status</option>
                <option value="Partnership Proposal">Partnership proposal checking</option>
                <option value="Speaker Suggestion">Speaker verification</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Message detail */}
          <div className="space-y-1.5">
            <label htmlFor="message" className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
              Verification Request Details *
            </label>
            <textarea
              id="message"
              required
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="form-input-field"
              placeholder="Specify what details are required..."
            ></textarea>
          </div>

          {/* Form Consent policy checkbox */}
          <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-aws-orange focus:ring-aws-orange cursor-pointer"
              />
              <div className="text-[10px] text-slate-500 leading-relaxed font-sans">
                I understand this request is sent to a student-managed community. We will check the credentials provided and respond via official email. Submitting this request does not guarantee immediate verification output.
              </div>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full btn-primary py-3"
            >
              Request Verification
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
