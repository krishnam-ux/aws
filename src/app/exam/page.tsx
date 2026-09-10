'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ExamPortalPage() {
  const router = useRouter();

  // Phase state
  const [phase, setPhase] = useState<'AUTH' | 'LOBBY' | 'EXAM' | 'RESULT'>('AUTH');

  // Auth Form State
  const [examId, setExamId] = useState('exam-aws-ccp-01');
  const [password, setPassword] = useState('');
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Session State
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [lobbyStatus, setLobbyStatus] = useState<string>('LOCKED');
  const [examData, setExamData] = useState<any>(null);
  const [attemptData, setAttemptData] = useState<any>(null);

  // Exam Runner State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [markedForReview, setMarkedForReview] = useState<string[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState(0);

  // Result State
  const [resultData, setResultData] = useState<any>(null);

  // Auto-restore session from sessionStorage on mount
  useEffect(() => {
    const savedToken = sessionStorage.getItem('exam_token');
    const savedAttemptId = sessionStorage.getItem('exam_attempt_id');
    if (savedToken && savedAttemptId) {
      setSessionToken(savedToken);
      setAttemptId(savedAttemptId);
      checkSession(savedAttemptId, savedToken);
    }
  }, []);

  const checkSession = async (attId: string, tok: string) => {
    try {
      const res = await fetch(`/api/exam/lobby-status?attemptId=${encodeURIComponent(attId)}&token=${encodeURIComponent(tok)}`);
      const data = await res.json();
      if (res.ok && data.status) {
        setLobbyStatus(data.status);
        setAttemptData(data);
        if (data.status === 'IN_EXAM') {
          loadExamSession(attId, tok);
        } else if (data.status === 'SUBMITTED' || data.status === 'REVIEW_REQUIRED') {
          loadResult(attId, tok);
        } else {
          setPhase('LOBBY');
        }
      }
    } catch (e) {
      console.error('Session check failed:', e);
    }
  };

  // Lobby Polling Effect
  useEffect(() => {
    if (phase !== 'LOBBY' || !attemptId || !sessionToken) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/exam/lobby-status?attemptId=${encodeURIComponent(attemptId)}&token=${encodeURIComponent(sessionToken)}`);
        const data = await res.json();
        if (res.ok && data.status) {
          setLobbyStatus(data.status);
          setAttemptData(data);
          if (data.status === 'IN_EXAM') {
            loadExamSession(attemptId, sessionToken);
          } else if (data.status === 'SUBMITTED' || data.status === 'REVIEW_REQUIRED') {
            loadResult(attemptId, sessionToken);
          }
        }
      } catch (err) {
        console.error('Lobby polling error:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [phase, attemptId, sessionToken]);

  // Exam Countdown Timer
  useEffect(() => {
    if (phase !== 'EXAM' || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit('TIME_EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, remainingSeconds]);

  // Auth Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const res = await fetch('/api/exam/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          password,
          studentName,
          rollNumber,
          email
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      setSessionToken(data.token);
      setAttemptId(data.attemptId);
      setLobbyStatus(data.status);
      setAttemptData(data);

      sessionStorage.setItem('exam_token', data.token);
      sessionStorage.setItem('exam_attempt_id', data.attemptId);

      if (data.status === 'IN_EXAM') {
        await loadExamSession(data.attemptId, data.token);
      } else if (data.status === 'SUBMITTED' || data.status === 'REVIEW_REQUIRED') {
        await loadResult(data.attemptId, data.token);
      } else {
        setPhase('LOBBY');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to authenticate.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Load Exam Session & Questions
  const loadExamSession = async (attId: string, tok: string) => {
    try {
      const res = await fetch(`/api/exam/session?attemptId=${encodeURIComponent(attId)}&token=${encodeURIComponent(tok)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load session.');

      setExamData(data.exam);
      setAttemptData(data.attempt);
      setAnswers(data.attempt.answers || {});
      setMarkedForReview(data.attempt.markedForReview || []);
      setRemainingSeconds(data.attempt.remainingSeconds || 0);
      setViolationCount(data.attempt.securityViolationsCount || 0);

      if (data.attempt.status === 'SUBMITTED' || data.attempt.status === 'REVIEW_REQUIRED') {
        loadResult(attId, tok);
      } else {
        setPhase('EXAM');
      }
    } catch (err: any) {
      console.error('Load exam session error:', err);
    }
  };

  // Start Exam (From Lobby)
  const handleStartExam = async () => {
    if (!attemptId || !sessionToken) return;

    try {
      // Request Fullscreen
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }

      const res = await fetch('/api/exam/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, token: sessionToken })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start exam.');

      await loadExamSession(attemptId, sessionToken);
    } catch (err: any) {
      alert(err.message || 'Could not start exam.');
    }
  };

  // Log Security Event
  const logClientSecurityEvent = useCallback(
    async (eventType: string, severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'WARNING', metadata: any = {}) => {
      if (!attemptId || !sessionToken || phase !== 'EXAM') return;

      try {
        const res = await fetch('/api/exam/security-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId,
            token: sessionToken,
            eventType,
            severity,
            metadata
          })
        });

        const data = await res.json();
        if (data.violationCount !== undefined) {
          setViolationCount(data.violationCount);
        }

        if (data.autoSubmitted) {
          setSecurityWarning('Security violation limit exceeded. Your exam has been submitted for review.');
          setTimeout(() => {
            loadResult(attemptId, sessionToken);
          }, 2000);
        } else if (data.warningsRemaining !== undefined) {
          setSecurityWarning(`⚠️ Warning: ${eventType.replace(/_/g, ' ')}. Warnings remaining: ${data.warningsRemaining}`);
          setTimeout(() => setSecurityWarning(null), 4000);
        }
      } catch (e) {
        console.error('Security log failed:', e);
      }
    },
    [attemptId, sessionToken, phase]
  );

  // Anti-tamper browser listeners
  useEffect(() => {
    if (phase !== 'EXAM') return;

    // Fullscreen change detection
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logClientSecurityEvent('FULLSCREEN_EXIT', 'WARNING', { action: 'exited_fullscreen' });
      }
    };

    // Window blur / Tab switch detection
    const handleBlur = () => {
      logClientSecurityEvent('TAB_BLUR', 'WARNING', { action: 'window_blur_or_tab_switch' });
    };

    // Prevent key combinations
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 or DevTools
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))) {
        e.preventDefault();
        logClientSecurityEvent('DEVTOOLS_ATTEMPT', 'CRITICAL', { key: e.key });
        return false;
      }
      // Copy, Cut, Paste, Print, Save, Select All
      if (e.ctrlKey && ['c', 'v', 'x', 'u', 'p', 's', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        logClientSecurityEvent('UNAUTHORIZED_KEY', 'WARNING', { key: e.key });
        return false;
      }
    };

    // Prevent context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logClientSecurityEvent('UNAUTHORIZED_KEY', 'INFO', { action: 'context_menu' });
      return false;
    };

    // Beforeunload warning
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Exam is in progress. Are you sure you want to leave?';
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [phase, logClientSecurityEvent]);

  // Auto-save Answers to Server
  const saveAnswersToServer = async (newAnswers: Record<string, number>, newMarked: string[]) => {
    if (!attemptId || !sessionToken || phase !== 'EXAM') return;
    setSaveStatus('saving');

    try {
      const res = await fetch('/api/exam/save-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          token: sessionToken,
          answers: newAnswers,
          markedForReview: newMarked
        })
      });

      if (!res.ok) throw new Error('Save failed');
      setSaveStatus('saved');
    } catch (e) {
      setSaveStatus('error');
    }
  };

  // Handle Option Select
  const handleSelectOption = (questionId: string, optionIndex: number) => {
    const updated = { ...answers, [questionId]: optionIndex };
    setAnswers(updated);
    saveAnswersToServer(updated, markedForReview);
  };

  // Toggle Mark For Review
  const handleToggleReview = (questionId: string) => {
    const updated = markedForReview.includes(questionId)
      ? markedForReview.filter((id) => id !== questionId)
      : [...markedForReview, questionId];
    setMarkedForReview(updated);
    saveAnswersToServer(answers, updated);
  };

  // Manual Submission
  const handleManualSubmit = async () => {
    if (!attemptId || !sessionToken || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          token: sessionToken,
          answers,
          reason: 'MANUAL'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed.');

      setIsSubmitModalOpen(false);
      await loadResult(attemptId, sessionToken);
    } catch (err: any) {
      alert(err.message || 'Failed to submit exam.');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto Submit
  const handleAutoSubmit = async (reason: string) => {
    if (!attemptId || !sessionToken) return;

    try {
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          token: sessionToken,
          answers,
          reason
        })
      });

      await loadResult(attemptId, sessionToken);
    } catch (e) {
      console.error('Auto submit error:', e);
    }
  };

  // Load Result Screen
  const loadResult = async (attId: string, tok: string) => {
    try {
      const res = await fetch(`/api/exam/result?attemptId=${encodeURIComponent(attId)}&token=${encodeURIComponent(tok)}`);
      const data = await res.json();
      if (res.ok) {
        setResultData(data);
        setPhase('RESULT');
      }
    } catch (e) {
      console.error('Failed to load result:', e);
    }
  };

  // Format Time Helper
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const questions = examData?.questions || [];
  const currentQuestion = questions[currentQIndex];

  // --------------------------------------------------------------------------
  // RENDER PHASE 1: AUTH / ENTRANCE
  // --------------------------------------------------------------------------
  if (phase === 'AUTH') {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto w-full">
          {/* Brand Lockup */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/20 mb-4 border border-indigo-400/30">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
              AWS SBG CU-UP Secure Exam Portal
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Official Assessment & Verification Gateway
            </p>
          </div>

          {/* Card */}
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60">
            {authError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start space-x-3">
                <span className="text-lg">⚠️</span>
                <div>{authError}</div>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Exam ID / Code
                  </label>
                  <input
                    type="text"
                    required
                    value={examId}
                    onChange={(e) => setExamId(e.target.value)}
                    placeholder="e.g. AWS-CCP-01"
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Exam Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Candidate Full Name
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Your Full Name (as on University Records)"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Roll Number / Student ID
                  </label>
                  <input
                    type="text"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. 23BCS10145"
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    University Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@cumail.in"
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {authLoading ? (
                    <span>Verifying Credentials…</span>
                  ) : (
                    <>
                      <span>Enter Exam Lobby</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* SEB & Lockdown Information Box */}
            <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Safe Exam Browser (SEB) Support:</span>
                <a
                  href={`/api/exam/seb-config?examId=${encodeURIComponent(examId)}`}
                  className="text-indigo-400 hover:text-indigo-300 font-medium underline flex items-center space-x-1"
                >
                  <span>Download .seb file</span>
                </a>
              </div>
              <p>
                This examination is monitored with anti-tamper security policies. Fullscreen mode is enforced upon start. Tab-switching, shortcuts, and copy-pasting are logged.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 mt-8">
          AWS Student Builder Group • Chandigarh University – Uttar Pradesh
        </div>
      </main>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER PHASE 2: LOBBY VIEW
  // --------------------------------------------------------------------------
  if (phase === 'LOBBY') {
    const isLocked = lobbyStatus === 'LOCKED';
    const isVerified = lobbyStatus === 'VERIFIED';
    const isUnlocked = lobbyStatus === 'UNLOCKED';

    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
              {attemptData?.examTitle || 'AWS Certification Assessment'}
            </h1>
            <p className="text-sm text-slate-400 mt-1 font-mono">
              Code: {attemptData?.examCode || 'AWS-CCP-01'} • Duration: {attemptData?.durationMinutes || 30} mins
            </p>
          </div>

          {/* Lobby Status Card */}
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Status Visual */}
            <div className="text-center py-6">
              {isLocked && (
                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/40 animate-pulse text-amber-400">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="text-xl font-bold text-amber-300">Exam Lobby Locked</div>
                  <p className="text-sm text-slate-400 max-w-sm mx-auto">
                    You have successfully checked into the lobby. Please wait while the exam proctor verifies your identity.
                  </p>
                </div>
              )}

              {isVerified && (
                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-500/10 border-2 border-indigo-500/40 text-indigo-400">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-xl font-bold text-indigo-300">Identity Verified</div>
                  <p className="text-sm text-slate-400 max-w-sm mx-auto">
                    Your student record has been verified. The proctor will unlock the exam session shortly.
                  </p>
                </div>
              )}

              {isUnlocked && (
                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 shadow-xl shadow-emerald-500/20">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-xl font-bold text-emerald-400">Exam Unlocked — Ready to Start</div>
                  <p className="text-sm text-slate-300 max-w-sm mx-auto">
                    Your session is authorized. Click below to begin the assessment in secure fullscreen mode.
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={handleStartExam}
                      className="w-full py-4 px-8 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-base shadow-xl shadow-emerald-500/30 transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                    >
                      <span>🚀 Start Exam Now</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Candidate Summary */}
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Candidate:</span>
                <span className="text-slate-200 font-medium">{attemptData?.studentName || studentName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Roll Number:</span>
                <span className="text-slate-200 font-mono font-medium">{attemptData?.rollNumber || rollNumber}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Lobby Status:</span>
                <span
                  className={`font-semibold uppercase tracking-wider ${
                    isUnlocked ? 'text-emerald-400' : isVerified ? 'text-indigo-400' : 'text-amber-400'
                  }`}
                >
                  {lobbyStatus}
                </span>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-xs text-slate-400 space-y-1.5 border-t border-slate-800 pt-4">
              <div className="font-semibold text-slate-300">Exam Guidelines:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                <li>Exam timer begins as soon as you press Start Exam.</li>
                <li>Do not exit fullscreen or switch browser tabs.</li>
                <li>Answers are automatically saved to the server as you select them.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 mt-8">
          AWS Student Builder Group • Chandigarh University – Uttar Pradesh
        </div>
      </main>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER PHASE 3: SECURE EXAM RUNNER
  // --------------------------------------------------------------------------
  if (phase === 'EXAM') {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="font-display font-bold text-base text-white truncate max-w-xs sm:max-w-md">
              {examData?.title}
            </div>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {examData?.examCode}
            </span>
          </div>

          {/* Authoritative Live Countdown Timer */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 hidden sm:inline">Time Remaining:</span>
              <div
                className={`font-mono text-base sm:text-lg font-bold px-3 py-1 rounded-lg border ${
                  remainingSeconds < 180
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                    : remainingSeconds < 600
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-slate-800 text-emerald-400 border-slate-700'
                }`}
              >
                ⏱ {formatTime(remainingSeconds)}
              </div>
            </div>

            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="py-1.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition"
            >
              Finish & Submit
            </button>
          </div>
        </header>

        {/* Security Warning Toast */}
        {securityWarning && (
          <div className="bg-rose-600 text-white text-xs font-semibold py-2 px-4 text-center sticky top-[57px] z-30 shadow-lg animate-bounce">
            {securityWarning}
          </div>
        )}

        {/* Main Exam Workspace */}
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Viewer (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            {currentQuestion ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
                {/* Question Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-sm font-mono border border-indigo-500/30">
                      Question {currentQIndex + 1} of {questions.length}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Marks: {currentQuestion.marks || 10}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleReview(currentQuestion.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition flex items-center space-x-1.5 ${
                      markedForReview.includes(currentQuestion.id)
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>{markedForReview.includes(currentQuestion.id) ? '★ Marked for Review' : '☆ Mark for Review'}</span>
                  </button>
                </div>

                {/* Question Text */}
                <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
                  {currentQuestion.question}
                </div>

                {/* Options List */}
                <div className="space-y-3 pt-2">
                  {currentQuestion.options?.map((optionText: string, optIdx: number) => {
                    const isSelected = answers[currentQuestion.id] === optIdx;
                    const optionLetter = String.fromCharCode(65 + optIdx);

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectOption(currentQuestion.id, optIdx)}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-start space-x-4 ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs font-mono flex-shrink-0 mt-0.5 ${
                            isSelected
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {optionLetter}
                        </span>
                        <span className="text-sm sm:text-base leading-relaxed">{optionText}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                  <button
                    disabled={currentQIndex === 0}
                    onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                    className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    ← Previous
                  </button>

                  <div className="text-xs text-slate-500">
                    {saveStatus === 'saving' && <span className="text-indigo-400">Saving answer…</span>}
                    {saveStatus === 'saved' && <span className="text-emerald-400">✓ Autosaved</span>}
                    {saveStatus === 'error' && <span className="text-rose-400">⚠️ Network offline</span>}
                  </div>

                  {currentQIndex < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                      className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsSubmitModalOpen(true)}
                      className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
                    >
                      Review & Submit
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">No questions available.</div>
            )}
          </div>

          {/* Question Navigator Sidebar (1 col) */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3">
                Question Navigator
              </div>

              {/* Grid */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q: any, idx: number) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isMarked = markedForReview.includes(q.id);
                  const isCurrent = currentQIndex === idx;

                  let bgColor = 'bg-slate-950 text-slate-400 border-slate-800';
                  if (isAnswered && isMarked) {
                    bgColor = 'bg-purple-600/30 text-purple-300 border-purple-500/50';
                  } else if (isAnswered) {
                    bgColor = 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 font-bold';
                  } else if (isMarked) {
                    bgColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQIndex(idx)}
                      className={`h-9 rounded-lg font-mono text-xs border transition flex items-center justify-center ${bgColor} ${
                        isCurrent ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 font-bold' : ''
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50"></span>
                  <span>Answered ({Object.keys(answers).length})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50"></span>
                  <span>Marked for Review ({markedForReview.length})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-slate-950 border border-slate-800"></span>
                  <span>Unanswered ({questions.length - Object.keys(answers).length})</span>
                </div>
              </div>
            </div>

            {/* Candidate Proctor Badge */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs space-y-2 text-slate-400">
              <div className="flex justify-between">
                <span>Candidate:</span>
                <span className="text-slate-200 font-medium">{attemptData?.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span>Roll No:</span>
                <span className="text-slate-200 font-mono">{attemptData?.rollNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Security Events:</span>
                <span className={violationCount > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                  {violationCount} logged
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Confirmation Modal */}
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-white font-display">Confirm Exam Submission</h3>
              <p className="text-sm text-slate-300">
                Are you sure you want to finalize and submit your assessment? Once submitted, answers cannot be modified.
              </p>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Total Questions:</span>
                  <span className="text-white font-bold">{questions.length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Questions Answered:</span>
                  <span className="text-emerald-400 font-bold">{Object.keys(answers).length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Marked for Review:</span>
                  <span className="text-amber-400 font-bold">{markedForReview.length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Unanswered:</span>
                  <span className="text-rose-400 font-bold">{questions.length - Object.keys(answers).length}</span>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition"
                >
                  Return to Exam
                </button>
                <button
                  onClick={handleManualSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-bold shadow-lg shadow-emerald-500/25 transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit Final Answers'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER PHASE 4: RESULT SCREEN
  // --------------------------------------------------------------------------
  if (phase === 'RESULT') {
    const passed = resultData?.passed;
    const isReview = resultData?.status === 'REVIEW_REQUIRED';

    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto w-full">
          {/* Brand Lockup */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
              Examination Result
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {resultData?.examTitle || 'AWS Certification Assessment'}
            </p>
          </div>

          {/* Result Card */}
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Pass/Fail Visual */}
            <div className="text-center py-4 space-y-3">
              {isReview ? (
                <>
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/40 text-amber-400 text-3xl">
                    ⚠️
                  </div>
                  <div className="text-2xl font-bold text-amber-300">Submitted — Review Required</div>
                  <p className="text-sm text-slate-400 max-w-sm mx-auto">
                    Your assessment has been submitted. Because security events were detected during your attempt, results are pending proctor review.
                  </p>
                </>
              ) : passed ? (
                <>
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 text-3xl shadow-xl shadow-emerald-500/20">
                    🏆
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">Congratulations! You Passed!</div>
                  <p className="text-sm text-slate-300">
                    You have demonstrated proficiency and met the passing criteria for this certification assessment.
                  </p>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500/40 text-rose-400 text-3xl">
                    ✕
                  </div>
                  <div className="text-2xl font-bold text-rose-400">Assessment Not Cleared</div>
                  <p className="text-sm text-slate-400">
                    You did not meet the minimum required passing percentage of {resultData?.passingPercentage || 70}%.
                  </p>
                </>
              )}
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-center">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">Score</div>
                <div className="text-lg font-bold text-white font-mono mt-0.5">
                  {resultData?.score} / {resultData?.totalMarks}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">Percentage</div>
                <div
                  className={`text-lg font-bold font-mono mt-0.5 ${
                    passed ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {resultData?.percentage}%
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">Passing Req.</div>
                <div className="text-lg font-bold text-slate-300 font-mono mt-0.5">
                  {resultData?.passingPercentage || 70}%
                </div>
              </div>
            </div>

            {/* Candidate Info */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Candidate Name:</span>
                <span className="text-white font-medium">{resultData?.studentName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Roll Number / ID:</span>
                <span className="text-white font-mono">{resultData?.rollNumber}</span>
              </div>
              {resultData?.certificateId && (
                <div className="flex justify-between text-slate-400">
                  <span>Certificate ID:</span>
                  <span className="text-indigo-400 font-mono font-bold">{resultData.certificateId}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Submission Reason:</span>
                <span className="text-slate-300 uppercase">{resultData?.submissionReason || 'MANUAL'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              {passed && resultData?.certificateId && (
                <>
                  <a
                    href={`/api/exam/certificate-pdf?attemptId=${encodeURIComponent(attemptId || '')}&token=${encodeURIComponent(sessionToken || '')}`}
                    download
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition flex items-center justify-center space-x-2"
                  >
                    <span>📜 Download Official Certificate (PDF)</span>
                  </a>

                  <Link
                    href={`/verify-certificate/${resultData.certificateId}`}
                    target="_blank"
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center justify-center space-x-1.5"
                  >
                    <span>View Public Certificate Verification Page ↗</span>
                  </Link>
                </>
              )}

              <button
                onClick={() => {
                  sessionStorage.removeItem('exam_token');
                  sessionStorage.removeItem('exam_attempt_id');
                  setPhase('AUTH');
                }}
                className="w-full py-2.5 px-4 text-xs text-slate-400 hover:text-slate-200 transition"
              >
                Log Out / Exit Assessment
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 mt-8">
          AWS Student Builder Group • Chandigarh University – Uttar Pradesh
        </div>
      </main>
    );
  }

  return null;
}
