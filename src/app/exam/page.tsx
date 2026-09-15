'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

interface ExamPortalPageProps {
  initialExamId?: string;
}

type DashboardTab =
  | 'dashboard'
  | 'my-exam'
  | 'schedule'
  | 'instructions'
  | 'security-seb'
  | 'submission-status'
  | 'help-support';

function ExamPortalContent({ initialExamId }: ExamPortalPageProps) {
  const params = useParams();
  const searchParams = useSearchParams();

  // Dynamic Exam ID if pre-populated from route (/exam/[examId]) or query param (?examId=...)
  const routeExamId = initialExamId || (params?.examId as string) || searchParams?.get('examId') || '';

  // Portal Publication State
  const [portalPublished, setPortalPublished] = useState<boolean | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Active Phase: AUTH -> DASHBOARD -> SEB_PREP -> LOBBY -> EXAM -> EXAM_LOCKED -> SUBMITTED
  const [phase, setPhase] = useState<'AUTH' | 'DASHBOARD' | 'SEB_PREP' | 'LOBBY' | 'EXAM' | 'EXAM_LOCKED' | 'SUBMITTED'>('AUTH');

  // Active Sidebar Tab for Candidate Dashboard
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Support / Help Modal
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Auth Form State (User ID = University Email + Auto-Generated Exam Password)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [examId, setExamId] = useState(routeExamId);
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Lock Recovery State
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [lockReason, setLockReason] = useState<string | null>(null);
  const [lockCount, setLockCount] = useState(0);

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
  const [submissionReference, setSubmissionReference] = useState<string>('');

  // SEB Detection
  const [isSEB, setIsSEB] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent;
      setIsSEB(ua.includes('SEB') || ua.includes('SafeExamBrowser'));
    }
  }, []);

  // Check Public Portal Publication Status
  useEffect(() => {
    let isMounted = true;
    async function checkStatus() {
      try {
        const res = await fetch('/api/exam/status', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setPortalPublished(Boolean(data.published));
          }
        } else {
          if (isMounted) setPortalPublished(false);
        }
      } catch {
        if (isMounted) setPortalPublished(false);
      } finally {
        if (isMounted) setStatusLoading(false);
      }
    }
    checkStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update examId when routeExamId changes
  useEffect(() => {
    if (routeExamId) {
      setExamId(routeExamId);
    }
  }, [routeExamId]);

  // Check session status on mount if session exists in sessionStorage
  useEffect(() => {
    const savedToken = sessionStorage.getItem('exam_token');
    const savedAttemptId = sessionStorage.getItem('exam_attempt_id');
    const savedName = sessionStorage.getItem('exam_student_name');
    const savedRoll = sessionStorage.getItem('exam_roll_number');
    const savedEmail = sessionStorage.getItem('exam_email');
    const savedExamId = sessionStorage.getItem('exam_id');

    if (savedName) setStudentName(savedName);
    if (savedRoll) setRollNumber(savedRoll);
    if (savedEmail) setEmail(savedEmail);
    if (savedExamId) setExamId(savedExamId);

    if (savedToken && savedAttemptId) {
      setSessionToken(savedToken);
      setAttemptId(savedAttemptId);
      checkSession(savedAttemptId, savedToken);
    }
  }, []);

  const checkSession = async (attId: string, tok: string) => {
    try {
      const res = await fetch(
        `/api/exam/lobby-status?attemptId=${encodeURIComponent(attId)}&token=${encodeURIComponent(tok)}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (res.ok && data.status) {
        setLobbyStatus(data.status);
        setAttemptData(data);
        if (data.status === 'IN_EXAM') {
          loadExamSession(attId, tok);
        } else if (data.status === 'EXAM_LOCKED') {
          setPhase('EXAM_LOCKED');
          setLockReason(data.lockReason || 'Secure exam environment interrupted');
          setLockCount(data.lockCount || 1);
        } else if (data.status === 'SUBMITTED' || data.status === 'REVIEW_REQUIRED') {
          setPhase('SUBMITTED');
        } else {
          // Keep candidate on dashboard
          setPhase('DASHBOARD');
        }
      }
    } catch (err) {
      console.error('Session check error:', err);
    }
  };

  // 1. Candidate Authentication Handler (User ID = Email + Password)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!email.trim()) {
      setAuthError('Please enter your Registered University Email (User ID).');
      return;
    }
    if (!password.trim()) {
      setAuthError('Please enter your Examination Password provided by the administrator.');
      return;
    }

    setAuthLoading(true);

    try {
      const res = await fetch('/api/exam/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
          examId: examId ? examId.trim() : undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check your credentials.');
      }

      setSessionToken(data.token);
      setAttemptId(data.attemptId);
      setLobbyStatus(data.status || 'LOCKED');
      setStudentName(data.studentName || '');
      setRollNumber(data.rollNumber || '');
      setEmail(data.email || email.trim().toLowerCase());
      setExamId(data.examId || examId);

      setExamData({
        id: data.examId,
        title: data.examTitle,
        examCode: data.examCode,
        durationMinutes: data.durationMinutes,
        category: data.category || 'Certification',
        passingPercentage: data.passingPercentage || 70,
        requireSecureBrowser: Boolean(data.requireSecureBrowser),
        maxSecurityViolations: data.maxSecurityViolations || 3,
        questionsCount: data.questionsCount || 0
      });

      // Persist candidate session
      sessionStorage.setItem('exam_token', data.token);
      sessionStorage.setItem('exam_attempt_id', data.attemptId);
      sessionStorage.setItem('exam_student_name', data.studentName || '');
      sessionStorage.setItem('exam_roll_number', data.rollNumber || '');
      sessionStorage.setItem('exam_email', data.email || email.trim().toLowerCase());
      sessionStorage.setItem('exam_id', data.examId || examId);

      if (data.status === 'IN_EXAM') {
        loadExamSession(data.attemptId, data.token);
      } else if (data.status === 'SUBMITTED' || data.status === 'REVIEW_REQUIRED') {
        setPhase('SUBMITTED');
      } else {
        // Direct candidate to Enterprise Dashboard
        setPhase('DASHBOARD');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please verify your credentials or contact the proctor.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign out candidate from portal
  const handleSignOut = () => {
    sessionStorage.removeItem('exam_token');
    sessionStorage.removeItem('exam_attempt_id');
    sessionStorage.removeItem('exam_student_name');
    sessionStorage.removeItem('exam_roll_number');
    sessionStorage.removeItem('exam_email');
    sessionStorage.removeItem('exam_id');
    setSessionToken(null);
    setAttemptId(null);
    setExamData(null);
    setAttemptData(null);
    setPassword('');
    setPhase('AUTH');
    setActiveTab('dashboard');
  };

  // 2. Candidate initiates Lobby Check-in
  const handleEnterLobby = () => {
    if (examData?.requireSecureBrowser && !isSEB) {
      setPhase('SEB_PREP');
    } else {
      setPhase('LOBBY');
    }
  };

  // 3. Lobby Status Polling (Every 1.5s while waiting for Admin Unlock)
  useEffect(() => {
    if (phase !== 'LOBBY' || !attemptId || !sessionToken) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/exam/lobby-status?attemptId=${encodeURIComponent(attemptId)}&token=${encodeURIComponent(sessionToken)}`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (isSubscribed && res.ok && data.status) {
          setLobbyStatus(data.status);
          setAttemptData(data);
          if (data.status === 'IN_EXAM') {
            loadExamSession(attemptId, sessionToken);
          }
        }
      } catch (e) {
        console.error('Lobby poll error:', e);
      }
    }, 1500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [phase, attemptId, sessionToken]);

  // 4. Candidate Starts Examination
  const handleStartExam = async () => {
    if (!attemptId || !sessionToken) return;
    setAuthLoading(true);
    try {
      const res = await fetch('/api/exam/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, token: sessionToken })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start examination session.');
      }
      await loadExamSession(attemptId, sessionToken);
    } catch (err: any) {
      setAuthError(err.message || 'Error starting exam.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Load active exam questions and session state
  const loadExamSession = async (attId: string, tok: string) => {
    try {
      const res = await fetch(
        `/api/exam/session?attemptId=${encodeURIComponent(attId)}&token=${encodeURIComponent(tok)}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (res.ok && data.exam && data.attempt) {
        setExamData(data.exam);
        setAttemptData(data.attempt);
        setAnswers(data.attempt.answers || {});
        setMarkedForReview(data.attempt.markedForReview || []);
        setRemainingSeconds(data.attempt.remainingSeconds || 0);
        setViolationCount(data.attempt.securityViolationsCount || 0);

        if (data.attempt.status === 'EXAM_LOCKED') {
          setPhase('EXAM_LOCKED');
          setLockReason(data.attempt.lockReason || 'Secure exam environment interrupted');
          setLockCount(data.attempt.lockCount || 1);
        } else if (data.attempt.status === 'SUBMITTED' || data.attempt.status === 'REVIEW_REQUIRED') {
          setPhase('SUBMITTED');
        } else {
          setPhase('EXAM');
        }
      } else {
        throw new Error(data.error || 'Could not retrieve exam session.');
      }
    } catch (e: any) {
      console.error('Load session error:', e);
      setAuthError(e.message || 'Failed to load exam session.');
    }
  };

  // Timer Countdown (1-second tick with server synchronization)
  useEffect(() => {
    if (phase !== 'EXAM') return;

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
  }, [phase]);

  // Periodic Server Time & Answers Sync (every 30 seconds)
  useEffect(() => {
    if (phase !== 'EXAM' || !attemptId || !sessionToken) return;

    const syncInterval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/exam/session?attemptId=${encodeURIComponent(attemptId)}&token=${encodeURIComponent(sessionToken)}`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (res.ok && data.attempt) {
          if (typeof data.attempt.remainingSeconds === 'number') {
            setRemainingSeconds(data.attempt.remainingSeconds);
          }
          if (data.attempt.status === 'EXAM_LOCKED') {
            setPhase('EXAM_LOCKED');
            setLockReason(data.attempt.lockReason || 'Proctor manual lock triggered');
            setLockCount(data.attempt.lockCount || 1);
          } else if (data.attempt.status === 'SUBMITTED' || data.attempt.status === 'REVIEW_REQUIRED') {
            setPhase('SUBMITTED');
          }
        }
      } catch (err) {
        console.error('Periodic session sync error:', err);
      }
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [phase, attemptId, sessionToken]);

  // Autosave answers debounced
  const saveAnswersToServer = useCallback(
    async (currentAnswers: Record<string, number>, currentReview: string[]) => {
      if (!attemptId || !sessionToken || phase !== 'EXAM') return;
      setSaveStatus('saving');
      try {
        const res = await fetch('/api/exam/save-answers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId,
            token: sessionToken,
            answers: currentAnswers,
            markedForReview: currentReview
          })
        });
        if (res.ok) {
          setSaveStatus('saved');
        } else {
          setSaveStatus('error');
        }
      } catch {
        setSaveStatus('error');
      }
    },
    [attemptId, sessionToken, phase]
  );

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    const updated = { ...answers, [questionId]: optionIndex };
    setAnswers(updated);
    saveAnswersToServer(updated, markedForReview);
  };

  const handleToggleReview = (questionId: string) => {
    let updated: string[];
    if (markedForReview.includes(questionId)) {
      updated = markedForReview.filter((id) => id !== questionId);
    } else {
      updated = [...markedForReview, questionId];
    }
    setMarkedForReview(updated);
    saveAnswersToServer(answers, updated);
  };

  // Security violation logger
  const logSecurityEvent = useCallback(
    async (eventType: string, severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'WARNING') => {
      if (!attemptId || !sessionToken || phase !== 'EXAM') return;
      try {
        const res = await fetch('/api/exam/security-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId,
            token: sessionToken,
            eventType,
            severity
          })
        });
        const data = await res.json();
        if (data.violationCount) {
          setViolationCount(data.violationCount);
        }
        if (data.status === 'EXAM_LOCKED') {
          setPhase('EXAM_LOCKED');
          setLockReason(data.lockReason || 'Anti-tamper violation limit reached');
          setLockCount(data.lockCount || 1);
        } else if (data.autoSubmitted) {
          setPhase('SUBMITTED');
        }
      } catch (err) {
        console.error('Security event log error:', err);
      }
    },
    [attemptId, sessionToken, phase]
  );

  // Anti-tamper & workstation lockdown listeners
  useEffect(() => {
    if (phase !== 'EXAM') return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setSecurityWarning('Security Alert: Exiting fullscreen mode is strictly recorded.');
        logSecurityEvent('FULLSCREEN_EXIT', 'WARNING');
      }
    };

    const handleBlur = () => {
      setSecurityWarning('Security Alert: Window focus lost. Switching windows/tabs is recorded.');
      logSecurityEvent('TAB_BLUR', 'WARNING');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Intercept devtools / refresh / exit keys
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'r' || e.key === 'u' || e.key === 'p')) ||
        e.key === 'F5'
      ) {
        e.preventDefault();
        setSecurityWarning(`Restricted key combination "${e.key}" intercepted.`);
        logSecurityEvent('UNAUTHORIZED_KEY', 'WARNING');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logSecurityEvent('COPY_ATTEMPT', 'INFO');
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [phase, logSecurityEvent]);

  // Invigilator Unlock Recovery
  const handleInvigilatorUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    if (!unlockPasswordInput.trim()) {
      setUnlockError('Please enter the invigilator unlock password.');
      return;
    }
    setUnlockLoading(true);
    try {
      const res = await fetch('/api/exam/recover-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          token: sessionToken,
          unlockPassword: unlockPasswordInput.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid invigilator recovery password.');
      }
      setUnlockPasswordInput('');
      await loadExamSession(attemptId!, sessionToken!);
    } catch (err: any) {
      setUnlockError(err.message || 'Failed to unlock exam.');
    } finally {
      setUnlockLoading(false);
    }
  };

  // Submit Exam
  const handleSubmitExam = async (reason: string = 'MANUAL') => {
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
          reason
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSubmissionReference(`SUB-${attemptId.slice(-8).toUpperCase()}`);
        setPhase('SUBMITTED');
        setIsSubmitModalOpen(false);
      } else {
        alert(data.error || 'Failed to submit examination.');
      }
    } catch (e) {
      alert('Network error while submitting examination. Please notify your proctor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = (reason: string) => {
    handleSubmitExam(reason);
  };

  // Format countdown mm:ss
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ==========================================
  // UNPUBLISHED / MAINTENANCE SCREEN
  // ==========================================
  if (!statusLoading && portalPublished === false) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl">
            🔒
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mb-2">
            Examination Gateway Offline
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            The assessment portal is currently closed or in pre-exam maintenance. Candidate authentication will open when scheduled testing windows are activated by the examination administration.
          </p>
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-2 text-left mb-6">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Platform:</span>
              <span className="text-slate-200 font-semibold">AWS SBG CU-UP Secure Engine</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Gateway Status:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300">
                ● Inactive Window
              </span>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-colors border border-slate-700"
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 1. ENTERPRISE SPLIT-SCREEN LOGIN PAGE (PEARSON / MICROSOFT STYLE)
  // ==========================================
  if (phase === 'AUTH') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-[#FF9900]/30">
        {/* Top Operational Header */}
        <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF9900] to-amber-600 flex items-center justify-center font-bold text-slate-950 text-sm shadow-md shadow-orange-500/20 ring-1 ring-white/20">
              AWS
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
                AWS Student Builder Group
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Chandigarh University – Uttar Pradesh
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Secure Gateway Operational
            </span>
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="text-xs text-slate-300 hover:text-[#FF9900] transition-colors flex items-center gap-1 font-medium px-2 py-1 rounded-md hover:bg-slate-900 border border-transparent hover:border-slate-800"
            >
              <span>Need Help?</span>
            </button>
          </div>
        </header>

        {/* Split Screen Hero Layout */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
          <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Platform Branding & Trust Pillars */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-[#FF9900] border border-orange-500/20">
                <span>🛡️ Enterprise Assessment Platform</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Secure Examination &amp; Evaluation Platform
                </h1>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Professional assessments. Secure delivery. Authoritative evaluation for university certification candidates.
                </p>
              </div>

              {/* Security Feature Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-3">
                  <div className="text-xl">🔐</div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Encrypted Credentials</div>
                    <div className="text-[11px] text-slate-400">Automated cryptographically secure candidate tokens.</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-3">
                  <div className="text-xl">🖥️</div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Safe Exam Browser</div>
                    <div className="text-[11px] text-slate-400">Lockdown environment support with anti-tamper controls.</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-3">
                  <div className="text-xl">⏱️</div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Server-Authoritative Timer</div>
                    <div className="text-[11px] text-slate-400">Tamper-proof real-time clock synchronization.</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-3">
                  <div className="text-xl">✉️</div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Scorecard Privacy</div>
                    <div className="text-[11px] text-slate-400">Evaluations delivered exclusively to candidate emails.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Clean Enterprise Sign In Card */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
                {/* Header within Card */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white tracking-tight">Candidate Sign In</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Sign in with the credentials provided by the examination administrator.
                  </p>
                </div>

                {authError && (
                  <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed flex items-start gap-2.5">
                    <span className="text-base leading-none">⚠️</span>
                    <span className="flex-1">{authError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* User ID: Registered University Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="candidate-email">
                      University Email <span className="text-slate-400 font-normal">(User ID)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="candidate-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.name@cumail.in"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] text-sm text-white placeholder-slate-500 transition-colors outline-none"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-300" htmlFor="candidate-password">
                        Exam Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="candidate-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your exam password"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] text-sm text-white placeholder-slate-500 transition-colors outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF9900] to-amber-600 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-bold text-sm shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {authLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to Candidate Portal</span>
                        <span>&rarr;</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Footer Links in Login Card */}
                <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsHelpModalOpen(true)}
                    className="text-slate-400 hover:text-[#FF9900] transition-colors"
                  >
                    Forgot your credentials?
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono">
                    SEB Compliant
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Global Professional Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-4 text-center text-xs text-slate-400">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              &copy; {new Date().getFullYear()} AWS Student Builder Group at Chandigarh University – Uttar Pradesh.
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <button onClick={() => setIsHelpModalOpen(true)} className="hover:text-slate-300">
                Exam Instructions
              </button>
              <span>•</span>
              <button onClick={() => setIsHelpModalOpen(true)} className="hover:text-slate-300">
                Invigilator Support
              </button>
            </div>
          </div>
        </footer>

        {/* Help & Forgot Credentials Modal */}
        {isHelpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <span>ℹ️</span>
                  <span>Candidate Access &amp; Support</span>
                </div>
                <button
                  onClick={() => setIsHelpModalOpen(false)}
                  className="text-slate-400 hover:text-white text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <p>
                  <strong>How to obtain credentials:</strong> Candidate accounts are automatically created upon approved registration for certification assessments. Your User ID is your registered university email, and your secure password is sent via email.
                </p>
                <p>
                  <strong>Lost Credentials:</strong> If you did not receive your credentials email or need a password reset, please contact your examination administrator or invigilator desk.
                </p>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-200">Invigilator Contact Desk:</div>
                  <div className="text-slate-400 font-mono">Email: notifications@awssbgcuup.tech</div>
                  <div className="text-slate-400 font-mono">Location: AWS Cloud Lab &amp; Assessment Hall</div>
                </div>
              </div>

              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium text-xs transition-colors"
              >
                Close Support Desk
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 2. CANDIDATE DASHBOARD (CISCO / PEARSON IA)
  // ==========================================
  if (phase === 'DASHBOARD') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Top Header */}
        <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF9900] to-amber-600 flex items-center justify-center font-bold text-slate-950 text-sm shadow-md">
              AWS
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Candidate Assessment Portal
              </div>
              <div className="text-[10px] text-slate-400">
                AWS SBG at Chandigarh University – Uttar Pradesh
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">{studentName || 'Candidate'}</span>
              <span className="text-[10px] text-slate-400 font-mono">{rollNumber || email}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 border border-slate-700 text-xs font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Dashboard Layout: Sidebar + Main Content */}
        <div className="flex-1 flex flex-col md:flex-row">
          {/* Sidebar */}
          <aside className="w-full md:w-64 bg-slate-900/70 border-r border-slate-800/80 p-4 space-y-6 shrink-0">
            {/* Candidate Identity Snippet */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Candidate Profile</div>
              <div className="text-sm font-bold text-white truncate">{studentName || 'Candidate'}</div>
              <div className="text-xs text-slate-400 truncate">{email}</div>
              {rollNumber && (
                <div className="text-[11px] font-mono text-[#FF9900] pt-1">ID: {rollNumber}</div>
              )}
            </div>

            {/* Sidebar Navigation */}
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>🏠</span>
                <span>Dashboard Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('my-exam')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  activeTab === 'my-exam'
                    ? 'bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>📋</span>
                <span>My Examination</span>
              </button>

              <button
                onClick={() => setActiveTab('schedule')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  activeTab === 'schedule'
                    ? 'bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>📅</span>
                <span>Schedule &amp; Timing</span>
              </button>

              <button
                onClick={() => setActiveTab('instructions')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  activeTab === 'instructions'
                    ? 'bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>📖</span>
                <span>Exam Instructions</span>
              </button>

              <button
                onClick={() => setActiveTab('security-seb')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  activeTab === 'security-seb'
                    ? 'bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>🔐</span>
                <span>Security &amp; SEB</span>
              </button>

              <button
                onClick={() => setActiveTab('help-support')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  activeTab === 'help-support'
                    ? 'bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>❓</span>
                <span>Help &amp; Support</span>
              </button>
            </nav>
          </aside>

          {/* Main Dashboard Panel */}
          <main className="flex-1 p-6 lg:p-8 space-y-6">
            {/* Tab: Dashboard Overview */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 max-w-4xl">
                {/* Welcome Banner */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
                  <div className="relative z-10 space-y-2">
                    <div className="text-xs uppercase font-bold tracking-wider text-[#FF9900]">
                      Active Candidate Workspace
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                      Welcome, {studentName || 'Candidate'}
                    </h2>
                    <p className="text-sm text-slate-400 max-w-2xl">
                      You are authenticated for the <strong>{examData?.title || 'AWS Certification Assessment'}</strong>. Review the examination prerequisites below before proceeding to the proctored check-in lobby.
                    </p>
                  </div>
                </div>

                {/* Primary Examination Card */}
                <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <div className="text-xs font-semibold text-slate-400">ASSIGNED EXAMINATION</div>
                      <div className="text-lg font-bold text-white mt-0.5">{examData?.title}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">Code: {examData?.examCode || 'AWS-EXAM'}</div>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 self-start sm:self-auto">
                      ● READY FOR LOBBY
                    </span>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div className="text-[11px] text-slate-400 font-medium">Duration</div>
                      <div className="text-base font-bold text-white mt-1">{examData?.durationMinutes} Mins</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div className="text-[11px] text-slate-400 font-medium">Total Questions</div>
                      <div className="text-base font-bold text-white mt-1">{examData?.questionsCount || 'Configured'}</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div className="text-[11px] text-slate-400 font-medium">Passing Score</div>
                      <div className="text-base font-bold text-white mt-1">{examData?.passingPercentage}%</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div className="text-[11px] text-slate-400 font-medium">Environment</div>
                      <div className="text-base font-bold text-amber-400 mt-1">
                        {examData?.requireSecureBrowser ? 'SEB Required' : 'Standard Secure'}
                      </div>
                    </div>
                  </div>

                  {/* Action Banner to Enter Lobby */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-slate-900 border border-orange-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="text-sm font-bold text-white">Ready to proceed with your assessment?</div>
                      <div className="text-xs text-slate-400">
                        Entering the proctor lobby verifies your environment and alerts your examination administrator.
                      </div>
                    </div>
                    <button
                      onClick={handleEnterLobby}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF9900] to-amber-600 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-extrabold text-sm shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 shrink-0"
                    >
                      <span>Enter Exam Lobby</span>
                      <span>&rarr;</span>
                    </button>
                  </div>
                </div>

                {/* Pre-Exam Checklist */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Candidate Checklist</div>
                  <div className="space-y-2 text-xs text-slate-400">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-emerald-400">✓</span>
                      <span>Identity registered and authorized by university examination controller.</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-emerald-400">✓</span>
                      <span>Stable internet connection and uninterrupted workstation environment.</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-emerald-400">✓</span>
                      <span>No secondary displays, unauthorized browsers, or screen-recording software.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: My Exam */}
            {activeTab === 'my-exam' && (
              <div className="space-y-6 max-w-4xl">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <h3 className="text-lg font-bold text-white">Examination Details &amp; Syllabus</h3>
                  <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                    <p>
                      <strong>Assessment Title:</strong> {examData?.title}
                    </p>
                    <p>
                      <strong>Code / Category:</strong> {examData?.examCode} • {examData?.category}
                    </p>
                    <p>
                      <strong>Duration:</strong> {examData?.durationMinutes} Minutes (Authoritative Server Timer)
                    </p>
                    <p>
                      <strong>Evaluation &amp; Scorecard:</strong> Scored strictly on the server upon submission. Results are communicated directly via email in accordance with university assessment policies.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Schedule */}
            {activeTab === 'schedule' && (
              <div className="space-y-6 max-w-4xl">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <h3 className="text-lg font-bold text-white">Assessment Schedule &amp; Window</h3>
                  <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                    <p>
                      Candidates must check in to the lobby prior to exam start. Once unlocked by an administrator, the timer begins when you click "Start Examination".
                    </p>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono text-slate-300">
                      <div>Allocated Time: {examData?.durationMinutes} Minutes</div>
                      <div>Attempts Permitted: 1 Proctored Session</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Exam Instructions */}
            {activeTab === 'instructions' && (
              <div className="space-y-6 max-w-4xl">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <h3 className="text-lg font-bold text-white">Examination Code of Conduct</h3>
                  <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                    <ul className="list-disc pl-5 space-y-2 text-slate-300">
                      <li>Maintain fullscreen mode throughout the duration of the examination.</li>
                      <li>Switching tabs, navigating away, or minimizing the exam window will log a security violation.</li>
                      <li>Exceeding the maximum allowed security violations ({examData?.maxSecurityViolations || 3}) will result in automatic session lockout or forced submission.</li>
                      <li>Developer tools, right-click context menus, and copy/paste shortcuts are strictly disabled.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Security & SEB */}
            {activeTab === 'security-seb' && (
              <div className="space-y-6 max-w-4xl">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <h3 className="text-lg font-bold text-white">Safe Exam Browser (SEB) Configuration</h3>
                  <p className="text-xs text-slate-400">
                    If required for your assessment, you can download the direct configuration file (.seb) configured specifically for this examination.
                  </p>
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Official .seb Configuration</div>
                      <div className="text-[11px] text-slate-400 font-mono">AWS-SBG-{examData?.examCode || 'EXAM'}.seb</div>
                    </div>
                    <a
                      href={`/api/exam/seb-config?examId=${encodeURIComponent(examData?.id || examId)}`}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors border border-slate-700"
                    >
                      📥 Download .seb File
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Help & Support */}
            {activeTab === 'help-support' && (
              <div className="space-y-6 max-w-4xl">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <h3 className="text-lg font-bold text-white">Invigilator &amp; Technical Support</h3>
                  <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                    <p>
                      If you experience any connectivity interruption, hardware failure, or lockdown during the exam, notify your proctor immediately.
                    </p>
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono space-y-1">
                      <div>Proctor Desk: notifications@awssbgcuup.tech</div>
                      <div>Assessment Support Center • Chandigarh University – Uttar Pradesh</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. SEB PREPARATION OVERLAY / DOWNLOAD STEP
  // ==========================================
  if (phase === 'SEB_PREP') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl">
            🔐
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Preparing Secure Environment</h2>
            <p className="text-xs text-slate-400">
              Safe Exam Browser (SEB) is required for this examination.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 text-xs text-left space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <span>✓</span>
              <span>Candidate identity verified</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <span>✓</span>
              <span>Examination registration confirmed</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <span>✓</span>
              <span>Secure configuration generated</span>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href={`/api/exam/seb-config?examId=${encodeURIComponent(examData?.id || examId)}`}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF9900] to-amber-600 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-bold text-sm shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>📥 Download Secure Configuration (.seb)</span>
            </a>
            <p className="text-[11px] text-slate-400">
              Open the downloaded <strong>.seb</strong> file to launch your examination inside Safe Exam Browser.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <button
              onClick={() => setPhase('DASHBOARD')}
              className="text-slate-400 hover:text-slate-200"
            >
              &larr; Back to Dashboard
            </button>
            <button
              onClick={() => setPhase('LOBBY')}
              className="text-[#FF9900] hover:underline font-medium"
            >
              Already in SEB? Continue &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 4. PROCTORED EXAM LOBBY & LIVE UNLOCK
  // ==========================================
  if (phase === 'LOBBY') {
    const isUnlocked = lobbyStatus === 'UNLOCKED';

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-lg w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FF9900]/10 border border-[#FF9900]/30 flex items-center justify-center text-3xl">
              {isUnlocked ? '🚀' : '⏳'}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isUnlocked ? 'Examination Access Granted' : 'Examination Check-in &amp; Verification'}
            </h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {isUnlocked
                ? 'Your proctor has unlocked your session. You may now launch your examination.'
                : 'Your workstation is checked in. Proctors will verify your identity before unlocking your assessment.'}
            </p>
          </div>

          {/* Candidate Check-in Verification Box */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Candidate:</span>
              <span className="font-bold text-slate-200">{studentName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">University Email:</span>
              <span className="font-mono text-slate-200">{email}</span>
            </div>
            {rollNumber && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Candidate ID:</span>
                <span className="font-mono text-[#FF9900]">{rollNumber}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Assessment:</span>
              <span className="font-semibold text-slate-200">{examData?.title || 'AWS Certification'}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span className="text-slate-400">Proctor Status:</span>
              {isUnlocked ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  UNLOCKED &amp; READY
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Waiting for Admin Unlock...
                </span>
              )}
            </div>
          </div>

          {/* Action Trigger */}
          {isUnlocked ? (
            <button
              onClick={handleStartExam}
              disabled={authLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              {authLoading ? 'Launching Examination...' : '🚀 Start Examination Now'}
            </button>
          ) : (
            <div className="p-3 bg-slate-950/60 rounded-xl text-center text-xs text-slate-400">
              Session is actively polling the proctor desk. Please remain on this screen.
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => setPhase('DASHBOARD')}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              &larr; Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 5. SECURE FULLSCREEN EXAM WORKSPACE
  // ==========================================
  if (phase === 'EXAM') {
    const questions = examData?.questions || [];
    const currentQ = questions[currentQIndex];
    const totalQ = questions.length;
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
        {/* Security Warning Banner */}
        {securityWarning && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold text-center flex items-center justify-between">
            <span>⚠️ {securityWarning}</span>
            <button onClick={() => setSecurityWarning(null)} className="text-slate-950 font-bold ml-2">
              &times;
            </button>
          </div>
        )}

        {/* Top Distraction-Free Header */}
        <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF9900] flex items-center justify-center font-bold text-slate-950 text-xs">
              AWS
            </div>
            <div>
              <div className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">{examData?.title}</div>
              <div className="text-[10px] text-slate-400 font-mono">Candidate: {studentName} ({rollNumber || email})</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Server Timer */}
            <div
              className={`px-3.5 py-1.5 rounded-xl font-mono text-sm font-extrabold flex items-center gap-1.5 border shadow-inner ${
                remainingSeconds < 300
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse'
                  : 'bg-slate-950 text-slate-200 border-slate-800'
              }`}
            >
              <span>⏱️</span>
              <span>{formatTime(remainingSeconds)}</span>
            </div>

            {/* Autosave Indicator */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
              {saveStatus === 'saving' && <span className="text-amber-400">● Saving...</span>}
              {saveStatus === 'saved' && <span className="text-emerald-400">✓ Autosaved</span>}
              {saveStatus === 'error' && <span className="text-rose-400">⚠️ Sync Error</span>}
            </div>

            {/* Finish & Submit Button */}
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all"
            >
              Finish &amp; Submit
            </button>
          </div>
        </header>

        {/* Main Exam Runner Body */}
        <div className="flex-1 flex flex-col lg:flex-row p-4 lg:p-6 gap-6 max-w-7xl mx-auto w-full">
          {/* Question Workspace */}
          <main className="flex-1 space-y-6">
            {currentQ ? (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-slate-800 text-white text-xs font-bold">
                      Question {currentQIndex + 1} of {totalQ}
                    </span>
                    <span className="text-xs text-slate-400">({currentQ.marks || 1} Marks)</span>
                  </div>

                  <button
                    onClick={() => handleToggleReview(currentQ.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      markedForReview.includes(currentQ.id)
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    <span>★</span>
                    <span>{markedForReview.includes(currentQ.id) ? 'Marked for Review' : 'Mark for Review'}</span>
                  </button>
                </div>

                {/* Question Text */}
                <div className="text-base sm:text-lg font-medium text-white leading-relaxed">
                  {currentQ.question}
                </div>

                {/* Question Options */}
                <div className="space-y-3 pt-2">
                  {(currentQ.options || []).map((opt: string, oIdx: number) => {
                    const isSelected = answers[currentQ.id] === oIdx;
                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleSelectOption(currentQ.id, oIdx)}
                        className={`w-full text-left p-4 rounded-xl text-sm font-medium transition-all flex items-start gap-3 border ${
                          isSelected
                            ? 'bg-[#FF9900]/15 border-[#FF9900] text-white ring-1 ring-[#FF9900]/30 shadow-md shadow-orange-500/10'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 border ${
                            isSelected
                              ? 'bg-[#FF9900] text-slate-950 border-[#FF9900]'
                              : 'border-slate-600 text-slate-400'
                          }`}
                        >
                          {String.fromCharCode(65 + oIdx)}
                        </div>
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Next / Prev Navigation Controls */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <button
                    disabled={currentQIndex === 0}
                    onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-bold text-white transition-colors border border-slate-700"
                  >
                    &larr; Previous Question
                  </button>

                  <button
                    disabled={currentQIndex === totalQ - 1}
                    onClick={() => setCurrentQIndex((prev) => Math.min(totalQ - 1, prev + 1))}
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-bold text-white transition-colors border border-slate-700"
                  >
                    Next Question &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">No questions loaded.</div>
            )}
          </main>

          {/* Question Palette Sidebar */}
          <aside className="w-full lg:w-72 space-y-4 shrink-0">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Question Palette</div>

              {/* Status Summary Pill */}
              <div className="grid grid-cols-3 gap-2 text-[10px] font-medium text-center">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <div className="font-bold text-sm">{answeredCount}</div>
                  <div>Answered</div>
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300">
                  <div className="font-bold text-sm">{markedForReview.length}</div>
                  <div>Review</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400">
                  <div className="font-bold text-sm">{Math.max(0, totalQ - answeredCount)}</div>
                  <div>Left</div>
                </div>
              </div>

              {/* Grid Palette */}
              <div className="grid grid-cols-5 gap-2 pt-2">
                {questions.map((q: any, qIdx: number) => {
                  const isCurrent = currentQIndex === qIdx;
                  const isAnswered = answers[q.id] !== undefined;
                  const isMarked = markedForReview.includes(q.id);

                  let btnBg = 'bg-slate-950 text-slate-400 border-slate-800';
                  if (isCurrent) {
                    btnBg = 'bg-[#FF9900] text-slate-950 border-[#FF9900] font-black ring-2 ring-[#FF9900]/40';
                  } else if (isMarked) {
                    btnBg = 'bg-purple-600 text-white border-purple-500';
                  } else if (isAnswered) {
                    btnBg = 'bg-emerald-600 text-white border-emerald-500';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQIndex(qIdx)}
                      className={`h-9 rounded-lg text-xs font-bold transition-all border ${btnBg}`}
                    >
                      {qIdx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-600" />
                  <span>Marked for Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-950 border border-slate-800" />
                  <span>Unanswered</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Submit Confirmation Modal */}
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl">
                  ✓
                </div>
                <h3 className="text-lg font-bold text-white">Confirm Submission</h3>
                <p className="text-xs text-slate-400">
                  Are you sure you want to finish and submit your assessment? Once submitted, your responses cannot be modified.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Answered Questions:</span>
                  <span className="font-bold text-emerald-400">{answeredCount} of {totalQ}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Marked for Review:</span>
                  <span className="font-bold text-purple-400">{markedForReview.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Time Remaining:</span>
                  <span className="font-mono text-slate-200">{formatTime(remainingSeconds)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                >
                  Continue Testing
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmitExam('MANUAL')}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20"
                >
                  {submitting ? 'Submitting...' : 'Yes, Submit Exam'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 6. INTERRUPTED / WORKSTATION LOCKED RECOVERY SCREEN
  // ==========================================
  if (phase === 'EXAM_LOCKED') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900/90 border border-rose-500/30 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-3xl">
            🔒
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white tracking-tight">Examination Workstation Locked</h2>
            <p className="text-xs text-slate-400">
              Your examination session has been suspended by the security controller or administrator.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-left space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Candidate:</span>
              <span className="font-bold text-slate-200">{studentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Lock Reason:</span>
              <span className="font-mono text-rose-400">{lockReason || 'Security Policy Trigger'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Lock Counter:</span>
              <span className="text-slate-300 font-bold">{lockCount}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Candidate Timer:</span>
              <span className="text-emerald-400 font-bold">PAUSED (No time lost)</span>
            </div>
          </div>

          {unlockError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {unlockError}
            </div>
          )}

          <form onSubmit={handleInvigilatorUnlock} className="space-y-3 text-left">
            <label className="block text-xs font-semibold text-slate-300">
              Invigilator Authorization Code
            </label>
            <input
              type="password"
              required
              value={unlockPasswordInput}
              onChange={(e) => setUnlockPasswordInput(e.target.value)}
              placeholder="Enter proctor unlock password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono placeholder-slate-500 outline-none focus:border-[#FF9900]"
            />
            <button
              type="submit"
              disabled={unlockLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-sm shadow-md"
            >
              {unlockLoading ? 'Verifying...' : 'Unlock Candidate Workstation'}
            </button>
          </form>

          <p className="text-[11px] text-slate-400">
            Please alert the room proctor to inspect your workstation and enter the unlock authorization key.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // 7. POST-SUBMISSION CONFIRMATION (STRICT SCORE PRIVACY)
  // ==========================================
  if (phase === 'SUBMITTED') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl">
            🛡️
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white tracking-tight">Examination Submitted</h2>
            <p className="text-xs text-slate-400">
              Your responses have been securely encrypted and stored on the authoritative server.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs text-left">
            <div className="flex justify-between">
              <span className="text-slate-400">Candidate:</span>
              <span className="font-bold text-slate-200">{studentName || 'Candidate'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">University Email:</span>
              <span className="font-mono text-slate-200">{email}</span>
            </div>
            {rollNumber && (
              <div className="flex justify-between">
                <span className="text-slate-400">Candidate ID:</span>
                <span className="font-mono text-[#FF9900]">{rollNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Assessment:</span>
              <span className="font-semibold text-slate-200">{examData?.title || 'AWS Certification'}</span>
            </div>
            {submissionReference && (
              <div className="flex justify-between pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Reference Token:</span>
                <span className="font-mono text-slate-200 font-bold">{submissionReference}</span>
              </div>
            )}
          </div>

          <div className="p-3.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-xs text-[#FF9900] text-center font-medium">
            ✉️ Your assessment scorecard and evaluation will be communicated exclusively to your registered university email address.
          </div>

          <button
            onClick={() => {
              handleSignOut();
              window.location.href = '/';
            }}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors border border-slate-700"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function ExamPortalPage({ initialExamId }: ExamPortalPageProps = {}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm font-sans">
          Loading Examination Portal...
        </div>
      }
    >
      <ExamPortalContent initialExamId={initialExamId} />
    </Suspense>
  );
}
