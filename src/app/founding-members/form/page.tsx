'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FormQuestion, FoundingMemberFormConfig } from '@/types/foundingMember';

export default function FoundingMembersPublicFormPage() {
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [formConfig, setFormConfig] = useState<FoundingMemberFormConfig | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [isPublished, setIsPublished] = useState(true);

  // Stepper state (1 to 5)
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Form State
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
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
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

  const handleCustomAnswerChange = (qId: string, value: any) => {
    setCustomAnswers((prev) => ({
      ...prev,
      [qId]: value
    }));
  };

  const handleCheckboxToggle = (qId: string, option: string) => {
    setCustomAnswers((prev) => {
      const currentList: string[] = Array.isArray(prev[qId]) ? [...prev[qId]] : [];
      const idx = currentList.indexOf(option);
      if (idx > -1) {
        currentList.splice(idx, 1);
      } else {
        currentList.push(option);
      }
      return { ...prev, [qId]: currentList };
    });
  };

  // Step Validation before progressing
  const validateStep = (step: number): boolean => {
    setSubmitError(null);
    if (step === 1) {
      if (!formData.fullName.trim()) {
        setSubmitError('Please enter your full legal/university name.');
        return false;
      }
      if (!formData.email.trim() || !formData.email.includes('@')) {
        setSubmitError('Please enter a valid primary email address.');
        return false;
      }
      if (!formData.phone.trim()) {
        setSubmitError('Please enter your contact/WhatsApp phone number.');
        return false;
      }
    } else if (step === 2) {
      if (!formData.university.trim()) {
        setSubmitError('Please enter your University or Institute name.');
        return false;
      }
      if (!formData.courseBranch.trim()) {
        setSubmitError('Please enter your Course & Branch (e.g. B.Tech CSE Cloud Computing).');
        return false;
      }
      if (!formData.yearSemester.trim()) {
        setSubmitError('Please enter your Year / Semester.');
        return false;
      }
      if (!formData.studentId.trim()) {
        setSubmitError('Please enter your Student ID / Roll Number (UID).');
        return false;
      }
    } else if (step === 3) {
      if (!formData.domain.trim()) {
        setSubmitError('Please select your primary Domain / Track of Focus.');
        return false;
      }
    } else if (step === 4) {
      if (!formData.skills.trim()) {
        setSubmitError('Please summarize your technical skills and certifications.');
        return false;
      }
      if (!formData.experience.trim()) {
        setSubmitError('Please detail your experience and community contributions.');
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
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
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
        setSubmittedMember(data.member);
        setSubmitSuccess(true);
        window.scrollTo({ top: 60, behavior: 'smooth' });
      } else {
        setSubmitError(data.error || 'Failed to submit form. Please check your inputs.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'A network error occurred while submitting.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyPermanentId = () => {
    if (submittedMember?.memberId) {
      navigator.clipboard.writeText(submittedMember.memberId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 3000);
    }
  };

  // Filter extra dynamic questions for Step 4
  const dynamicExtraQuestions = questions.filter(
    (q) =>
      q.enabled &&
      ![
        'fullName',
        'email',
        'phone',
        'university',
        'courseBranch',
        'yearSemester',
        'studentId',
        'photoUrl',
        'domain',
        'skills',
        'experience',
        'linkedin',
        'github',
        'portfolio',
        'bio'
      ].includes(q.id)
  );

  return (
    <div className="min-h-screen bg-[#07131F] text-slate-100 font-sans selection:bg-[#FF9900]/30 selection:text-white py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* 3D Glassmorphic Backdrop Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-[#FF9900]/15 via-blue-600/10 to-transparent blur-[140px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[400px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-3xl mx-auto space-y-7">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-xs font-mono text-[#FF9900] shadow-sm backdrop-blur-md">
            <span>⭐</span>
            <span className="font-bold">AWS STUDENT BUILDER GROUP</span>
            <span className="text-slate-500">•</span>
            <span>CU-UP</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight">
            Founding Member Registration &amp; Dossier
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Welcome to the official Founding Members directory portal. Please submit your profile credentials, domain expertise, and contributions to complete your permanent record.
          </p>
        </div>

        {/* Loading State */}
        {loadingConfig && (
          <div className="bg-[#0D2235]/90 border border-white/10 rounded-2xl p-12 text-center space-y-4 shadow-2xl backdrop-blur-xl">
            <div className="inline-block animate-spin h-9 w-9 border-3 border-[#FF9900] border-t-transparent rounded-full" />
            <p className="text-xs text-slate-400 font-mono">Initializing secure Founding Members portal...</p>
          </div>
        )}

        {/* Form Draft / Unfinished State */}
        {!loadingConfig && !isPublished && (
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-8 text-center space-y-4 shadow-xl backdrop-blur-md">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-2xl">
              ⏳
            </div>
            <h2 className="text-lg font-bold text-white">Form Temporarily in Draft</h2>
            <p className="text-xs text-amber-200 max-w-md mx-auto leading-relaxed">
              The administrator is currently updating the Founding Members form configuration. Please check back shortly.
            </p>
          </div>
        )}

        {/* Success Confirmation Modal / Screen */}
        {!loadingConfig && isPublished && submitSuccess && submittedMember && (
          <div className="bg-[#0D2235]/95 border border-emerald-500/40 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 text-center animate-fadeIn backdrop-blur-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#FF9900]/20 rounded-full blur-3xl pointer-events-none" />

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white flex items-center justify-center mx-auto text-3xl shadow-lg shadow-emerald-500/20">
              ✓
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
                Official Submission Verified
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
                Profile Recorded Successfully!
              </h2>
              <p className="text-xs sm:text-sm text-slate-350 max-w-lg mx-auto leading-relaxed">
                Thank you, <strong>{submittedMember.fullName}</strong>. Your Founding Member credentials have been registered in the centralized directory.
              </p>
            </div>

            {/* Permanent Member ID Card */}
            <div className="bg-[#07131F] border border-[#FF9900]/40 rounded-2xl p-5 sm:p-6 text-center max-w-md mx-auto space-y-3 shadow-xl">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                Permanent Founding Member ID
              </span>
              <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#FF9900] tracking-wider select-all">
                  {submittedMember.memberId}
                </span>
                <button
                  type="button"
                  onClick={copyPermanentId}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded cursor-pointer transition-colors"
                >
                  {copiedId ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Keep this ID for your official AWS SBG records and event certificates.
              </p>
            </div>

            {/* Details Summary Card */}
            <div className="bg-[#081827]/80 border border-white/10 rounded-xl p-5 text-left text-xs font-sans space-y-3 max-w-lg mx-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div>
                  <span className="font-bold text-white text-sm block">{submittedMember.fullName}</span>
                  <span className="text-[11px] text-slate-400 font-mono">{submittedMember.email}</span>
                </div>
                <span className="px-2.5 py-1 bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/30 rounded text-[10px] font-bold">
                  {submittedMember.domain}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Timestamp: {new Date(submittedMember.formSubmittedAt).toLocaleString()}</span>
                <span className="text-emerald-400 font-bold">Status: Active</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className="px-6 py-2.5 bg-[#FF9900] hover:bg-[#E08800] text-white rounded-lg text-xs font-bold shadow-lg transition-all"
              >
                AWS SBG CU-UP Home &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Main 3D Multi-Step Form */}
        {!loadingConfig && isPublished && !submitSuccess && (
          <div className="space-y-6">
            {/* 3D Progress Stepper */}
            <div className="bg-[#0D2235]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-xl">
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                {[
                  { step: 1, label: 'Personal', icon: '👤' },
                  { step: 2, label: 'Academic', icon: '🎓' },
                  { step: 3, label: 'Domain', icon: '⚡' },
                  { step: 4, label: 'Expertise', icon: '🛠️' },
                  { step: 5, label: 'Review', icon: '✓' }
                ].map((s) => {
                  const isActive = currentStep === s.step;
                  const isDone = currentStep > s.step;
                  return (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => {
                        if (s.step < currentStep || validateStep(currentStep)) {
                          setCurrentStep(s.step);
                        }
                      }}
                      className={`p-2 rounded-xl transition-all flex flex-col items-center justify-center space-y-1 ${
                        isActive
                          ? 'bg-[#FF9900] text-white font-bold shadow-md shadow-orange-500/20'
                          : isDone
                          ? 'bg-white/10 text-emerald-300 font-medium hover:bg-white/15'
                          : 'bg-white/5 text-slate-400 opacity-60'
                      }`}
                    >
                      <span className="text-sm">{isDone ? '✓' : s.icon}</span>
                      <span className="text-[10px] hidden sm:block">{s.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Progress Line */}
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-[#FF9900] h-full transition-all duration-300 ease-out"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-4 text-xs text-red-200 flex items-center justify-between shadow-lg animate-shake">
                <div className="flex items-center space-x-2">
                  <span>⚠️</span>
                  <span>{submitError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitError(null)}
                  className="opacity-70 hover:opacity-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* STEP 1: Personal & Contact */}
              {currentStep === 1 && (
                <div className="bg-[#0D2235]/90 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl backdrop-blur-xl animate-fadeIn">
                  <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="font-display font-extrabold text-base text-white flex items-center gap-2">
                        <span>👤 Step 1: Personal &amp; Identification</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Your email is used as the unique key to identify and match your founding member record.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[#FF9900] bg-[#FF9900]/10 px-2.5 py-1 rounded-full border border-[#FF9900]/30 font-bold">
                      1 / 5
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Full Name */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                        Full Legal / University Name <span className="text-[#FF9900]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John Doe"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#07131F] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FF9900] text-xs transition-colors"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                        Primary / Official Email <span className="text-[#FF9900]">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="member@culko.in or personal"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#07131F] border border-white/15 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#FF9900] transition-colors"
                      />
                      <span className="text-[10px] text-slate-400 block">
                        Used to match your Founding Member record in the database.
                      </span>
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                        WhatsApp / Contact Phone <span className="text-[#FF9900]">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#07131F] border border-white/15 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#FF9900] transition-colors"
                      />
                    </div>

                    {/* Photo Upload with Drag & Drop */}
                    <div className="sm:col-span-2 space-y-2 pt-2">
                      <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                        Profile Photograph (Included in Official PDF Dossier)
                      </label>
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingPhoto(true);
                        }}
                        onDragLeave={() => setIsDraggingPhoto(false)}
                        onDrop={handlePhotoDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                          isDraggingPhoto
                            ? 'border-[#FF9900] bg-[#FF9900]/10'
                            : 'border-white/20 bg-[#07131F]/80 hover:border-white/40'
                        }`}
                      >
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

                        {photoPreview ? (
                          <div className="flex items-center justify-center space-x-4">
                            <img
                              src={photoPreview}
                              alt="Profile Preview"
                              className="w-16 h-16 rounded-full object-cover border-2 border-[#FF9900] shadow-md"
                            />
                            <div className="text-left space-y-1">
                              <span className="text-xs font-bold text-white block">Photo attached &amp; optimized</span>
                              <span className="text-[10px] text-slate-400 block">Click or drag a new image to replace</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPhotoPreview('');
                                  setFormData((prev) => ({ ...prev, photoUrl: '' }));
                                }}
                                className="text-[10px] text-red-400 hover:text-red-300 underline"
                              >
                                Remove Photo
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <span className="text-2xl block">📸</span>
                            <span className="text-xs font-semibold text-slate-300 block">
                              Click or Drag &amp; Drop Profile Photo here
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              PNG, JPG, or WEBP (Automatically optimized &amp; resized)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Academic Credentials */}
              {currentStep === 2 && (
                <div className="bg-[#0D2235]/90 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl backdrop-blur-xl animate-fadeIn">
                  <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="font-display font-extrabold text-base text-white flex items-center gap-2">
                        <span>🎓 Step 2: Academic Credentials</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Institutional details and student identity records.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[#FF9900] bg-[#FF9900]/10 px-2.5 py-1 rounded-full border border-[#FF9900]/30 font-bold">
                      2 / 5
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* University */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                        University / Institute <span className="text-[#FF9900]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Chandigarh University"
                        value={formData.university}
                        onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#07131F] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FF9900] text-xs transition-colors"
                      />
                    </div>

                    {/* Course & Branch */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                        Course / Branch / Degree <span className="text-[#FF9900]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. B.Tech CSE (Cloud Computing)"
                        value={formData.courseBranch}
                        onChange={(e) => setFormData({ ...formData, courseBranch: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#07131F] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FF9900] text-xs transition-colors"
                      />
                    </div>

                    {/* Year & Semester */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                        Academic Year &amp; Semester <span className="text-[#FF9900]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 3rd Year / 6th Semester"
                        value={formData.yearSemester}
                        onChange={(e) => setFormData({ ...formData, yearSemester: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#07131F] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FF9900] text-xs transition-colors"
                      />
                    </div>

                    {/* Roll Number / UID */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                        Student ID / Roll Number (UID) <span className="text-[#FF9900]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 23BCS1001"
                        value={formData.studentId}
                        onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#07131F] border border-white/15 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#FF9900] transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Domain & Online Profiles */}
              {currentStep === 3 && (
                <div className="bg-[#0D2235]/90 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl backdrop-blur-xl animate-fadeIn">
                  <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="font-display font-extrabold text-base text-white flex items-center gap-2">
                        <span>⚡ Step 3: Domain Track &amp; Online Presence</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Select your specialization track within AWS SBG and link your public profiles.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[#FF9900] bg-[#FF9900]/10 px-2.5 py-1 rounded-full border border-[#FF9900]/30 font-bold">
                      3 / 5
                    </span>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Domain Selection */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                        Primary Domain / Track of Focus <span className="text-[#FF9900]">*</span>
                      </label>
                      <select
                        value={formData.domain}
                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#07131F] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FF9900] text-xs transition-colors font-medium"
                      >
                        <option value="Cloud & Infrastructure">Cloud &amp; Infrastructure (Core AWS / Architecture)</option>
                        <option value="AI / ML & Data">AI / ML &amp; Data Engineering (SageMaker / Bedrock)</option>
                        <option value="DevOps & SRE">DevOps &amp; SRE (CI/CD / Containers / Automation)</option>
                        <option value="Full-Stack Web & Mobile">Full-Stack Web &amp; Mobile Development</option>
                        <option value="Security & Governance">Cloud Security &amp; IAM Governance</option>
                        <option value="Community, Events & Operations">Community, Events &amp; Operations</option>
                        <option value="Content & Technical Documentation">Content &amp; Documentation</option>
                        <option value="Design & Creative Media">Design &amp; Creative Media</option>
                      </select>
                    </div>

                    {/* Social Profiles Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                          LinkedIn URL
                        </label>
                        <input
                          type="url"
                          placeholder="https://linkedin.com/in/username"
                          value={formData.linkedin}
                          onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                          className="w-full px-3 py-2 bg-[#07131F] border border-white/15 rounded-lg text-white font-mono text-[11px] focus:outline-none focus:border-[#FF9900]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                          GitHub URL
                        </label>
                        <input
                          type="url"
                          placeholder="https://github.com/username"
                          value={formData.github}
                          onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                          className="w-full px-3 py-2 bg-[#07131F] border border-white/15 rounded-lg text-white font-mono text-[11px] focus:outline-none focus:border-[#FF9900]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                          Portfolio / Website
                        </label>
                        <input
                          type="url"
                          placeholder="https://yourportfolio.dev"
                          value={formData.portfolio}
                          onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                          className="w-full px-3 py-2 bg-[#07131F] border border-white/15 rounded-lg text-white font-mono text-[11px] focus:outline-none focus:border-[#FF9900]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Technical Expertise, Experience & Dynamic Questions */}
              {currentStep === 4 && (
                <div className="bg-[#0D2235]/90 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl backdrop-blur-xl animate-fadeIn">
                  <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="font-display font-extrabold text-base text-white flex items-center gap-2">
                        <span>🛠️ Step 4: Technical Expertise &amp; Custom Questions</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Details of your core skills, hands-on contributions, and builder background.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[#FF9900] bg-[#FF9900]/10 px-2.5 py-1 rounded-full border border-[#FF9900]/30 font-bold">
                      4 / 5
                    </span>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Technical Skills */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                        Core Technical Skills &amp; Certifications <span className="text-[#FF9900]">*</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="e.g. AWS Core Services, IAM, S3, EC2, Lambda, Docker, Next.js, Python, TypeScript..."
                        value={formData.skills}
                        onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#07131F] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FF9900] leading-relaxed"
                      />
                    </div>

                    {/* Past Experience & Contributions */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                        Experience &amp; Community Contributions <span className="text-[#FF9900]">*</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Describe your hands-on cloud projects, hackathons, workshops conducted, or community involvement..."
                        value={formData.experience}
                        onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#07131F] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FF9900] leading-relaxed"
                      />
                    </div>

                    {/* Dynamic Questions configured via Admin Form Builder */}
                    {dynamicExtraQuestions.map((q) => (
                      <div key={q.id} className="space-y-1.5 pt-1">
                        <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                          {q.label} {q.required && <span className="text-[#FF9900]">*</span>}
                        </label>
                        {q.helpText && <p className="text-[10px] text-slate-400">{q.helpText}</p>}

                        {/* Text / URL / Email / Phone / Number */}
                        {(q.type === 'text' ||
                          q.type === 'email' ||
                          q.type === 'phone' ||
                          q.type === 'number' ||
                          q.type === 'url' ||
                          q.type === 'date') && (
                          <input
                            type={q.type === 'number' ? 'number' : q.type === 'date' ? 'date' : 'text'}
                            required={q.required}
                            placeholder={q.placeholder || ''}
                            value={customAnswers[q.id] || ''}
                            onChange={(e) => handleCustomAnswerChange(q.id, e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-[#07131F] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FF9900]"
                          />
                        )}

                        {/* Long Text */}
                        {q.type === 'textarea' && (
                          <textarea
                            rows={3}
                            required={q.required}
                            placeholder={q.placeholder || ''}
                            value={customAnswers[q.id] || ''}
                            onChange={(e) => handleCustomAnswerChange(q.id, e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-[#07131F] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FF9900]"
                          />
                        )}

                        {/* Dropdown */}
                        {q.type === 'dropdown' && (
                          <select
                            required={q.required}
                            value={customAnswers[q.id] || ''}
                            onChange={(e) => handleCustomAnswerChange(q.id, e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-[#07131F] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FF9900]"
                          >
                            <option value="">{q.placeholder || 'Select an option...'}</option>
                            {(q.options || []).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Radio / Multiple Choice */}
                        {q.type === 'radio' && (
                          <div className="space-y-1.5 pt-1">
                            {(q.options || []).map((opt) => (
                              <label key={opt} className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                                <input
                                  type="radio"
                                  name={q.id}
                                  value={opt}
                                  checked={customAnswers[q.id] === opt}
                                  onChange={() => handleCustomAnswerChange(q.id, opt)}
                                  className="text-[#FF9900] focus:ring-[#FF9900]"
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* Checkbox / Multi-Select */}
                        {q.type === 'checkbox' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {(q.options || []).map((opt) => {
                              const checked = Array.isArray(customAnswers[q.id]) && customAnswers[q.id].includes(opt);
                              return (
                                <label
                                  key={opt}
                                  className={`p-2.5 rounded-lg border flex items-center space-x-2 cursor-pointer transition-colors ${
                                    checked
                                      ? 'bg-[#FF9900]/15 border-[#FF9900] text-white'
                                      : 'bg-[#07131F] border-white/10 text-slate-300 hover:border-white/20'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleCheckboxToggle(q.id, opt)}
                                    className="text-[#FF9900] focus:ring-[#FF9900] rounded"
                                  />
                                  <span className="text-xs">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Bio & Vision */}
                    <div className="space-y-1.5 pt-1">
                      <label className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                        Bio &amp; Vision for AWS SBG (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Share any other aspirations or closing thoughts..."
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#07131F] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FF9900]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Review & Submit */}
              {currentStep === 5 && (
                <div className="bg-[#0D2235]/90 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl backdrop-blur-xl animate-fadeIn">
                  <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="font-display font-extrabold text-base text-white flex items-center gap-2">
                        <span>📋 Step 5: Review Profile &amp; Confirm</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Please review your details before final submission.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[#FF9900] bg-[#FF9900]/10 px-2.5 py-1 rounded-full border border-[#FF9900]/30 font-bold">
                      5 / 5
                    </span>
                  </div>

                  {/* Summary Breakdown Card */}
                  <div className="bg-[#07131F] border border-white/10 rounded-xl p-5 space-y-4 text-xs font-sans">
                    <div className="flex items-center space-x-3 border-b border-white/10 pb-3">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Avatar"
                          className="w-12 h-12 rounded-full object-cover border border-[#FF9900]"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-amber-500/20 text-[#FF9900] border border-[#FF9900]/40 flex items-center justify-center font-bold text-base">
                          {formData.fullName.charAt(0).toUpperCase() || 'F'}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-white text-sm">{formData.fullName}</h3>
                        <span className="text-[#FF9900] font-semibold text-[11px]">{formData.domain}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Primary Email</span>
                        <span className="font-mono text-white select-all">{formData.email}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Phone</span>
                        <span className="font-mono text-white">{formData.phone}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">University &amp; Branch</span>
                        <span className="text-white">{formData.university} • {formData.courseBranch}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">UID / Roll Number</span>
                        <span className="font-mono text-white">{formData.studentId}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Skills &amp; Contributions</span>
                      <p className="text-slate-300 leading-relaxed text-[11px] whitespace-pre-wrap">{formData.skills}</p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-[11px] text-amber-200">
                    🛡️ By submitting, you confirm that the information provided is accurate and authorize AWS Student Builder Group to maintain your official Founding Member dossier.
                  </div>
                </div>
              )}

              {/* Navigation Controls Bar */}
              <div className="bg-[#0D2235]/90 border border-white/10 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xl backdrop-blur-xl">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    &larr; Back
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-7 py-2.5 bg-[#FF9900] hover:bg-[#E08800] text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <span>Next Step</span>
                    <span>&rarr;</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3 bg-gradient-to-r from-[#FF9900] to-orange-600 hover:from-[#E08800] hover:to-orange-700 text-white text-xs font-extrabold rounded-lg shadow-xl shadow-orange-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-2"
                  >
                    <span>{submitting ? 'Recording Credentials...' : '✓ Submit Founding Member Profile'}</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
