'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface FormPageProps {
  params: Promise<{ token: string }>;
}

export default function FoundingMemberFormPage({ params }: FormPageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    university: 'Chandigarh University',
    courseBranch: '',
    yearSemester: '',
    studentId: '',
    photoUrl: '',
    linkedin: '',
    github: '',
    portfolio: '',
    domain: 'Cloud & Infrastructure',
    skills: '',
    experience: '',
    bio: ''
  });

  const [existingSubmission, setExistingSubmission] = useState<{
    formSubmitted: boolean;
    formSubmittedAt: string | null;
  } | null>(null);

  useEffect(() => {
    async function loadMemberData() {
      try {
        setLoading(true);
        setTokenError(null);
        const res = await fetch(`/api/founding-members/form/${token}`, { cache: 'no-store' });
        const data = await res.json();

        if (res.ok && data.valid && data.member) {
          const m = data.member;
          setFormData({
            fullName: m.fullName || '',
            email: m.email || '',
            phone: m.phone || '',
            university: m.university || 'Chandigarh University',
            courseBranch: m.courseBranch || '',
            yearSemester: m.yearSemester || '',
            studentId: m.studentId || '',
            photoUrl: m.photoUrl || '',
            linkedin: m.linkedin || '',
            github: m.github || '',
            portfolio: m.portfolio || '',
            domain: m.domain || 'Cloud & Infrastructure',
            skills: m.skills || '',
            experience: m.experience || '',
            bio: m.bio || ''
          });
          setExistingSubmission({
            formSubmitted: Boolean(m.formSubmitted),
            formSubmittedAt: m.formSubmittedAt
          });
        } else {
          setTokenError(data.error || 'Invalid or expired form link.');
        }
      } catch (err: any) {
        setTokenError(err.message || 'Failed to connect to verification server.');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadMemberData();
    }
  }, [token]);

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Photo size exceeds 2MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, photoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Basic client validation
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setSubmitError('Please fill in all required personal information.');
      return;
    }

    if (!formData.university.trim() || !formData.courseBranch.trim() || !formData.studentId.trim()) {
      setSubmitError('Please complete your academic and roll number details.');
      return;
    }

    if (!formData.domain.trim() || !formData.skills.trim() || !formData.experience.trim()) {
      setSubmitError('Please provide your domain track, skills, and experience.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/founding-members/form/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(data.error || 'Failed to save form. Please try again.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Network error occurred while submitting.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07131F] text-slate-100 font-sans selection:bg-[#FF9900]/30 selection:text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-[#FF9900]/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full text-xs font-mono text-[#FF9900] shadow-sm">
            <span>⭐</span>
            <span>AWS Student Builder Group (CU-UP)</span>
            <span>•</span>
            <span>Founding Member Directory</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight">
            Founding Member Details Form
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Please fill out your official profile, academic records, domain track, and technical expertise to complete your Founding Member registration.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-[#0D2235]/90 border border-white/10 rounded-xl p-12 text-center space-y-4 shadow-xl">
            <div className="inline-block animate-spin h-8 w-8 border-3 border-[#FF9900] border-t-transparent rounded-full" />
            <p className="text-xs text-slate-350 font-mono">Verifying secure member access token...</p>
          </div>
        )}

        {/* Error / Invalid Token State */}
        {!loading && tokenError && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-8 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-white">Invalid or Expired Link</h2>
            <p className="text-xs text-red-300 max-w-md mx-auto">{tokenError}</p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-block px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-bold transition-colors"
              >
                &larr; Return to Home
              </Link>
            </div>
          </div>
        )}

        {/* Success Confirmation Screen */}
        {!loading && !tokenError && submitSuccess && (
          <div className="bg-[#0D2235]/95 border border-emerald-500/40 rounded-2xl p-8 sm:p-10 shadow-2xl space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-3xl shadow-lg">
              ✓
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                Profile Submitted Successfully!
              </h2>
              <p className="text-xs sm:text-sm text-slate-350 max-w-md mx-auto leading-relaxed">
                Thank you, <strong>{formData.fullName}</strong>. Your Founding Member details and domain credentials have been recorded in the central community directory.
              </p>
            </div>

            {/* Quick Profile Summary Card */}
            <div className="bg-[#081827] border border-white/10 rounded-xl p-4 sm:p-5 text-left text-xs font-sans space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="font-bold text-white text-sm">{formData.fullName}</span>
                <span className="px-2 py-0.5 bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/30 rounded text-[10px] font-bold">
                  {formData.domain}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-350">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Email</span>
                  <span className="text-white font-mono">{formData.email}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Student ID</span>
                  <span className="text-white font-mono">{formData.studentId}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">University &amp; Branch</span>
                  <span className="text-white">{formData.university} • {formData.courseBranch}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Phone</span>
                  <span className="text-white font-mono">{formData.phone}</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/"
                className="inline-block px-6 py-2.5 bg-[#FF9900] hover:bg-[#E08800] text-white rounded-lg text-xs font-bold shadow-md transition-colors"
              >
                Go to AWS SBG Home &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Main Details Form */}
        {!loading && !tokenError && !submitSuccess && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Existing Submission Banner if already submitted */}
            {existingSubmission?.formSubmitted && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-amber-200">
                <div className="flex items-center space-x-2">
                  <span>ℹ️</span>
                  <span>
                    You previously submitted this form on{' '}
                    <strong>
                      {existingSubmission.formSubmittedAt
                        ? new Date(existingSubmission.formSubmittedAt).toLocaleDateString()
                        : 'record'}
                    </strong>
                    . You can update your details below.
                  </span>
                </div>
              </div>
            )}

            {submitError && (
              <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-4 text-xs text-red-200 flex items-center justify-between">
                <span>{submitError}</span>
                <button type="button" onClick={() => setSubmitError(null)} className="opacity-70 hover:opacity-100">
                  ✕
                </button>
              </div>
            )}

            {/* SECTION 1: Personal & Contact Information */}
            <div className="bg-[#0D2235]/90 border border-white/10 rounded-xl p-5 sm:p-6 space-y-4 shadow-lg backdrop-blur-md">
              <div className="flex items-center space-x-2.5 border-b border-white/10 pb-3">
                <span className="text-base text-[#FF9900]">👤</span>
                <h2 className="font-display font-bold text-sm text-white uppercase tracking-wider">
                  1. Personal &amp; Contact Details
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                    Full Name <span className="text-[#FF9900]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Krishnam Dwivedi"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#081827] border border-white/15 rounded text-white focus:outline-none focus:border-[#FF9900]"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                    Official / Primary Email <span className="text-[#FF9900]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. member@university.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#081827] border border-white/15 rounded text-white font-mono focus:outline-none focus:border-[#FF9900]"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                    WhatsApp / Phone Number <span className="text-[#FF9900]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#081827] border border-white/15 rounded text-white font-mono focus:outline-none focus:border-[#FF9900]"
                  />
                </div>

                {/* Profile Photo Upload / URL */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                    Profile Photo (Upload or URL)
                  </label>
                  <div className="flex items-center space-x-3">
                    {formData.photoUrl && (
                      <img
                        src={formData.photoUrl}
                        alt="Profile Preview"
                        className="w-9 h-9 rounded-full object-cover border border-[#FF9900]"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handlePhotoFileChange}
                      className="w-full text-[11px] text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-[#FF9900]/20 file:text-[#FF9900] hover:file:bg-[#FF9900]/30 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Academic Profile */}
            <div className="bg-[#0D2235]/90 border border-white/10 rounded-xl p-5 sm:p-6 space-y-4 shadow-lg backdrop-blur-md">
              <div className="flex items-center space-x-2.5 border-b border-white/10 pb-3">
                <span className="text-base text-blue-400">🎓</span>
                <h2 className="font-display font-bold text-sm text-white uppercase tracking-wider">
                  2. Academic Credentials
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* University */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                    University / Institute Name <span className="text-[#FF9900]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Chandigarh University"
                    value={formData.university}
                    onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                    className="w-full px-3 py-2 bg-[#081827] border border-white/15 rounded text-white focus:outline-none focus:border-[#FF9900]"
                  />
                </div>

                {/* Course & Branch */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                    Course / Branch <span className="text-[#FF9900]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B.Tech CSE (Cloud Computing)"
                    value={formData.courseBranch}
                    onChange={(e) => setFormData({ ...formData, courseBranch: e.target.value })}
                    className="w-full px-3 py-2 bg-[#081827] border border-white/15 rounded text-white focus:outline-none focus:border-[#FF9900]"
                  />
                </div>

                {/* Year & Semester */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                    Year / Semester <span className="text-[#FF9900]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 3rd Year / 6th Semester"
                    value={formData.yearSemester}
                    onChange={(e) => setFormData({ ...formData, yearSemester: e.target.value })}
                    className="w-full px-3 py-2 bg-[#081827] border border-white/15 rounded text-white focus:outline-none focus:border-[#FF9900]"
                  />
                </div>

                {/* Roll Number / Student ID */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                    Roll Number / Student ID (UID) <span className="text-[#FF9900]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 23BCS10892"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#081827] border border-white/15 rounded text-white font-mono focus:outline-none focus:border-[#FF9900]"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: Professional & Online Profiles */}
            <div className="bg-[#0D2235]/90 border border-white/10 rounded-xl p-5 sm:p-6 space-y-4 shadow-lg backdrop-blur-md">
              <div className="flex items-center space-x-2.5 border-b border-white/10 pb-3">
                <span className="text-base text-purple-400">🔗</span>
                <h2 className="font-display font-bold text-sm text-white uppercase tracking-wider">
                  3. Online Profiles &amp; Portfolio
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {/* LinkedIn */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                    LinkedIn Profile URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    className="w-full px-3 py-2 bg-[#081827] border border-white/15 rounded text-white font-mono text-[11px] focus:outline-none focus:border-[#FF9900]"
                  />
                </div>

                {/* GitHub */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                    GitHub Profile URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/username"
                    value={formData.github}
                    onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                    className="w-full px-3 py-2 bg-[#081827] border border-white/15 rounded text-white font-mono text-[11px] focus:outline-none focus:border-[#FF9900]"
                  />
                </div>

                {/* Portfolio Website */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                    Personal Portfolio / Website
                  </label>
                  <input
                    type="url"
                    placeholder="https://yourportfolio.dev"
                    value={formData.portfolio}
                    onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                    className="w-full px-3 py-2 bg-[#081827] border border-white/15 rounded text-white font-mono text-[11px] focus:outline-none focus:border-[#FF9900]"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: Domain, Skills & Experience */}
            <div className="bg-[#0D2235]/90 border border-white/10 rounded-xl p-5 sm:p-6 space-y-4 shadow-lg backdrop-blur-md">
              <div className="flex items-center space-x-2.5 border-b border-white/10 pb-3">
                <span className="text-base text-emerald-400">⚡</span>
                <h2 className="font-display font-bold text-sm text-white uppercase tracking-wider">
                  4. Domain Focus, Skills &amp; Contributions
                </h2>
              </div>

              <div className="space-y-4 text-xs">
                {/* Domain Selection */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                    Primary Domain / Area of Focus <span className="text-[#FF9900]">*</span>
                  </label>
                  <select
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full px-3 py-2 bg-[#081827] border border-white/15 rounded text-white focus:outline-none focus:border-[#FF9900] font-medium"
                  >
                    <option value="Cloud & Infrastructure">Cloud &amp; Infrastructure (AWS Core / Architecture)</option>
                    <option value="AI / ML & Data">AI / ML &amp; Data Engineering (SageMaker / Bedrock)</option>
                    <option value="DevOps & SRE">DevOps &amp; Cloud Native Automation (CI/CD / Docker / K8s)</option>
                    <option value="Full-Stack Web & Mobile">Full-Stack Web &amp; Mobile Development</option>
                    <option value="Security & Governance">Cloud Security &amp; Zero-Trust Governance</option>
                    <option value="Community, Events & Operations">Community, Events &amp; Operations</option>
                    <option value="Content & Technical Documentation">Content &amp; Technical Documentation</option>
                    <option value="Design & Creative Media">Design &amp; Creative Media</option>
                    <option value="Other Technical Domain">Other Specialized Technical Track</option>
                  </select>
                </div>

                {/* Technical Skills */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                    Core Technical Skills &amp; Certifications <span className="text-[#FF9900]">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. AWS Certified Cloud Practitioner, VPC, Lambda, Terraform, Python, Docker, Next.js..."
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    className="w-full px-3 py-2 bg-[#081827] border border-white/15 rounded text-white focus:outline-none focus:border-[#FF9900] leading-relaxed"
                  />
                </div>

                {/* Past Experience & Contributions */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                    Experience &amp; Community Contributions <span className="text-[#FF9900]">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Briefly describe your background, past projects, hackathons, and contributions to AWS student builder initiatives..."
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full px-3 py-2 bg-[#081827] border border-white/15 rounded text-white focus:outline-none focus:border-[#FF9900] leading-relaxed"
                  />
                </div>

                {/* Bio & Additional Info */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                    Bio / Vision for the Community (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Share any other relevant information, future goals, or recommendations..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3 py-2 bg-[#081827] border border-white/15 rounded text-white focus:outline-none focus:border-[#FF9900] leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Submit Bar */}
            <div className="bg-[#0D2235]/90 border border-white/10 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <span className="text-[11px] text-slate-400">
                🛡️ Your details will be stored securely in the official AWS SBG CU-UP directory.
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <span>{submitting ? 'Submitting Details...' : '✓ Submit Founding Member Details'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
