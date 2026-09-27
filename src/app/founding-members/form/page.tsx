'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FormQuestion, FoundingMemberFormConfig } from '@/types/foundingMember';

export default function MemberRegistrationAndProfileFormPage() {
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [formConfig, setFormConfig] = useState<FoundingMemberFormConfig | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [isPublished, setIsPublished] = useState(true);

  // Stepper state (1 to 7)
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 7;

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    photoUrl: '',
    university: 'Chandigarh University – Uttar Pradesh',
    courseBranch: '',
    yearSemester: '3rd Year',
    studentId: '',
    memberRole: 'Founding Member',
    domain: 'Cloud & Infrastructure',
    designation: '',
    memberId: '',
    dateOfJoining: '',
    membershipStatus: 'Active',
    skills: '',
    interests: '',
    linkedin: '',
    github: '',
    portfolio: '',
    speakerRoleType: 'Anchor',
    speakingExperience: '',
    demoVideoUrl: '',
    speakingTopics: '',
    languages: 'English, Hindi',
    eventAvailability: 'Flexible (Weekdays & Weekends)',
    previousExperience: '',
    contributionAreas: '',
    assignedResponsibilities: '',
    majorAchievements: '',
    certifications: '',
    digitalBadges: '',
    eventsParticipated: '',
    additionalNotes: '',
    bio: '',
    consent: false
  });

  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission states
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedMember, setSubmittedMember] = useState<{
    memberId: string;
    fullName: string;
    email: string;
    memberRole: string;
    domain: string;
    formSubmittedAt: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Load published configuration
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoadingConfig(true);
        const res = await fetch('/api/founding-members/form', { cache: 'no-store' });
        const data = await res.json();
        if (res.ok && data.config) {
          setFormConfig(data.config);
          setQuestions(data.questions || []);
          setIsPublished(data.published !== false);
        }
      } catch (err) {
        console.error('Failed to load form configuration:', err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadConfig();
  }, []);

  // Check if role involves Anchor or Speaker
  const isAnchorOrSpeaker =
    formData.memberRole === 'Anchor' ||
    formData.memberRole === 'Event Speaker' ||
    formData.domain === 'Anchor & Speaker Wing' ||
    formData.designation?.toLowerCase().includes('anchor') ||
    formData.designation?.toLowerCase().includes('speaker');

  // Process & compress image via canvas
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setPhotoPreview(compressedDataUrl);
          setFormData((prev) => ({ ...prev, photoUrl: compressedDataUrl }));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const downloadPhoto = (dataUrl: string, filename?: string) => {
    if (!dataUrl) return;
    const cleanName = (filename || formData.fullName || 'aws-sbg-member-photo')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${cleanName}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCustomAnswerChange = (qId: string, value: any) => {
    setCustomAnswers((prev) => ({
      ...prev,
      [qId]: value
    }));
  };

  // Step Validation before progressing
  const validateStep = (step: number): boolean => {
    setSubmitError(null);
    if (step === 1) {
      if (!formData.fullName.trim()) {
        setSubmitError('Please enter your full legal / university name.');
        return false;
      }
      if (!formData.photoUrl || !formData.photoUrl.trim()) {
        setSubmitError('Please upload your profile photograph (PNG, JPG, or WEBP).');
        return false;
      }
      if (!formData.email.trim() || !formData.email.includes('@')) {
        setSubmitError('Please enter a valid primary email address.');
        return false;
      }
      if (!formData.phone.trim()) {
        setSubmitError('Please enter your mobile / WhatsApp number.');
        return false;
      }
    } else if (step === 2) {
      if (!formData.university.trim()) {
        setSubmitError('Please enter your University or Institute name.');
        return false;
      }
      if (!formData.courseBranch.trim()) {
        setSubmitError('Please enter your Course / Program.');
        return false;
      }
      if (!formData.yearSemester.trim()) {
        setSubmitError('Please select your Year of Study.');
        return false;
      }
      if (!formData.studentId.trim()) {
        setSubmitError('Please enter your Student ID / Roll Number (UID).');
        return false;
      }
    } else if (step === 3) {
      if (!formData.memberRole.trim()) {
        setSubmitError('Please select your Member Type / Role.');
        return false;
      }
      if (!formData.domain.trim()) {
        setSubmitError('Please select your Team / Domain.');
        return false;
      }
    } else if (step === 4) {
      if (!formData.skills.trim()) {
        setSubmitError('Please summarize your Primary Skills.');
        return false;
      }
    } else if (step === 7) {
      if (!formData.consent) {
        setSubmitError('Please confirm and check the consent declaration to submit your profile.');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setSubmitError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !validateStep(1) ||
      !validateStep(2) ||
      !validateStep(3) ||
      !validateStep(4) ||
      !validateStep(7)
    ) {
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const payload = {
        ...formData,
        customAnswers
      };

      const res = await fetch('/api/founding-members/form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitSuccess(true);
        setSubmittedMember({
          memberId: data.memberId || data.member?.memberId || 'MEM-CUUP-001',
          fullName: data.member?.fullName || formData.fullName,
          email: data.member?.email || formData.email,
          memberRole: data.member?.memberRole || formData.memberRole,
          domain: data.member?.domain || formData.domain,
          formSubmittedAt: data.member?.formSubmittedAt || new Date().toISOString()
        });
        window.scrollTo({ top: 80, behavior: 'smooth' });
      } else {
        setSubmitError(data.error || 'Failed to submit member profile. Please check your information.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Network error while submitting profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = [
    { num: 1, label: 'Personal Information', icon: '👤' },
    { num: 2, label: 'Academic Information', icon: '🎓' },
    { num: 3, label: 'AWS SBG Membership', icon: '⚡' },
    { num: 4, label: 'Skills & Profile', icon: '🛠️' },
    { num: 5, label: 'Anchor / Speaker', icon: '🎙️' },
    { num: 6, label: 'Experience & Impact', icon: '🚀' },
    { num: 7, label: 'Recognition & Consent', icon: '🏆' }
  ];

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-[#070D18] text-white flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-[#FF9900] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-300 font-medium">Loading AWS Student Builder Group Registration Portal...</p>
        </div>
      </div>
    );
  }

  if (!isPublished) {
    return (
      <div className="min-h-screen bg-[#070D18] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#0D1829] border border-gray-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-yellow-500/10 text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            ⏳
          </div>
          <h1 className="text-2xl font-bold mb-2">Registration Temporarily Closed</h1>
          <p className="text-gray-400 text-sm mb-6">
            The AWS Student Builder Group Member Registration form is currently offline for administrative maintenance. Please check back later.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-[#FF9900] hover:bg-[#E08800] text-gray-950 font-bold rounded-xl text-sm transition-all"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070D18] text-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Branding Card */}
        <div className="bg-gradient-to-r from-[#0B172A] via-[#0F1E36] to-[#0B172A] border border-gray-800 rounded-3xl p-6 sm:p-10 mb-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#FF9900]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#FF9900]/15 border border-[#FF9900]/30 text-[#FF9900] text-xs font-bold tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-[#FF9900] animate-ping"></span>
                {formConfig?.headerText || 'AWS STUDENT BUILDER GROUP • CU-UP'}
              </div>
              <div className="text-xs text-gray-400 bg-gray-900/60 px-3 py-1 rounded-lg border border-gray-800 font-mono">
                Official Member Portal • 2026
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-2">
              {formConfig?.title || 'AWS Student Builder Group – Member Registration & Profile Form'}
            </h1>
            <p className="text-base sm:text-lg text-[#FF9900] font-medium mb-3">
              {formConfig?.subtitle || 'Member Record • Role Verification • Community Profile'}
            </p>
            <p className="text-sm sm:text-base text-gray-300 max-w-3xl leading-relaxed">
              {formConfig?.description ||
                'Official member profile and record form for members of AWS Student Builder Group at Chandigarh University – Uttar Pradesh.'}
            </p>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        {!submitSuccess && (
          <div className="bg-[#0D1829] border border-gray-800/80 rounded-2xl p-4 sm:p-6 mb-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Step {currentStep} of {totalSteps}:{' '}
                <span className="text-[#FF9900]">{stepTitles[currentStep - 1]?.label}</span>
              </span>
              <span className="text-xs font-mono text-gray-400">
                {Math.round((currentStep / totalSteps) * 100)}% Completed
              </span>
            </div>

            {/* Progress line */}
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mb-6">
              <div
                className="bg-gradient-to-r from-[#FF9900] to-amber-400 h-full transition-all duration-300 ease-out"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>

            {/* Step icons grid */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {stepTitles.map((st) => {
                const isActive = st.num === currentStep;
                const isPassed = st.num < currentStep;
                return (
                  <button
                    key={st.num}
                    type="button"
                    onClick={() => {
                      if (st.num < currentStep || validateStep(currentStep)) {
                        setCurrentStep(st.num);
                      }
                    }}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl text-center transition-all ${
                      isActive
                        ? 'bg-[#FF9900]/20 border border-[#FF9900] text-white shadow-md'
                        : isPassed
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-gray-900/50 border border-gray-800/60 text-gray-500 hover:border-gray-700'
                    }`}
                  >
                    <span className="text-base sm:text-lg">{isPassed ? '✓' : st.icon}</span>
                    <span className="text-[10px] font-semibold truncate w-full hidden sm:block">
                      {st.label.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {submitError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 flex items-start gap-3 text-sm animate-shake">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className="font-bold">Please check your inputs:</p>
              <p>{submitError}</p>
            </div>
            <button
              onClick={() => setSubmitError(null)}
              className="text-red-400 hover:text-white font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* SUCCESS VIEW */}
        {submitSuccess && submittedMember ? (
          <div className="bg-[#0D1829] border border-emerald-500/40 rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center text-4xl mx-auto mb-6">
              ✓
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
              {formConfig?.successTitle || 'Member Profile Submitted Successfully!'}
            </h2>
            <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
              {formConfig?.successMessage ||
                'Thank you for submitting your member profile. Your information has been received for AWS Student Builder Group records. The team may contact you if any verification or clarification is required.'}
            </p>

            {/* Permanent Member ID Badge Card */}
            <div className="max-w-md mx-auto bg-[#070D18] border border-gray-800 rounded-2xl p-6 mb-8 text-left shadow-inner">
              <div className="flex items-center gap-4 mb-4">
                {formData.photoUrl ? (
                  <img
                    src={formData.photoUrl}
                    alt={submittedMember.fullName}
                    className="w-16 h-16 rounded-xl object-cover border-2 border-[#FF9900]"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center text-2xl font-bold text-[#FF9900]">
                    {submittedMember.fullName.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-white text-lg">{submittedMember.fullName}</h3>
                  <p className="text-xs text-[#FF9900] font-medium">
                    {submittedMember.memberRole} • {submittedMember.domain}
                  </p>
                  <p className="text-xs text-gray-400">{submittedMember.email}</p>
                </div>
              </div>

              <div className="p-3 bg-gray-900/90 rounded-xl border border-gray-800 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400">Assigned Member ID</div>
                  <div className="font-mono text-base font-bold text-white tracking-wider">
                    {submittedMember.memberId}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(submittedMember.memberId);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 3000);
                  }}
                  className="px-3 py-1.5 bg-[#FF9900]/20 hover:bg-[#FF9900] text-[#FF9900] hover:text-gray-950 font-bold rounded-lg text-xs transition-all"
                >
                  {copiedId ? 'Copied! ✓' : 'Copy ID'}
                </button>
              </div>

              {formData.photoUrl && (
                <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Uploaded Profile Photo:</span>
                  <button
                    type="button"
                    onClick={() => downloadPhoto(formData.photoUrl, `${submittedMember.memberId}-photo`)}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5"
                  >
                    <span>⬇️</span> Download Photo
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/"
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-sm transition-all"
              >
                Return to Home
              </Link>
              <Link
                href="/events"
                className="px-6 py-3 bg-[#FF9900] hover:bg-[#E08800] text-gray-950 font-extrabold rounded-xl text-sm transition-all"
              >
                Explore Upcoming Events & Workshops
              </Link>
            </div>
          </div>
        ) : (
          /* MULTI-STEP FORM CONTAINER */
          <form onSubmit={handleSubmit} className="bg-[#0D1829] border border-gray-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
            {/* STEP 1: PERSONAL INFORMATION */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-gray-800 pb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-[#FF9900]/20 text-[#FF9900] flex items-center justify-center text-sm font-black">
                      1
                    </span>
                    Personal Information
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Please provide your legal contact identity and upload a clear professional headshot photograph.
                  </p>
                </div>

                {/* Profile Photo Upload Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Profile Photo <span className="text-red-400">*</span>
                  </label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingPhoto(true);
                    }}
                    onDragLeave={() => setIsDraggingPhoto(false)}
                    onDrop={handlePhotoDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                      isDraggingPhoto
                        ? 'border-[#FF9900] bg-[#FF9900]/10'
                        : photoPreview
                        ? 'border-emerald-500/50 bg-emerald-500/5'
                        : 'border-gray-700 bg-gray-900/40 hover:border-gray-600'
                    }`}
                  >
                    {photoPreview ? (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <img
                          src={photoPreview}
                          alt="Profile Preview"
                          className="w-28 h-28 rounded-2xl object-cover border-2 border-[#FF9900] shadow-md"
                        />
                        <div className="text-left space-y-2">
                          <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                            <span>✓</span> Photo processed & compressed successfully
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 rounded-lg"
                            >
                              Change Photo
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadPhoto(photoPreview, `${formData.fullName || 'member'}-profile`)}
                              className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-xs font-semibold text-blue-300 rounded-lg flex items-center gap-1"
                            >
                              <span>⬇️</span> Download Photo
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-14 h-14 rounded-2xl bg-gray-800 text-gray-400 flex items-center justify-center text-2xl mb-3">
                          📷
                        </div>
                        <p className="text-sm font-semibold text-gray-200">
                          Click to upload or drag & drop profile photo
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          PNG, JPG, or WEBP (Passport/headshot format recommended)
                        </p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          processImageFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Alex Sharma"
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="member@culko.in or personal email"
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Mobile / WhatsApp Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Used for official community alerts & emergency coordination.</p>
                </div>
              </div>
            )}

            {/* STEP 2: ACADEMIC INFORMATION */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-gray-800 pb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-[#FF9900]/20 text-[#FF9900] flex items-center justify-center text-sm font-black">
                      2
                    </span>
                    Academic Information
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Your institutional affiliation, degree program, and official university identification number.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      University / Institute <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.university}
                      onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                      placeholder="Chandigarh University – Uttar Pradesh"
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Course / Program <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.courseBranch}
                      onChange={(e) => setFormData({ ...formData, courseBranch: e.target.value })}
                      placeholder="e.g. B.Tech CSE (Cloud Computing), BCA, MCA..."
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Year of Study <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.yearSemester}
                      onChange={(e) => setFormData({ ...formData, yearSemester: e.target.value })}
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="Postgraduate / Alumni">Postgraduate / Alumni</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Student ID / UID <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      placeholder="e.g. 23BCS10001"
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: AWS SBG MEMBERSHIP */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-gray-800 pb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-[#FF9900]/20 text-[#FF9900] flex items-center justify-center text-sm font-black">
                      3
                    </span>
                    AWS SBG Membership
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Your functional role, team track, and membership status within the community.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Member Type / Role <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.memberRole}
                      onChange={(e) => setFormData({ ...formData, memberRole: e.target.value })}
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    >
                      <option value="Founding Member">Founding Member</option>
                      <option value="Core Team">Core Team</option>
                      <option value="Event Speaker">Event Speaker</option>
                      <option value="Anchor">Anchor</option>
                      <option value="Technical Member">Technical Member</option>
                      <option value="Growth & Community">Growth & Community</option>
                      <option value="Media & Creative">Media & Creative</option>
                      <option value="Volunteer">Volunteer</option>
                      <option value="General Member">General Member</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Team / Domain <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    >
                      <option value="Cloud & Infrastructure">Cloud & Infrastructure</option>
                      <option value="AI / ML & Data Science">AI / ML & Data Science</option>
                      <option value="DevOps & SRE">DevOps & SRE</option>
                      <option value="Full-Stack Web & Mobile">Full-Stack Web & Mobile</option>
                      <option value="Security & Governance">Security & Governance</option>
                      <option value="Anchor & Speaker Wing">Anchor & Speaker Wing</option>
                      <option value="Growth & Community Operations">Growth & Community Operations</option>
                      <option value="Media, Design & Creative">Media, Design & Creative</option>
                      <option value="Event Management & Logistics">Event Management & Logistics</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Current Designation / Specific Role
                    </label>
                    <input
                      type="text"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="e.g. Cloud Lead, Technical Specialist, Anchor, Volunteer..."
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Member ID (Optional / Auto-Generated)
                    </label>
                    <input
                      type="text"
                      value={formData.memberId}
                      onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                      placeholder="Leave blank for auto sequential assignment"
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Date of Joining / Selection
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfJoining}
                      onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Membership Status
                    </label>
                    <select
                      value={formData.membershipStatus}
                      onChange={(e) => setFormData({ ...formData, membershipStatus: e.target.value })}
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    >
                      <option value="Active">Active</option>
                      <option value="Probation / Onboarding">Probation / Onboarding</option>
                      <option value="Alumni / Senior Advisor">Alumni / Senior Advisor</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: SKILLS & PROFESSIONAL PROFILE */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-gray-800 pb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-[#FF9900]/20 text-[#FF9900] flex items-center justify-center text-sm font-black">
                      4
                    </span>
                    Skills & Professional Profile
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Detail your core competencies, technical interests, and online profiles.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Primary Skills <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    placeholder="e.g. AWS Core Services (EC2, S3, IAM, Lambda), Python, TypeScript, Docker, Public Speaking, Graphic Design, Video Editing..."
                    className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Technical / Professional Interests
                  </label>
                  <textarea
                    rows={2}
                    value={formData.interests}
                    onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                    placeholder="e.g. Cloud Architecture, Generative AI & Bedrock, Serverless, DevOps automation, Tech Community Building..."
                    className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      LinkedIn Profile
                    </label>
                    <input
                      type="url"
                      value={formData.linkedin}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      GitHub Profile
                    </label>
                    <input
                      type="url"
                      value={formData.github}
                      onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                      placeholder="https://github.com/username"
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Portfolio / Website
                    </label>
                    <input
                      type="url"
                      value={formData.portfolio}
                      onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                      placeholder="https://yourportfolio.dev"
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: ANCHOR / SPEAKER DETAILS (CONDITIONAL / OPTIONAL) */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-gray-800 pb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-[#FF9900]/20 text-[#FF9900] flex items-center justify-center text-sm font-black">
                        5
                      </span>
                      Anchor / Speaker Details
                    </h2>
                    {isAnchorOrSpeaker ? (
                      <span className="px-2.5 py-1 rounded-full bg-[#FF9900]/20 text-[#FF9900] text-xs font-bold">
                        Role Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 text-xs">
                        Optional for your role
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {isAnchorOrSpeaker
                      ? 'Detailed speaker credentials for scheduling sessions, hosting live events, and moderating panels.'
                      : 'You can fill these details if you wish to host or deliver sessions for AWS SBG in the future.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Preferred Speaking / Hosting Role
                    </label>
                    <select
                      value={formData.speakerRoleType}
                      onChange={(e) => setFormData({ ...formData, speakerRoleType: e.target.value })}
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    >
                      <option value="Anchor">Anchor / Event Host</option>
                      <option value="Speaker">Technical Speaker</option>
                      <option value="Both (Anchor & Speaker)">Both (Anchor & Speaker)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Introduction / Demo Video Link
                    </label>
                    <input
                      type="url"
                      value={formData.demoVideoUrl}
                      onChange={(e) => setFormData({ ...formData, demoVideoUrl: e.target.value })}
                      placeholder="https://drive.google.com/... or https://youtube.com/..."
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Hosting / Speaking Experience
                  </label>
                  <textarea
                    rows={3}
                    value={formData.speakingExperience}
                    onChange={(e) => setFormData({ ...formData, speakingExperience: e.target.value })}
                    placeholder="Describe previous events hosted, webinars, seminars, college fests, presentations, or tech talks conducted..."
                    className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Topics you can speak / host on
                  </label>
                  <textarea
                    rows={2}
                    value={formData.speakingTopics}
                    onChange={(e) => setFormData({ ...formData, speakingTopics: e.target.value })}
                    placeholder="e.g. AWS Cloud Fundamentals, Serverless computing, Tech Panel Moderation, DevOps workflows..."
                    className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Languages Comfortable Hosting In
                    </label>
                    <input
                      type="text"
                      value={formData.languages}
                      onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                      placeholder="e.g. English, Hindi, Bilingual"
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Event Availability
                    </label>
                    <select
                      value={formData.eventAvailability}
                      onChange={(e) => setFormData({ ...formData, eventAvailability: e.target.value })}
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    >
                      <option value="Flexible (Weekdays & Weekends)">Flexible (Weekdays & Weekends)</option>
                      <option value="Weekday Evenings">Weekday Evenings</option>
                      <option value="Weekends Only">Weekends Only</option>
                      <option value="Specific Event Calls">Specific Event Calls</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: EXPERIENCE & CONTRIBUTION */}
            {currentStep === 6 && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-gray-800 pb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-[#FF9900]/20 text-[#FF9900] flex items-center justify-center text-sm font-black">
                      6
                    </span>
                    Experience & Contribution
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Your prior community experience, areas of leadership, assigned roles, and milestones.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Previous Club / Community / Event / Project Experience
                  </label>
                  <textarea
                    rows={3}
                    value={formData.previousExperience}
                    onChange={(e) => setFormData({ ...formData, previousExperience: e.target.value })}
                    placeholder="Detail past club memberships, student chapters, hackathons organized, open source projects..."
                    className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Areas of Contribution in AWS SBG
                  </label>
                  <textarea
                    rows={2}
                    value={formData.contributionAreas}
                    onChange={(e) => setFormData({ ...formData, contributionAreas: e.target.value })}
                    placeholder="e.g. Workshop Organization, Hands-on Cloud Labs, Content Writing, Graphic Design, Community Moderation..."
                    className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Assigned Responsibilities
                    </label>
                    <textarea
                      rows={2}
                      value={formData.assignedResponsibilities}
                      onChange={(e) => setFormData({ ...formData, assignedResponsibilities: e.target.value })}
                      placeholder="Detail specific operational responsibilities held within AWS SBG..."
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Major Contributions / Achievements
                    </label>
                    <textarea
                      rows={2}
                      value={formData.majorAchievements}
                      onChange={(e) => setFormData({ ...formData, majorAchievements: e.target.value })}
                      placeholder="Highlight notable milestones, certifications, events successfully delivered, awards won..."
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 7: RECOGNITION, RECORDS & CONSENT */}
            {currentStep === 7 && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-gray-800 pb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-[#FF9900]/20 text-[#FF9900] flex items-center justify-center text-sm font-black">
                      7
                    </span>
                    Recognition, Records & Consent
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Record earned certificates, digital badges, participation logs, and provide authorization consent.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Certificates / Recognition
                    </label>
                    <textarea
                      rows={2}
                      value={formData.certifications}
                      onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                      placeholder="e.g. AWS Certified Cloud Practitioner, Solutions Architect Associate, University Tech Awards..."
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Digital Badges Earned
                    </label>
                    <textarea
                      rows={2}
                      value={formData.digitalBadges}
                      onChange={(e) => setFormData({ ...formData, digitalBadges: e.target.value })}
                      placeholder="e.g. Cloud Foundations - Session Completion, CloudXplore Series, Credly Badges..."
                      className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Events / Sessions Participated In
                  </label>
                  <textarea
                    rows={2}
                    value={formData.eventsParticipated}
                    onChange={(e) => setFormData({ ...formData, eventsParticipated: e.target.value })}
                    placeholder="e.g. CloudXplore Episode 1-4, AWS Community Day, Hands-on Lab Week 1-4..."
                    className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.additionalNotes}
                    onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                    placeholder="Any other comments, aspirations, or ideas for the group..."
                    className="w-full bg-[#070D18] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
                  />
                </div>

                {/* CONSENT BOX */}
                <div className="p-5 rounded-2xl bg-[#070D18] border-2 border-[#FF9900]/40 shadow-inner">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={formData.consent}
                      onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                      className="mt-1 w-5 h-5 rounded border-gray-700 text-[#FF9900] focus:ring-[#FF9900] bg-gray-900 cursor-pointer"
                    />
                    <div className="text-xs text-gray-300 leading-relaxed">
                      <span className="font-bold text-white block mb-1">Declaration & Authorization Consent *</span>
                      “I confirm that the information provided is accurate and up to date. I consent to its use for
                      AWS Student Builder Group membership records, member verification, team coordination, event
                      participation, recognition, certificates, digital badges, and related community activities.”
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* STEP NAVIGATION BUTTONS */}
            <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-800">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-sm transition-all flex items-center gap-2"
                >
                  <span>←</span> Back
                </button>
              ) : (
                <div></div>
              )}

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-2.5 rounded-xl bg-[#FF9900] hover:bg-[#E08800] text-gray-950 font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-[#FF9900]/20"
                >
                  Continue <span>→</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#FF9900] to-amber-500 hover:from-[#E08800] hover:to-amber-600 text-gray-950 font-black text-sm transition-all shadow-xl shadow-[#FF9900]/25 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin"></div>
                      Recording Member Record...
                    </>
                  ) : (
                    <>
                      <span>✓</span> {formConfig?.submitButtonText || 'Submit Member Profile'}
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        )}

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>{formConfig?.footerText || 'AWS Student Builder Group • Chandigarh University – Uttar Pradesh © 2026'}</p>
          <p className="mt-1 text-gray-400">
            For member profile updates or queries, contact the AWS SBG Core Team.
          </p>
        </div>
      </div>
    </div>
  );
}
