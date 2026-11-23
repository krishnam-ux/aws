'use client';

import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  TeamWorkTask,
  TeamWorkCompletedItem,
  TeamWorkPendingItem,
  TeamWorkContributionSection,
  TeamWorkNextCommitmentsSection,
  TeamWorkCommitmentItem,
  TaskStatus,
  TaskRole,
  IndependenceOption,
  CommunicationOption,
  DeadlineConsistencyOption,
  OwnershipOption,
  ExtraContributionOption,
  CommitmentPriority
} from '@/types/teamAssessment';

export default function TeamAssessmentPage() {
  // Navigation & Step State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [email, setEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Authenticated Member & Period Data
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [memberProfile, setMemberProfile] = useState<{
    name: string;
    email: string;
    role: string;
    domain: string;
  } | null>(null);
  const [period, setPeriod] = useState<any | null>(null);
  const [assessmentStatus, setAssessmentStatus] = useState<string>('DRAFT');
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [adminPublishedReview, setAdminPublishedReview] = useState<any | null>(null);

  // Form State: Section 1 (Assigned Work)
  const [assignedTasks, setAssignedTasks] = useState<TeamWorkTask[]>([]);

  // Form State: Section 2 (Completed Work)
  const [completedTasks, setCompletedTasks] = useState<TeamWorkCompletedItem[]>([]);

  // Form State: Section 3 (Pending & Missed Work)
  const [pendingTasks, setPendingTasks] = useState<TeamWorkPendingItem[]>([]);
  const [missedResponsibilities, setMissedResponsibilities] = useState<string>('');

  // Form State: Section 4 (Contribution & Ownership)
  const [contribution, setContribution] = useState<TeamWorkContributionSection>({
    independence: 'Mostly independently',
    communication: 'Consistently',
    deadlineConsistency: 'Usually',
    ownership: 'Took full ownership',
    extraContribution: 'Yes, occasionally',
    mostValuableContribution: '',
    areaForImprovement: ''
  });

  // Form State: Section 5 (Next Commitments)
  const [commitments, setCommitments] = useState<TeamWorkNextCommitmentsSection>({
    sevenDayCommitment: '',
    thirtyDayCommitment: '',
    independentResponsibility: '',
    leadershipSupportNeeded: '',
    newInitiativeOwnership: '',
    commitmentsList: []
  });

  // Draft Autosave & Submission State
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccessRef, setSubmitSuccessRef] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Check sessionStorage on mount
  useEffect(() => {
    const savedToken = sessionStorage.getItem('twa_session_token');
    const savedEmail = sessionStorage.getItem('twa_member_email');
    if (savedEmail) setEmail(savedEmail);
    if (savedToken) {
      loadSession(savedToken);
    }
  }, []);

  const loadSession = async (token: string) => {
    try {
      setAuthLoading(true);
      const res = await fetch(`/api/team-assessment/session?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.success) {
        setSessionToken(token);
        setMemberProfile(data.member);
        setPeriod(data.period);
        populateAssessment(data.assessment);
        if (data.assessment.status === 'SUBMITTED' || data.assessment.status === 'REVIEWED') {
          setCurrentStep(7); // Show confirmation
        } else {
          setCurrentStep(2);
        }
      } else {
        sessionStorage.removeItem('twa_session_token');
      }
    } catch (err) {
      console.error('Session load error:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const populateAssessment = (ass: any) => {
    setAssessmentStatus(ass.status || 'DRAFT');
    setSubmittedAt(ass.submittedAt || null);
    if (ass.adminReview) setAdminPublishedReview(ass.adminReview);

    if (Array.isArray(ass.assignedTasks) && ass.assignedTasks.length > 0) {
      setAssignedTasks(ass.assignedTasks);
    } else {
      // Default template item
      setAssignedTasks([
        {
          id: `task_${Date.now()}_1`,
          title: '',
          description: '',
          assignedDate: new Date().toISOString().slice(0, 10),
          deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          status: 'In Progress',
          role: 'Contributor'
        }
      ]);
    }

    if (Array.isArray(ass.completedTasks) && ass.completedTasks.length > 0) {
      setCompletedTasks(ass.completedTasks);
    } else {
      setCompletedTasks([
        {
          id: `comp_${Date.now()}_1`,
          taskName: '',
          whatWasDone: '',
          completionDate: new Date().toISOString().slice(0, 10),
          evidenceUrl: '',
          evidenceType: 'GitHub',
          evidenceDescription: '',
          verificationStatus: 'Pending Verification'
        }
      ]);
    }

    if (Array.isArray(ass.pendingTasks) && ass.pendingTasks.length > 0) {
      setPendingTasks(ass.pendingTasks);
    }

    if (ass.missedResponsibilities) {
      setMissedResponsibilities(ass.missedResponsibilities);
    }

    if (ass.contribution) {
      setContribution({
        independence: ass.contribution.independence || 'Mostly independently',
        communication: ass.contribution.communication || 'Consistently',
        deadlineConsistency: ass.contribution.deadlineConsistency || 'Usually',
        ownership: ass.contribution.ownership || 'Took full ownership',
        extraContribution: ass.contribution.extraContribution || 'Yes, occasionally',
        mostValuableContribution: ass.contribution.mostValuableContribution || '',
        areaForImprovement: ass.contribution.areaForImprovement || ''
      });
    }

    if (ass.commitments) {
      setCommitments({
        sevenDayCommitment: ass.commitments.sevenDayCommitment || '',
        thirtyDayCommitment: ass.commitments.thirtyDayCommitment || '',
        independentResponsibility: ass.commitments.independentResponsibility || '',
        leadershipSupportNeeded: ass.commitments.leadershipSupportNeeded || '',
        newInitiativeOwnership: ass.commitments.newInitiativeOwnership || '',
        commitmentsList: ass.commitments.commitmentsList || []
      });
    }
  };

  // Handle Authentication & Period Check
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email.trim()) {
      setAuthError('Please enter your university or registered team email.');
      return;
    }

    try {
      setAuthLoading(true);
      const res = await fetch('/api/team-assessment/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.message || data.error || 'Authentication failed.');
        return;
      }

      setSessionToken(data.sessionToken);
      sessionStorage.setItem('twa_session_token', data.sessionToken);
      sessionStorage.setItem('twa_member_email', email.trim().toLowerCase());
      setMemberProfile(data.member);
      setPeriod(data.period);
      populateAssessment(data.assessment);

      if (data.assessment.status === 'SUBMITTED' || data.assessment.status === 'REVIEWED') {
        setCurrentStep(7);
      } else {
        setCurrentStep(2);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Unable to connect to assessment server.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Save In-Progress Draft
  const saveDraft = async (silent = false) => {
    if (!sessionToken || assessmentStatus === 'SUBMITTED' || assessmentStatus === 'REVIEWED') return;

    try {
      if (!silent) setSaveStatus('saving');
      const res = await fetch('/api/team-assessment/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: sessionToken,
          assignedTasks,
          completedTasks,
          pendingTasks,
          missedResponsibilities,
          contribution,
          commitments
        })
      });

      const data = await res.json();
      if (data.success) {
        if (!silent) {
          setSaveStatus('saved');
          setSaveMessage('Draft progress saved.');
          setTimeout(() => setSaveStatus('idle'), 2500);
        }
      }
    } catch (err) {
      if (!silent) setSaveStatus('error');
    }
  };

  // Section 1 Task Helpers
  const addAssignedTask = () => {
    setAssignedTasks([
      ...assignedTasks,
      {
        id: `task_${Date.now()}_${assignedTasks.length + 1}`,
        title: '',
        description: '',
        assignedDate: new Date().toISOString().slice(0, 10),
        deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        status: 'In Progress',
        role: 'Contributor'
      }
    ]);
  };

  const updateAssignedTask = (index: number, fields: Partial<TeamWorkTask>) => {
    const updated = [...assignedTasks];
    updated[index] = { ...updated[index], ...fields };
    setAssignedTasks(updated);
  };

  const removeAssignedTask = (index: number) => {
    setAssignedTasks(assignedTasks.filter((_, i) => i !== index));
  };

  // Section 2 Completed Task Helpers
  const addCompletedTask = () => {
    setCompletedTasks([
      ...completedTasks,
      {
        id: `comp_${Date.now()}_${completedTasks.length + 1}`,
        taskName: '',
        whatWasDone: '',
        completionDate: new Date().toISOString().slice(0, 10),
        evidenceUrl: '',
        evidenceType: 'GitHub',
        evidenceDescription: '',
        verificationStatus: 'Pending Verification'
      }
    ]);
  };

  const updateCompletedTask = (index: number, fields: Partial<TeamWorkCompletedItem>) => {
    const updated = [...completedTasks];
    updated[index] = { ...updated[index], ...fields };
    setCompletedTasks(updated);
  };

  const removeCompletedTask = (index: number) => {
    setCompletedTasks(completedTasks.filter((_, i) => i !== index));
  };

  // Section 3 Pending Task Helpers
  const addPendingTask = () => {
    setPendingTasks([
      ...pendingTasks,
      {
        id: `pend_${Date.now()}_${pendingTasks.length + 1}`,
        taskName: '',
        originalDeadline: new Date().toISOString().slice(0, 10),
        currentStatus: 'In Progress',
        reasonForDelay: '',
        newExpectedCompletionDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        supportRequired: ''
      }
    ]);
  };

  const updatePendingTask = (index: number, fields: Partial<TeamWorkPendingItem>) => {
    const updated = [...pendingTasks];
    updated[index] = { ...updated[index], ...fields };
    setPendingTasks(updated);
  };

  const removePendingTask = (index: number) => {
    setPendingTasks(pendingTasks.filter((_, i) => i !== index));
  };

  // Section 5 Commitments List Helpers
  const addCommitmentItem = () => {
    const currentList = commitments.commitmentsList || [];
    setCommitments({
      ...commitments,
      commitmentsList: [
        ...currentList,
        {
          id: `comm_${Date.now()}_${currentList.length + 1}`,
          commitment: '',
          timeframe: '7_DAYS',
          deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          priority: 'High'
        }
      ]
    });
  };

  const updateCommitmentItem = (index: number, fields: Partial<TeamWorkCommitmentItem>) => {
    const currentList = [...(commitments.commitmentsList || [])];
    currentList[index] = { ...currentList[index], ...fields };
    setCommitments({ ...commitments, commitmentsList: currentList });
  };

  const removeCommitmentItem = (index: number) => {
    const currentList = commitments.commitmentsList || [];
    setCommitments({
      ...commitments,
      commitmentsList: currentList.filter((_, i) => i !== index)
    });
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    setValidationErrors([]);
    if (!sessionToken) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/team-assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: sessionToken,
          assignedTasks,
          completedTasks,
          pendingTasks,
          missedResponsibilities,
          contribution,
          commitments
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.details && Array.isArray(data.details)) {
          setValidationErrors(data.details);
        } else {
          setValidationErrors([data.error || 'Submission failed.']);
        }
        return;
      }

      setAssessmentStatus('SUBMITTED');
      setSubmittedAt(data.submittedAt);
      setSubmitSuccessRef(data.referenceId || `TWA-${Date.now().toString().slice(-6)}`);
      setCurrentStep(7);
    } catch (err: any) {
      setValidationErrors([err.message || 'Submission error.']);
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: 'Identity' },
    { num: 2, label: '1. Assigned Work' },
    { num: 3, label: '2. Completed Work' },
    { num: 4, label: '3. Pending & Missed' },
    { num: 5, label: '4. Contribution' },
    { num: 6, label: '5. Next Commitments' },
    { num: 7, label: 'Review & Submit' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0b1120] text-slate-100 selection:bg-[#FF9900]/30 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-12">
        {/* Header Title Banner */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[#FF9900] text-xs font-semibold uppercase tracking-wider mb-3">
            <span className="w-2 h-2 rounded-full bg-[#FF9900] animate-pulse"></span>
            Internal Performance & Contribution Review
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
            AWS SBG CU-UP — Team Work & Contribution Review
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
            Official internal self-review of deliverables, ownership, milestones, and upcoming technical commitments.
          </p>
        </div>

        {/* Multi-Step Stepper Bar (if authenticated) */}
        {memberProfile && (
          <div className="mb-8 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
              {steps.map(s => (
                <button
                  key={s.num}
                  onClick={() => {
                    if (assessmentStatus !== 'SUBMITTED' && assessmentStatus !== 'REVIEWED' && s.num !== 1) {
                      saveDraft(true);
                      setCurrentStep(s.num);
                    }
                  }}
                  disabled={s.num === 1 || assessmentStatus === 'SUBMITTED'}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                    currentStep === s.num
                      ? 'bg-[#FF9900] text-slate-950 font-bold shadow-md shadow-[#FF9900]/20'
                      : currentStep > s.num
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    currentStep === s.num ? 'bg-slate-950 text-[#FF9900]' : currentStep > s.num ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {currentStep > s.num ? '✓' : s.num}
                  </span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>

            {/* Member Snapshot Bar */}
            <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <span className="text-white font-bold">{memberProfile.name}</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px]">{memberProfile.role}</span>
                <span className="text-[#FF9900] font-medium">{memberProfile.domain}</span>
              </div>

              <div className="flex items-center gap-3">
                {saveStatus === 'saving' && <span className="text-amber-400 text-[11px] animate-pulse">Saving draft...</span>}
                {saveStatus === 'saved' && <span className="text-emerald-400 text-[11px]">✓ Draft saved</span>}
                {assessmentStatus !== 'SUBMITTED' && assessmentStatus !== 'REVIEWED' && (
                  <button
                    onClick={() => saveDraft(false)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition cursor-pointer"
                  >
                    Save Draft
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: AUTHENTICATION / ELIGIBILITY */}
        {currentStep === 1 && (
          <div className="max-w-md mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl text-[#FF9900] mb-4">
              🛡️
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Verify Team Identity</h2>
            <p className="text-xs text-slate-400 mb-6">
              Enter your registered university email to access your active team assessment dossier.
            </p>

            {authError && (
              <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  University / Team Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name.uid@cumail.in / username@gmail.com"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-[#FF9900] hover:bg-[#e08800] text-slate-950 font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-[#FF9900]/20 cursor-pointer disabled:opacity-50"
              >
                {authLoading ? 'Verifying Roster...' : 'Continue to Assessment →'}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: SECTION 1 — ASSIGNED WORK */}
        {currentStep === 2 && memberProfile && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-[#FF9900] uppercase tracking-wider">SECTION 1 OF 5</span>
                <h2 className="text-xl font-bold text-white mt-0.5">Assigned Work & Responsibilities</h2>
                <p className="text-xs text-slate-400 mt-1">
                  List all tasks, project deliverables, and team responsibilities assigned to you during this cycle.
                </p>
              </div>
              <button
                onClick={addAssignedTask}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                + Add Task
              </button>
            </div>

            <div className="space-y-4">
              {assignedTasks.map((t, idx) => (
                <div key={t.id || idx} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#FF9900] font-bold">Task #{idx + 1}</span>
                    {assignedTasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAssignedTask(idx)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Task Title *</label>
                      <input
                        type="text"
                        value={t.title}
                        onChange={e => updateAssignedTask(idx, { title: e.target.value })}
                        placeholder="e.g., Build CloudXplore #02 Lab Architecture"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF9900]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Your Role *</label>
                      <select
                        value={t.role}
                        onChange={e => updateAssignedTask(idx, { role: e.target.value as TaskRole })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF9900]"
                      >
                        <option value="Lead">Lead</option>
                        <option value="Co-lead">Co-lead</option>
                        <option value="Contributor">Contributor</option>
                        <option value="Support">Support</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Task Description / Scope</label>
                    <textarea
                      value={t.description}
                      onChange={e => updateAssignedTask(idx, { description: e.target.value })}
                      placeholder="Brief details of what this assignment entailed..."
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF9900]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Assigned Date</label>
                      <input
                        type="date"
                        value={t.assignedDate}
                        onChange={e => updateAssignedTask(idx, { assignedDate: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF9900]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Expected Deadline *</label>
                      <input
                        type="date"
                        value={t.deadline}
                        onChange={e => updateAssignedTask(idx, { deadline: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF9900]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Current Status *</label>
                      <select
                        value={t.status}
                        onChange={e => updateAssignedTask(idx, { status: e.target.value as TaskStatus })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF9900]"
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Blocked">Blocked</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-500">Auto-saved to draft</span>
              <button
                onClick={() => {
                  saveDraft(true);
                  setCurrentStep(3);
                }}
                className="px-6 py-2.5 bg-[#FF9900] hover:bg-[#e08800] text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Save & Continue to Completed Work →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SECTION 2 — COMPLETED WORK & EVIDENCE */}
        {currentStep === 3 && memberProfile && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-[#FF9900] uppercase tracking-wider">SECTION 2 OF 5</span>
                <h2 className="text-xl font-bold text-white mt-0.5">Completed Work & Deliverables</h2>
                <p className="text-xs text-slate-400 mt-1">
                  What work have you ACTUALLY completed? Provide verifiable evidence, links, and completion details for admin evaluation.
                </p>
              </div>
              <button
                onClick={addCompletedTask}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                + Add Completed Work
              </button>
            </div>

            <div className="space-y-4">
              {completedTasks.map((c, idx) => (
                <div key={c.id || idx} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-emerald-400 font-bold">Deliverable #{idx + 1}</span>
                    {completedTasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCompletedTask(idx)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Task / Deliverable Name *</label>
                      <input
                        type="text"
                        value={c.taskName}
                        onChange={e => updateCompletedTask(idx, { taskName: e.target.value })}
                        placeholder="e.g., Developed API Gateway & Lambda authorizer"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF9900]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Completion Date *</label>
                      <input
                        type="date"
                        value={c.completionDate}
                        onChange={e => updateCompletedTask(idx, { completionDate: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF9900]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">What Exactly Did You Do? *</label>
                    <textarea
                      value={c.whatWasDone}
                      onChange={e => updateCompletedTask(idx, { whatWasDone: e.target.value })}
                      placeholder="Detailed explanation of your specific implementation, code, design, or operational execution..."
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF9900]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Evidence Type</label>
                      <select
                        value={c.evidenceType || 'GitHub'}
                        onChange={e => updateCompletedTask(idx, { evidenceType: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF9900]"
                      >
                        <option value="GitHub">GitHub Repository / PR</option>
                        <option value="Drive">Google Drive / Documentation</option>
                        <option value="Event">Event / Project URL</option>
                        <option value="Document">PDF / Cloud Architecture Document</option>
                        <option value="Other">Other Verifiable Proof</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Evidence URL / Link</label>
                      <input
                        type="url"
                        value={c.evidenceUrl || ''}
                        onChange={e => updateCompletedTask(idx, { evidenceUrl: e.target.value })}
                        placeholder="https://github.com/... or https://drive.google.com/..."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF9900]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  saveDraft(true);
                  setCurrentStep(2);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition cursor-pointer"
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  saveDraft(true);
                  setCurrentStep(4);
                }}
                className="px-6 py-2.5 bg-[#FF9900] hover:bg-[#e08800] text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Save & Continue to Pending & Missed Work →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SECTION 3 — PENDING & MISSED WORK */}
        {currentStep === 4 && memberProfile && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-[#FF9900] uppercase tracking-wider">SECTION 3 OF 5</span>
                <h2 className="text-xl font-bold text-white mt-0.5">Pending / Missed Work</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Honest reflection of unfinished tasks, blockers, delayed milestones, and any missed responsibilities.
                </p>
              </div>
              <button
                onClick={addPendingTask}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                + Add Pending Task
              </button>
            </div>

            {/* Pending Tasks List */}
            <div className="space-y-4">
              {pendingTasks.length === 0 ? (
                <div className="p-4 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                  No currently delayed tasks reported. Click "+ Add Pending Task" if any assigned work is pending.
                </div>
              ) : (
                pendingTasks.map((p, idx) => (
                  <div key={p.id || idx} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-amber-400 font-bold">Pending Task #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removePendingTask(idx)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Task Name</label>
                        <input
                          type="text"
                          value={p.taskName}
                          onChange={e => updatePendingTask(idx, { taskName: e.target.value })}
                          placeholder="e.g., Workshop slide deck completion"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF9900]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Original Deadline</label>
                        <input
                          type="date"
                          value={p.originalDeadline}
                          onChange={e => updatePendingTask(idx, { originalDeadline: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF9900]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">New Expected Completion Date</label>
                        <input
                          type="date"
                          value={p.newExpectedCompletionDate}
                          onChange={e => updatePendingTask(idx, { newExpectedCompletionDate: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF9900]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Reason for Delay / Blockers</label>
                        <textarea
                          value={p.reasonForDelay}
                          onChange={e => updatePendingTask(idx, { reasonForDelay: e.target.value })}
                          placeholder="Why was this milestone delayed?"
                          rows={2}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF9900]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Support Required from Team</label>
                        <textarea
                          value={p.supportRequired}
                          onChange={e => updatePendingTask(idx, { supportRequired: e.target.value })}
                          placeholder="What assistance or resources do you need?"
                          rows={2}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF9900]"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Missed Responsibilities Long Text */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Which assigned responsibility did you fail to complete or miss entirely during this period?
              </label>
              <p className="text-[11px] text-slate-400">
                Honest self-awareness is valued over omission. Describe any assignment that slipped or remained unattended.
              </p>
              <textarea
                value={missedResponsibilities}
                onChange={e => setMissedResponsibilities(e.target.value)}
                placeholder="State openly if any task was missed, why it happened, and what was learned..."
                rows={3}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF9900]"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  saveDraft(true);
                  setCurrentStep(3);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition cursor-pointer"
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  saveDraft(true);
                  setCurrentStep(5);
                }}
                className="px-6 py-2.5 bg-[#FF9900] hover:bg-[#e08800] text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Save & Continue to Contribution & Ownership →
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: SECTION 4 — CONTRIBUTION & OWNERSHIP */}
        {currentStep === 5 && memberProfile && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-xs font-mono font-bold text-[#FF9900] uppercase tracking-wider">SECTION 4 OF 5</span>
              <h2 className="text-xl font-bold text-white mt-0.5">Contribution & Ownership</h2>
              <p className="text-xs text-slate-400 mt-1">
                Structured reflection on your working independence, communication habits, and initiative.
              </p>
            </div>

            <div className="space-y-5">
              {/* Q1: Independence */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-white">
                  Q1. How independently did you complete your work? *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                  {[
                    'Completely independently',
                    'Mostly independently',
                    'Needed occasional guidance',
                    'Needed frequent guidance',
                    'Could not complete without someone else'
                  ].map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                        contribution.independence === opt
                          ? 'bg-[#FF9900]/10 border-[#FF9900] text-white font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="independence"
                        value={opt}
                        checked={contribution.independence === opt}
                        onChange={() => setContribution({ ...contribution, independence: opt as IndependenceOption })}
                        className="text-[#FF9900] focus:ring-0"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Q2: Progress Communication */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-white">
                  Q2. How consistently did you communicate your progress to the team? *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1">
                  {['Consistently', 'Usually', 'Sometimes', 'Rarely', 'Almost never'].map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                        contribution.communication === opt
                          ? 'bg-[#FF9900]/10 border-[#FF9900] text-white font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="communication"
                        value={opt}
                        checked={contribution.communication === opt}
                        onChange={() => setContribution({ ...contribution, communication: opt as CommunicationOption })}
                        className="text-[#FF9900] focus:ring-0"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Q3: Deadline Consistency */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-white">
                  Q3. How often did you meet your agreed deadlines? *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1">
                  {['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'].map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                        contribution.deadlineConsistency === opt
                          ? 'bg-[#FF9900]/10 border-[#FF9900] text-white font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deadlineConsistency"
                        value={opt}
                        checked={contribution.deadlineConsistency === opt}
                        onChange={() => setContribution({ ...contribution, deadlineConsistency: opt as DeadlineConsistencyOption })}
                        className="text-[#FF9900] focus:ring-0"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Q4: Ownership */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-white">
                  Q4. How much ownership did you take over your deliverables? *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                  {[
                    'Took full ownership',
                    'Took good ownership',
                    'Did assigned work only',
                    'Needed repeated follow-up',
                    'Did not take ownership'
                  ].map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                        contribution.ownership === opt
                          ? 'bg-[#FF9900]/10 border-[#FF9900] text-white font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="ownership"
                        value={opt}
                        checked={contribution.ownership === opt}
                        onChange={() => setContribution({ ...contribution, ownership: opt as OwnershipOption })}
                        className="text-[#FF9900] focus:ring-0"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Q5: Extra Contribution */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-white">
                  Q5. Did you contribute beyond your directly assigned responsibilities? *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1">
                  {['Yes, significantly', 'Yes, occasionally', 'Only assigned work', 'Very little', 'No'].map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                        contribution.extraContribution === opt
                          ? 'bg-[#FF9900]/10 border-[#FF9900] text-white font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="extraContribution"
                        value={opt}
                        checked={contribution.extraContribution === opt}
                        onChange={() => setContribution({ ...contribution, extraContribution: opt as ExtraContributionOption })}
                        className="text-[#FF9900] focus:ring-0"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Q6: Most valuable contribution */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-white">
                  Q6. What was your most valuable contribution to AWS SBG CU-UP during this working period? *
                </label>
                <textarea
                  value={contribution.mostValuableContribution}
                  onChange={e => setContribution({ ...contribution, mostValuableContribution: e.target.value })}
                  placeholder="Detail the project, technical achievement, workshop, or community impact you are most proud of..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF9900]"
                />
              </div>

              {/* Q7: Area for improvement */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-white">
                  Q7. What is one concrete area where your execution, technical depth, or consistency needs improvement? *
                </label>
                <textarea
                  value={contribution.areaForImprovement}
                  onChange={e => setContribution({ ...contribution, areaForImprovement: e.target.value })}
                  placeholder="Identify areas you are actively working on (e.g., deeper AWS cloud automation, faster PR delivery)..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF9900]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  saveDraft(true);
                  setCurrentStep(4);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition cursor-pointer"
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  saveDraft(true);
                  setCurrentStep(6);
                }}
                className="px-6 py-2.5 bg-[#FF9900] hover:bg-[#e08800] text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Save & Continue to Next Commitments →
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: SECTION 5 — NEXT COMMITMENTS */}
        {currentStep === 6 && memberProfile && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-xs font-mono font-bold text-[#FF9900] uppercase tracking-wider">SECTION 5 OF 5</span>
              <h2 className="text-xl font-bold text-white mt-0.5">Next Commitments & Future Ownership</h2>
              <p className="text-xs text-slate-400 mt-1">
                Define your tangible commitments for the upcoming sprint, next 30 days, and leadership areas.
              </p>
            </div>

            <div className="space-y-4">
              {/* 7 Day Commitment */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-white">
                  1. What specific deliverables will you complete in the next 7 days? *
                </label>
                <textarea
                  value={commitments.sevenDayCommitment}
                  onChange={e => setCommitments({ ...commitments, sevenDayCommitment: e.target.value })}
                  placeholder="Immediate priority tasks to ship within 7 days..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF9900]"
                />
              </div>

              {/* 30 Day Commitment */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-white">
                  2. What major project / responsibility will you complete in the next 30 days? *
                </label>
                <textarea
                  value={commitments.thirtyDayCommitment}
                  onChange={e => setCommitments({ ...commitments, thirtyDayCommitment: e.target.value })}
                  placeholder="30-day milestone deliverables..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF9900]"
                />
              </div>

              {/* Independent Responsibility */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-white">
                  3. What responsibility or domain can you independently own without needing follow-up?
                </label>
                <textarea
                  value={commitments.independentResponsibility}
                  onChange={e => setCommitments({ ...commitments, independentResponsibility: e.target.value })}
                  placeholder="e.g., Weekly Quiz infrastructure maintenance, Workshop Discord support, etc."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF9900]"
                />
              </div>

              {/* Leadership Support Needed */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-white">
                  4. What specific support or guidance do you need from the leadership team?
                </label>
                <textarea
                  value={commitments.leadershipSupportNeeded}
                  onChange={e => setCommitments({ ...commitments, leadershipSupportNeeded: e.target.value })}
                  placeholder="e.g., AWS credits approval, technical review sessions, scheduling assistance..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF9900]"
                />
              </div>

              {/* New Initiative Ownership */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-white">
                  5. What new initiative or project would you like to propose and lead?
                </label>
                <textarea
                  value={commitments.newInitiativeOwnership}
                  onChange={e => setCommitments({ ...commitments, newInitiativeOwnership: e.target.value })}
                  placeholder="Propose a new hackathon track, open source AWS tool, or workshop idea..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF9900]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  saveDraft(true);
                  setCurrentStep(5);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition cursor-pointer"
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  saveDraft(true);
                  setCurrentStep(7);
                }}
                className="px-6 py-2.5 bg-[#FF9900] hover:bg-[#e08800] text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Review & Finalize Submission →
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: REVIEW & SUBMIT / CONFIRMATION */}
        {currentStep === 7 && memberProfile && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
            {assessmentStatus === 'SUBMITTED' || assessmentStatus === 'REVIEWED' ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-3xl mx-auto">
                  ✓
                </div>
                <h2 className="text-2xl font-bold text-white">Assessment Submitted Successfully</h2>
                <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto">
                  Your Team Work & Contribution Review has been securely frozen and submitted for administrative evaluation.
                </p>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-[#FF9900]">
                  Reference ID: {submitSuccessRef || 'TWA-CONFIRMED'}
                </div>

                <div className="pt-4 text-xs text-slate-500">
                  Submitted at: {submittedAt ? new Date(submittedAt).toLocaleString('en-IN') : 'Confirmed'}
                </div>

                {/* If Admin Published Scores */}
                {adminPublishedReview && (
                  <div className="mt-6 p-5 bg-slate-950 border border-slate-800 rounded-2xl text-left max-w-lg mx-auto space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Admin Evaluation Published</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/30">
                        {adminPublishedReview.finalStatus}
                      </span>
                    </div>
                    <div className="text-xl font-bold text-white">
                      Overall Score: {adminPublishedReview.overallScore}/10 (Avg: {adminPublishedReview.calculatedAverageScore})
                    </div>
                    {adminPublishedReview.adminFeedback && (
                      <p className="text-xs text-slate-300 italic">
                        "{adminPublishedReview.adminFeedback}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="border-b border-slate-800 pb-4">
                  <span className="text-xs font-mono font-bold text-[#FF9900] uppercase tracking-wider">FINAL REVIEW</span>
                  <h2 className="text-xl font-bold text-white mt-0.5">Review Before Final Submission</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Once submitted, your self-review and evidence links will be permanently locked for administrative performance review.
                  </p>
                </div>

                {validationErrors.length > 0 && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 space-y-1">
                    <div className="font-bold">Please complete the following required items:</div>
                    {validationErrors.map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-xs text-slate-500 font-mono">Assigned Tasks</span>
                    <div className="text-xl font-bold text-white mt-1">{assignedTasks.length} Tasks</div>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-xs text-slate-500 font-mono">Completed Deliverables</span>
                    <div className="text-xl font-bold text-emerald-400 mt-1">{completedTasks.length} Completed</div>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-xs text-slate-500 font-mono">Pending Tasks</span>
                    <div className="text-xl font-bold text-amber-400 mt-1">{pendingTasks.length} Pending</div>
                  </div>
                </div>

                {/* Detailed Preview Section */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500">Independence:</span>{' '}
                    <span className="text-white font-semibold">{contribution.independence}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Ownership:</span>{' '}
                    <span className="text-white font-semibold">{contribution.ownership}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Deadline Consistency:</span>{' '}
                    <span className="text-white font-semibold">{contribution.deadlineConsistency}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Valuable Contribution:</span>
                    <p className="text-slate-300 mt-0.5">{contribution.mostValuableContribution || 'None specified'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">7-Day Next Commitment:</span>
                    <p className="text-slate-300 mt-0.5">{commitments.sevenDayCommitment || 'None specified'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setCurrentStep(6)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition cursor-pointer"
                  >
                    ← Back to Edit
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    disabled={submitting}
                    className="px-8 py-3 bg-[#FF9900] hover:bg-[#e08800] text-slate-950 font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-[#FF9900]/20 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Submitting Assessment...' : 'Confirm & Finalize Submission ✓'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
