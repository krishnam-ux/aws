'use client';

import { useState } from 'react';
import { siteConfig } from '@/data/siteConfig';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [consent, setConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      alert('Please read and accept the data privacy notice before submitting.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          organization: 'Student / Visitor',
          type: formData.subject,
          message: formData.message
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Failed to send message. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
      {/* Introduction */}
      <section className="max-w-3xl">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-display">Get In Touch</span>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-navy tracking-tight leading-tight mt-1">
          Contact Us
        </h1>
        <p className="mt-4 text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
          Questions about community standing, study groups, or session registrations? Fill out the form or write to our coordinator.
        </p>
        <div className="h-[2px] w-12 bg-aws-orange mt-4"></div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Info (LHS) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="tech-card rounded-lg p-6 bg-white border border-slate-200 space-y-6 relative overflow-hidden">
            <h3 className="font-display font-bold text-slate-900 text-base">Directory Contact</h3>

            <div className="space-y-4 font-sans text-xs text-slate-600">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-display">Organization</span>
                <p className="font-semibold text-slate-800">{siteConfig.orgName}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-display">Group Leader</span>
                <p className="font-semibold text-slate-800">{siteConfig.leader.name}</p>
                <p className="text-[10px] text-slate-500">{siteConfig.leader.role}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-display">Faculty Liaison</span>
                <p className="font-semibold text-slate-800">{siteConfig.facultyContact.name}</p>
                <p className="text-[10px] text-slate-500">{siteConfig.facultyContact.department}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-display">University Location</span>
                <p className="font-semibold text-slate-800">{siteConfig.location}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions Buttons */}
          <div className="space-y-3">
            <a
              href={siteConfig.safeEmailLink}
              className="w-full btn-primary text-center py-2.5 text-xs block"
            >
              ✉️ Email Group Directly
            </a>
            
            <div className="bg-white border border-slate-200 rounded p-4 text-center">
              <p className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">Verified Group Email Address</p>
              <p className="font-semibold text-slate-800 font-mono text-xs mt-1 select-all">{siteConfig.email}</p>
            </div>
          </div>
        </div>

        {/* Contact Form (RHS) */}
        <div className="lg:col-span-7">
          {submitted ? (
            <div className="tech-card rounded-lg p-8 sm:p-10 text-center space-y-6 bg-white border border-slate-200 shadow-sm">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l8-4a2 2 0 011.78 0l8 4A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-slate-900 text-lg">Message Sent</h3>
              <p className="text-xs text-slate-650 font-sans leading-relaxed">
                Thank you, <strong className="text-slate-800">{formData.name}</strong>. Your inquiry has been successfully delivered to our community team.
              </p>

              <p className="text-xs text-slate-500 font-sans leading-relaxed">
                Our student coordinators will review your submission and reply to you at <strong className="text-slate-800">{formData.email}</strong> as soon as possible.
              </p>

              <button
                onClick={() => {
                  setSubmitted(false);
                  setFormData({
                    name: '',
                    email: '',
                    subject: '',
                    message: '',
                  });
                  setConsent(false);
                }}
                className="btn-secondary py-2 text-xs"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="tech-card rounded-lg p-6 sm:p-8 bg-white border border-slate-200 space-y-5">
              <h3 className="font-display font-bold text-slate-900 text-sm uppercase tracking-wider pb-3 border-b border-slate-100">Send Community Message</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input-field"
                    placeholder="e.g. Student Name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
                    Your Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input-field"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="subject" className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="form-input-field"
                  placeholder="e.g. Session Question, Partnership request"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="message" className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
                  Message Content *
                </label>
                <textarea
                  id="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="form-input-field"
                  placeholder="Enter details..."
                ></textarea>
              </div>

              {/* Data disclaimer */}
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
                    I understand that this form resides on a frontend template. By submitting, I agree that the contact details provided may be used solely for answering my student inquiry and will not be shared externally.
                  </div>
                </label>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-650 text-xs font-sans">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full btn-primary py-3 flex items-center justify-center space-x-2 ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-brand-navy" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : (
                  'Send Message'
                )}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
