'use client';

import { useState } from 'react';
import { siteConfig } from '@/data/siteConfig';

export default function Join() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    university: 'Chandigarh University – Uttar Pradesh',
    program: '',
    year: '1st Year',
    experienceLevel: 'Beginner',
    message: '',
  });

  const [interests, setInterests] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [consent, setConsent] = useState(false);

  const interestOptions = [
    'AWS Cloud',
    'AI',
    'ML',
    'Data Science',
    'DevOps',
    'Cybersecurity',
    'Generative AI',
    'Other'
  ];

  const handleInterestChange = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter((i) => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      alert('Please agree to the privacy statement and data usage terms before registering.');
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-12">
      {/* Introduction */}
      <section className="text-center max-w-2xl mx-auto space-y-4">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-display">Student Registration</span>
        <h1 className="font-display font-extrabold text-3xl text-brand-navy tracking-tight">
          Join the Community
        </h1>
        <p className="text-slate-500 font-sans text-xs sm:text-sm leading-relaxed">
          Students interested in cloud computing, AI, data, DevOps and emerging technologies are welcome to connect with the community.
        </p>
      </section>

      {submitted ? (
        <div className="tech-card rounded-lg p-8 sm:p-12 text-center space-y-6 max-w-xl mx-auto bg-white border border-slate-200">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-display font-bold text-slate-900 text-lg">Registration Form Processed</h3>
          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            Thank you, <strong className="text-slate-800">{formData.fullName}</strong>. Your registration details have been validated.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 text-left text-xs text-amber-800 font-sans space-y-2">
            <p className="font-bold">⚠️ Backend Configuration Required</p>
            <p>
              This website is a community-managed frontend prototype. Submission data has not been sent to any cloud database because a secure database backend is not configured for this staging build.
            </p>
            <p>
              To complete your community onboarding officially, please forward your registration details or contact us directly at: <br />
              <a href={siteConfig.safeEmailLink} className="underline text-brand-navy font-semibold font-mono block mt-1 hover:text-aws-orange">
                {siteConfig.email}
              </a>
            </p>
          </div>

          <button
            onClick={() => setSubmitted(false)}
            className="btn-secondary py-2 text-xs"
          >
            Go Back / Edit Details
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="tech-card rounded-lg p-6 sm:p-10 space-y-6 max-w-2xl mx-auto bg-white border border-slate-200">
          {/* General Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
                Full Name *
              </label>
              <input
                type="text"
                id="fullName"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="form-input-field"
                placeholder="e.g. Abhay Shukla"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
                Official Student Email *
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="form-input-field"
                placeholder="studentname@gmail.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="university" className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
                University
              </label>
              <input
                type="text"
                id="university"
                disabled
                value={formData.university}
                className="w-full px-3.5 py-2.5 bg-slate-50 rounded border border-slate-200 text-slate-500 text-xs font-sans select-none cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="program" className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
                Academic Program / Dept *
              </label>
              <input
                type="text"
                id="program"
                required
                value={formData.program}
                onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                className="form-input-field"
                placeholder="e.g. B.Tech Computer Science"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="year" className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
                Academic Year *
              </label>
              <select
                id="year"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="form-input-field bg-white"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="Postgraduate">Postgraduate</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="experienceLevel" className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
                Experience Level *
              </label>
              <select
                id="experienceLevel"
                value={formData.experienceLevel}
                onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                className="form-input-field bg-white"
              >
                <option value="Beginner">Beginner (No cloud background)</option>
                <option value="Intermediate">Intermediate (Used AWS or coding experience)</option>
                <option value="Advanced">Advanced (Completed certifications or deployed stacks)</option>
              </select>
            </div>
          </div>

          {/* Technical Interests */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display block">
              Technical Interests (Select all that apply)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {interestOptions.map((opt) => {
                const isChecked = interests.includes(opt);
                return (
                  <label
                    key={opt}
                    className={`flex items-center space-x-2.5 px-3 py-2 rounded border text-xs font-sans font-medium cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-aws-orange/10 border-aws-orange/40 text-brand-navy'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-350'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleInterestChange(opt)}
                      className="sr-only"
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Message / Motivation */}
          <div className="space-y-1.5">
            <label htmlFor="message" className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
              Why are you interested in joining? *
            </label>
            <textarea
              id="message"
              required
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="form-input-field"
              placeholder="Tell us about what you want to learn or build with the community..."
            ></textarea>
          </div>

          {/* Privacy & Legal disclaimer */}
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
                I understand that this is a registration form for a student-led community. My information is processed locally for validation preview purposes. By signing up, I understand this site is not hosted or operated by AWS or Chandigarh University corporate entities directly.
              </div>
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full btn-primary py-3"
            >
              Submit Registration
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
