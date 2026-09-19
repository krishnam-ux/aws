'use client';

import { useState, useEffect, useRef } from 'react';
import {
  WeeklyQuiz,
  WeeklyQuizAttempt,
  WeeklyQuizSecurityEvent,
  WeeklyQuizProctoringConfig
} from '@/types/weeklyQuiz';

interface AdminWeeklyQuizProctoringProps {
  token: string;
}

export default function AdminWeeklyQuizProctoring({ token }: AdminWeeklyQuizProctoringProps) {
  // Navigation Subtabs
  const [subTab, setSubTab] = useState<'live-proctoring' | 'quizzes-editor' | 'settings'>('live-proctoring');

  // Live Data State
  const [metrics, setMetrics] = useState({
    totalCandidates: 0,
    waiting: 0,
    inProgress: 0,
    submitted: 0,
    cameraIssues: 0,
    screenIssues: 0,
    securityAlerts: 0
  });
  const [quizzes, setQuizzes] = useState<WeeklyQuiz[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [settings, setSettings] = useState<WeeklyQuizProctoringConfig>({
    requireWebcam: true,
    requireMicrophone: true,
    requireScreenShare: true,
    requireFaceDetection: true,
    detectMultipleFaces: true,
    requireFullscreen: true,
    monitorFocus: true,
    noFaceThresholdSeconds: 6,
    multipleFacesThresholdSeconds: 4,
    cameraGracePeriodSeconds: 30,
    screenGracePeriodSeconds: 20,
    fullscreenGracePeriodSeconds: 15,
    maxViolationsAllowed: 1
  });

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedQuizId, setSelectedQuizId] = useState<string>('All');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [isLiveViewOpen, setIsLiveViewOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [customWarningText, setCustomWarningText] = useState('');
  const [timelineEvents, setTimelineEvents] = useState<WeeklyQuizSecurityEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Live WebRTC Video Refs in Admin Modal
  const adminCameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const adminScreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const adminCameraPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const adminScreenPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [cameraStreamActive, setCameraStreamActive] = useState(false);
  const [screenStreamActive, setScreenStreamActive] = useState(false);
  const [remoteCameraPreviewFrame, setRemoteCameraPreviewFrame] = useState<string | null>(null);
  const [remoteScreenPreviewFrame, setRemoteScreenPreviewFrame] = useState<string | null>(null);

  const [events, setEvents] = useState<any[]>([]);
  const [eligibilityMetrics, setEligibilityMetrics] = useState<any | null>(null);

  // Quiz Editor State
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

  // Fetch Dashboard Data
  const fetchDashboardData = async () => {
    try {
      const qParam = selectedQuizId && selectedQuizId !== 'All' ? `?quizId=${encodeURIComponent(selectedQuizId)}` : '';
      const res = await fetch(`/api/admin/weekly-quiz${qParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
        setQuizzes(data.quizzes || []);
        setAttempts(data.attempts || []);
        if (data.events) setEvents(data.events || []);
        if (data.eligibilityMetrics) setEligibilityMetrics(data.eligibilityMetrics);
        if (data.settings) setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to fetch proctoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh every 3.5 seconds
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3500);
    return () => clearInterval(interval);
  }, [token, selectedQuizId]);

  // Handle Admin Action (Pause, Resume, Lock, Extend, Force Submit, Send Warning)
  const handleAdminAction = async (action: string, attemptId: string, extra: Record<string, any> = {}) => {
    setActionMessage(null);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/weekly-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          attemptId,
          ...extra
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Action failed.');
      }

      setActionMessage(`Action "${action}" completed successfully.`);
      setTimeout(() => setActionMessage(null), 3000);
      await fetchDashboardData();

      if (selectedCandidate && (selectedCandidate.id === attemptId || selectedCandidate.attemptId === attemptId)) {
        openLiveView(selectedCandidate);
      }
    } catch (err: any) {
      setActionError(err.message || 'Action failed.');
      setTimeout(() => setActionError(null), 4000);
    }
  };

  // Open "View Live" Modal with Dual Stream Support
  const openLiveView = async (cand: any) => {
    setSelectedCandidate(cand);
    setIsLiveViewOpen(true);
    setCameraStreamActive(false);
    setScreenStreamActive(false);
    setRemoteCameraPreviewFrame(cand.cameraPreviewFrame || cand.previewFrame || null);
    setRemoteScreenPreviewFrame(cand.screenPreviewFrame || null);

    try {
      const res = await fetch(`/api/admin/weekly-quiz/webrtc?attemptId=${encodeURIComponent(cand.id || cand.attemptId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        if (data.cameraPreviewFrame || data.previewFrame) {
          setRemoteCameraPreviewFrame(data.cameraPreviewFrame || data.previewFrame);
        }
        if (data.screenPreviewFrame) {
          setRemoteScreenPreviewFrame(data.screenPreviewFrame);
        }

        // Camera WebRTC Stream
        if (data.cameraOffer || data.offer) {
          const camPc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
          });
          adminCameraPeerConnectionRef.current = camPc;

          camPc.ontrack = event => {
            if (adminCameraVideoRef.current && event.streams[0]) {
              adminCameraVideoRef.current.srcObject = event.streams[0];
              adminCameraVideoRef.current.play().catch(() => {});
              setCameraStreamActive(true);
            }
          };

          camPc.onicecandidate = async event => {
            if (event.candidate) {
              await fetch('/api/admin/weekly-quiz/webrtc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  attemptId: cand.id || cand.attemptId,
                  cameraIceCandidate: event.candidate
                })
              });
            }
          };

          await camPc.setRemoteDescription(new RTCSessionDescription(data.cameraOffer || data.offer));
          const camAnswer = await camPc.createAnswer();
          await camPc.setLocalDescription(camAnswer);

          await fetch('/api/admin/weekly-quiz/webrtc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              attemptId: cand.id || cand.attemptId,
              cameraAnswer: camPc.localDescription
            })
          });
        }

        // Screen Share WebRTC Stream
        if (data.screenOffer) {
          const scrPc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
          });
          adminScreenPeerConnectionRef.current = scrPc;

          scrPc.ontrack = event => {
            if (adminScreenVideoRef.current && event.streams[0]) {
              adminScreenVideoRef.current.srcObject = event.streams[0];
              adminScreenVideoRef.current.play().catch(() => {});
              setScreenStreamActive(true);
            }
          };

          scrPc.onicecandidate = async event => {
            if (event.candidate) {
              await fetch('/api/admin/weekly-quiz/webrtc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  attemptId: cand.id || cand.attemptId,
                  screenIceCandidate: event.candidate
                })
              });
            }
          };

          await scrPc.setRemoteDescription(new RTCSessionDescription(data.screenOffer));
          const scrAnswer = await scrPc.createAnswer();
          await scrPc.setLocalDescription(scrAnswer);

          await fetch('/api/admin/weekly-quiz/webrtc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              attemptId: cand.id || cand.attemptId,
              screenAnswer: scrPc.localDescription
            })
          });
        }
      }
    } catch (err) {
      console.error('Failed to connect to candidate live stream:', err);
    }
  };

  // Close Live View
  const closeLiveView = () => {
    if (adminCameraPeerConnectionRef.current) {
      adminCameraPeerConnectionRef.current.close();
      adminCameraPeerConnectionRef.current = null;
    }
    if (adminScreenPeerConnectionRef.current) {
      adminScreenPeerConnectionRef.current.close();
      adminScreenPeerConnectionRef.current = null;
    }
    setIsLiveViewOpen(false);
    setSelectedCandidate(null);
    setCameraStreamActive(false);
    setScreenStreamActive(false);
  };

  // Open Timeline Modal
  const openTimelineView = async (cand: any) => {
    setSelectedCandidate(cand);
    setIsTimelineOpen(true);
    setTimelineLoading(true);
    try {
      const res = await fetch(`/api/admin/weekly-quiz?action=get-timeline&attemptId=${encodeURIComponent(cand.id || cand.attemptId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTimelineEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to load timeline events:', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  // Open Report Modal
  const openReportView = (cand: any) => {
    setSelectedCandidate(cand);
    setIsReportOpen(true);
  };

  // Save Proctoring Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAdminAction('update-settings', 'GLOBAL', { settings });
  };

  // Filter and Search Logic
  const filteredAttempts = attempts.filter(cand => {
    if (selectedQuizId !== 'All' && cand.quizId !== selectedQuizId) return false;

    if (statusFilter === 'IN_PROGRESS' && cand.status !== 'IN_PROGRESS') return false;
    if (statusFilter === 'WAITING' && cand.status !== 'WAITING' && cand.status !== 'LOCKED') return false;
    if (statusFilter === 'PAUSED' && cand.status !== 'PAUSED') return false;
    if (statusFilter === 'SUBMITTED' && cand.status !== 'SUBMITTED' && cand.status !== 'REVIEW_REQUIRED') return false;
    if (statusFilter === 'VIOLATIONS' && (cand.violationCount || 0) === 0) return false;
    if (statusFilter === 'SCREEN_OFFLINE' && cand.screenStatus !== 'DISCONNECTED' && cand.screenStatus !== 'ERROR') return false;
    if (statusFilter === 'CAMERA_OFFLINE' && cand.cameraStatus !== 'DISCONNECTED' && cand.cameraStatus !== 'ERROR') return false;
    if (statusFilter === 'REVIEW_REQUIRED' && cand.integrityRating !== 'ATTENTION' && cand.integrityRating !== 'REVIEW_REQUIRED' && (cand.violationCount || 0) < 1) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = cand.studentName?.toLowerCase().includes(q);
      const matchEmail = cand.email?.toLowerCase().includes(q);
      const matchRoll = cand.rollNumber?.toLowerCase().includes(q);
      const matchQuiz = cand.quizTitle?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchRoll && !matchQuiz) return false;
    }

    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredAttempts.length / pageSize) || 1;
  const paginatedAttempts = filteredAttempts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatTimeDisplay = (sec: number, durationMins: number) => {
    if (sec === undefined || sec === null || sec < 0) return `${durationMins || 20}:00`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30 uppercase tracking-wider">
                Multi-Candidate Live Proctoring
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                200-Candidate Scaled Hub
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-[#111827] mt-1">Weekly Session Assessment Invigilation</h2>
            <p className="text-xs text-[#64748B]">
              Real-time dual telemetry (Webcam &amp; Screen Share), server-authoritative timer, and 2-violation automatic submission.
            </p>
          </div>

          {/* Subtab Navigation */}
          <div className="flex items-center gap-1 bg-[#F6F8FA] p-1 rounded-lg border border-[#E2E8F0]">
            <button
              onClick={() => setSubTab('live-proctoring')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                subTab === 'live-proctoring'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              Live Proctoring Hub ({filteredAttempts.length})
            </button>
            <button
              onClick={() => setSubTab('quizzes-editor')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                subTab === 'quizzes-editor'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              Quiz Bank &amp; Manager
            </button>
            <button
              onClick={() => setSubTab('settings')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                subTab === 'settings'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              Proctoring Settings
            </button>
          </div>
        </div>

        {/* Action Alerts */}
        {actionMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-bold flex items-center gap-2">
            <span>✓</span>
            <span>{actionMessage}</span>
          </div>
        )}
        {actionError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>{actionError}</span>
          </div>
        )}

        {/* 6 Top Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div className="p-4 rounded-xl bg-[#F6F8FA] border border-[#E2E8F0]">
            <div className="text-[10px] uppercase font-bold text-[#64748B]">Total Candidates</div>
            <div className="text-2xl font-extrabold text-[#111827] mt-1 font-mono">{metrics.totalCandidates}</div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80">
            <div className="text-[10px] uppercase font-bold text-blue-700">In Progress</div>
            <div className="text-2xl font-extrabold text-blue-600 mt-1 font-mono">{metrics.inProgress}</div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
            <div className="text-[10px] uppercase font-bold text-emerald-700">Submitted</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">{metrics.submitted}</div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/80">
            <div className="text-[10px] uppercase font-bold text-rose-700">Camera Offline</div>
            <div className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{metrics.cameraIssues}</div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80">
            <div className="text-[10px] uppercase font-bold text-indigo-700">Screen Offline</div>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1 font-mono">{metrics.screenIssues || 0}</div>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80">
            <div className="text-[10px] uppercase font-bold text-purple-700">Security Alerts</div>
            <div className="text-2xl font-extrabold text-purple-600 mt-1 font-mono">{metrics.securityAlerts}</div>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: LIVE PROCTORING HUB */}
      {subTab === 'live-proctoring' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search candidate, email, roll number..."
                className="px-3.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs w-64 focus:outline-none focus:border-[#FF9900]"
              />

              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#64748B] focus:outline-none cursor-pointer"
              >
                <option value="All">All Statuses ({attempts.length})</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="VIOLATIONS">With Violations (⚠️)</option>
                <option value="REVIEW_REQUIRED">Needs Review</option>
                <option value="SCREEN_OFFLINE">Screen Offline</option>
                <option value="CAMERA_OFFLINE">Camera Offline</option>
                <option value="PAUSED">Paused</option>
                <option value="SUBMITTED">Submitted</option>
              </select>

              <select
                value={selectedQuizId}
                onChange={e => {
                  setSelectedQuizId(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#64748B] focus:outline-none cursor-pointer"
              >
                <option value="All">All Weekly Quizzes</option>
                {quizzes.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.quizCode} - {q.title} ({q.sessionId || 'No Session'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              {/* View Switcher */}
              <div className="flex items-center gap-1 bg-[#F6F8FA] p-1 rounded-lg border border-[#E2E8F0]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded text-xs font-bold transition ${
                    viewMode === 'grid' ? 'bg-white text-[#111827] shadow-xs' : 'text-[#64748B]'
                  }`}
                >
                  Grid Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded text-xs font-bold transition ${
                    viewMode === 'table' ? 'bg-white text-[#111827] shadow-xs' : 'text-[#64748B]'
                  }`}
                >
                  Data Table
                </button>
              </div>

              {/* Page size */}
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#64748B]"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
                <option value={200}>200 / page</option>
              </select>

              <button
                onClick={fetchDashboardData}
                className="px-3.5 py-1.5 bg-[#F6F8FA] border border-[#E2E8F0] hover:border-[#FF9900] text-xs font-bold rounded-lg text-slate-800 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>🔄</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Session Eligibility & Schedule Info Strip */}
          {eligibilityMetrics && (
            <div className="p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-400 uppercase tracking-wide text-[11px]">Session-Linked Quiz:</span>
                  <span className="text-white font-semibold">{quizzes.find(q => q.id === selectedQuizId)?.title || 'All Weekly Quizzes'}</span>
                  {quizzes.find(q => q.id === selectedQuizId)?.sessionId && (
                    <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded font-mono text-[10px]">
                      Session ID: {quizzes.find(q => q.id === selectedQuizId)?.sessionId}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">Schedule Window:</span>
                  <span className="text-slate-200 font-mono text-[11px]">
                    {quizzes.find(q => q.id === selectedQuizId)?.scheduledDate || 'Active'} ({quizzes.find(q => q.id === selectedQuizId)?.startTime || '10:00'} – {quizzes.find(q => q.id === selectedQuizId)?.endTime || '10:30'} {quizzes.find(q => q.id === selectedQuizId)?.timezone || 'IST'})
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    eligibilityMetrics.scheduleStatus === 'LIVE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : eligibilityMetrics.scheduleStatus === 'UPCOMING'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {eligibilityMetrics.scheduleStatus}
                  </span>
                </div>
              </div>

              {/* Eligibility Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Eligible</div>
                  <div className="text-base font-bold text-amber-400 font-mono mt-0.5">{eligibilityMetrics.totalEligible}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Started</div>
                  <div className="text-base font-bold text-blue-400 font-mono mt-0.5">{eligibilityMetrics.started}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Not Started</div>
                  <div className="text-base font-bold text-slate-400 font-mono mt-0.5">{eligibilityMetrics.notStarted}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Active</div>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">{eligibilityMetrics.active}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Submitted</div>
                  <div className="text-base font-bold text-purple-400 font-mono mt-0.5">{eligibilityMetrics.submitted}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Auto Submitted</div>
                  <div className="text-base font-bold text-rose-400 font-mono mt-0.5">{eligibilityMetrics.autoSubmitted}</div>
                </div>
              </div>
            </div>
          )}

          {/* GRID VIEW (Optimized Dual Preview Cards) */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedAttempts.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                  No candidate assessment attempts found matching current filter.
                </div>
              ) : (
                paginatedAttempts.map(cand => (
                  <div
                    key={cand.id}
                    className="border border-[#E2E8F0] rounded-xl bg-white hover:border-[#FF9900] hover:shadow-md transition p-3.5 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      {/* Card Header: Candidate Name, Roll, Violations */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-bold text-xs text-[#111827] truncate max-w-[140px]">
                            {cand.studentName}
                          </h4>
                          <span className="text-[10px] text-[#64748B] font-mono">{cand.rollNumber}</span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                            (cand.violationCount || 0) >= 2
                              ? 'bg-red-100 text-red-700 border border-red-300'
                              : (cand.violationCount || 0) === 1
                              ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          V: {cand.violationCount || 0} / 2
                        </span>
                      </div>

                      {/* Dual Preview Snapshots (Webcam + Screen) */}
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-950 rounded-lg p-1 aspect-[16/9] relative overflow-hidden mb-2">
                        {/* Webcam View */}
                        <div className="relative bg-slate-900 rounded overflow-hidden flex items-center justify-center border border-slate-800">
                          {cand.cameraPreviewFrame || cand.previewFrame ? (
                            <img
                              src={cand.cameraPreviewFrame || cand.previewFrame}
                              alt="Webcam"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">Webcam</span>
                          )}
                          <span
                            className={`absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full ${
                              cand.cameraStatus === 'ACTIVE' ? 'bg-emerald-400' : 'bg-red-400'
                            }`}
                          />
                        </div>

                        {/* Screen View */}
                        <div className="relative bg-slate-900 rounded overflow-hidden flex items-center justify-center border border-slate-800">
                          {cand.screenPreviewFrame ? (
                            <img
                              src={cand.screenPreviewFrame}
                              alt="Screen"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">Screen</span>
                          )}
                          <span
                            className={`absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full ${
                              cand.screenStatus === 'ACTIVE' ? 'bg-emerald-400' : 'bg-red-400'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Status Badges Row */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#64748B]">
                        <span className="font-mono font-bold text-slate-800">
                          ⏱ {formatTimeDisplay(cand.remainingSeconds, cand.durationMinutes)}
                        </span>
                        <span>•</span>
                        <span
                          className={`font-semibold ${
                            cand.status === 'IN_PROGRESS'
                              ? 'text-blue-600'
                              : cand.status === 'SUBMITTED'
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {cand.status}
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                      <button
                        onClick={() => openLiveView(cand)}
                        className="flex-1 py-1 bg-amber-50 hover:bg-amber-100 text-[#FF9900] border border-amber-200 font-bold rounded text-[11px] transition text-center cursor-pointer"
                      >
                        Live Inspect
                      </button>
                      <button
                        onClick={() => openTimelineView(cand)}
                        className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-[#64748B] border border-slate-200 font-semibold rounded text-[11px] transition cursor-pointer"
                      >
                        Events ({cand.securityEventsCount || 0})
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
              <table className="min-w-full divide-y divide-[#E2E8F0] text-xs">
                <thead className="bg-[#F6F8FA] font-bold text-[#64748B] uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-left">Candidate</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Quiz</th>
                    <th className="px-3 py-3 text-center">Camera</th>
                    <th className="px-3 py-3 text-center">Screen</th>
                    <th className="px-3 py-3 text-center">Violations</th>
                    <th className="px-3 py-3 text-center">Time</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#111827]">
                  {paginatedAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        No candidate assessment attempts found.
                      </td>
                    </tr>
                  ) : (
                    paginatedAttempts.map(cand => (
                      <tr key={cand.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-semibold text-[#111827]">
                          <div>{cand.studentName}</div>
                          <div className="text-[10px] text-[#64748B] font-mono">{cand.rollNumber}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[#64748B] select-all">{cand.email}</td>
                        <td className="px-4 py-3 text-xs font-medium max-w-[140px] truncate">{cand.quizTitle}</td>

                        <td className="px-3 py-3 text-center">
                          {cand.cameraStatus === 'ACTIVE' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              🟢 Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                              🔴 Offline
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center">
                          {cand.screenStatus === 'ACTIVE' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              🟢 Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                              🔴 Offline
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                              (cand.violationCount || 0) >= 2
                                ? 'bg-red-100 text-red-700 border border-red-300'
                                : (cand.violationCount || 0) === 1
                                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                : 'bg-slate-100 text-[#64748B]'
                            }`}
                          >
                            {cand.violationCount || 0} / 2
                          </span>
                        </td>

                        <td className="px-3 py-3 text-center font-mono text-[11px] text-[#64748B]">
                          {formatTimeDisplay(cand.remainingSeconds, cand.durationMinutes)}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                              cand.status === 'IN_PROGRESS'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : cand.status === 'SUBMITTED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {cand.status.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => openLiveView(cand)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[#FF9900] border border-amber-200 font-bold rounded text-xs cursor-pointer"
                          >
                            Live Inspect
                          </button>
                          <button
                            onClick={() => openTimelineView(cand)}
                            className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-[#64748B] border border-slate-200 font-bold rounded text-xs cursor-pointer"
                          >
                            Events
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-4 text-xs text-[#64748B]">
            <div>
              Showing candidates <strong>{Math.min(filteredAttempts.length, (currentPage - 1) * pageSize + 1)}</strong> to{' '}
              <strong>{Math.min(filteredAttempts.length, currentPage * pageSize)}</strong> of{' '}
              <strong>{filteredAttempts.length}</strong> total
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-[#F6F8FA] border border-[#E2E8F0] rounded text-xs font-semibold disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-mono">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-[#F6F8FA] border border-[#E2E8F0] rounded text-xs font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: QUIZ BANK & MANAGER */}
      {subTab === 'quizzes-editor' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#111827]">Weekly Quizzes &amp; Session Scheduling</h3>
              <p className="text-xs text-[#64748B]">Manage session-specific Weekly Quizzes, date &amp; time windows, and question banks.</p>
            </div>
            <button
              onClick={() => {
                setEditingQuiz({
                  id: '',
                  quizCode: `AWS-WEEK-${String(quizzes.length + 1).padStart(2, '0')}`,
                  title: `Weekly AWS Quiz #${String(quizzes.length + 1).padStart(2, '0')}`,
                  topic: 'Amazon EC2, VPC Networking & IAM Roles',
                  description: '',
                  sessionId: events[0]?.id || 'event-01',
                  sessionTitle: events[0]?.title || 'Introduction to AWS Cloud & Architecture',
                  scheduledDate: new Date().toISOString().split('T')[0],
                  startTime: '10:00',
                  endTime: '10:30',
                  timezone: 'Asia/Kolkata',
                  durationMinutes: 20,
                  totalQuestionsToSelect: 20,
                  passingPercentage: 60,
                  status: 'Live',
                  questionBank: []
                });
                setIsQuizModalOpen(true);
              }}
              className="px-4 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
            >
              + Create Weekly Quiz
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map(q => (
              <div key={q.id} className="p-5 border border-[#E2E8F0] rounded-xl bg-[#F6F8FA] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF9900]/20 text-[#FF9900]">
                    {q.quizCode}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 font-mono">
                      {q.sessionId || 'No Session'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {q.status}
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="font-extrabold text-[#111827] text-sm">{q.title}</h4>
                  <p className="text-xs text-[#64748B]">{q.topic}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Linked Session: <strong className="text-slate-700">{q.sessionTitle || q.sessionId || 'N/A'}</strong>
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-[#E2E8F0] text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Schedule Window:</span>
                    <strong className="font-mono text-slate-800">
                      {q.scheduledDate || 'Active'} ({q.startTime || '10:00'} – {q.endTime || '10:30'} {q.timezone || 'IST'})
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Duration / Passing:</span>
                    <span>{q.durationMinutes} Mins • {q.passingPercentage || 60}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0]">
                  <span>{q.questionBank?.length || 0} Questions in Bank</span>
                  <button
                    onClick={() => {
                      setEditingQuiz({ ...q });
                      setIsQuizModalOpen(true);
                    }}
                    className="px-3 py-1 bg-white border border-[#E2E8F0] hover:border-[#FF9900] text-xs font-bold rounded text-[#111827] cursor-pointer"
                  >
                    Edit / Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: PROCTORING SETTINGS */}
      {subTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6 max-w-3xl">
          <div className="border-b border-[#E2E8F0] pb-4">
            <h3 className="text-base font-extrabold text-[#111827]">Configurable Weekly Quiz Proctoring Settings</h3>
            <p className="text-xs text-[#64748B]">Adjust integrity thresholds, camera grace periods, and proctoring policies.</p>
          </div>

          <div className="space-y-4 text-xs text-[#111827]">
            <div className="flex items-center justify-between p-3.5 bg-[#F6F8FA] rounded-xl border border-[#E2E8F0]">
              <div>
                <div className="font-bold">Webcam Monitoring</div>
                <div className="text-[#64748B] text-[11px]">Require candidate camera feed before starting assessment</div>
              </div>
              <input
                type="checkbox"
                checked={settings.requireWebcam}
                onChange={e => setSettings({ ...settings, requireWebcam: e.target.checked })}
                className="w-4 h-4 rounded text-[#FF9900]"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#F6F8FA] rounded-xl border border-[#E2E8F0]">
              <div>
                <div className="font-bold">Screen Sharing Requirement</div>
                <div className="text-[#64748B] text-[11px]">Require entire desktop sharing during proctored quiz</div>
              </div>
              <input
                type="checkbox"
                checked={true}
                readOnly
                className="w-4 h-4 rounded text-[#FF9900] opacity-75"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#F6F8FA] rounded-xl border border-[#E2E8F0]">
              <div>
                <div className="font-bold">Two-Violation Policy Enforcement</div>
                <div className="text-[#64748B] text-[11px]">Server-authoritative warning on 1st violation, auto-submit on 2nd</div>
              </div>
              <input
                type="checkbox"
                checked={true}
                readOnly
                className="w-4 h-4 rounded text-[#FF9900] opacity-75"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block font-bold text-[#111827] mb-1">No Face Threshold (Seconds)</label>
                <input
                  type="number"
                  min="2"
                  max="30"
                  value={settings.noFaceThresholdSeconds}
                  onChange={e => setSettings({ ...settings, noFaceThresholdSeconds: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-[#111827] mb-1">Camera Grace Period (Seconds)</label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={settings.cameraGracePeriodSeconds}
                  onChange={e => setSettings({ ...settings, cameraGracePeriodSeconds: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-[#111827] mb-1">Fullscreen Grace Period (Seconds)</label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={settings.fullscreenGracePeriodSeconds}
                  onChange={e => setSettings({ ...settings, fullscreenGracePeriodSeconds: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-extrabold rounded-lg shadow-sm cursor-pointer"
          >
            Save Proctoring Settings
          </button>
        </form>
      )}

      {/* ========================================================= */}
      {/* 1. DUAL-VIEW LIVE PROCTORING MODAL ("LIVE INSPECT")       */}
      {/* ========================================================= */}
      {isLiveViewOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-5xl w-full bg-[#0E1726] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#0B132B] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Live Proctoring: {selectedCandidate.studentName}
                  </h3>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Roll Number: {selectedCandidate.rollNumber} • {selectedCandidate.email}
                  </div>
                </div>
              </div>

              {/* Authoritative Violation Pill in Header */}
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                    (selectedCandidate.violationCount || 0) >= 2
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : (selectedCandidate.violationCount || 0) === 1
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  Violations: {selectedCandidate.violationCount || 0} / 2
                </span>
                <button onClick={closeLiveView} className="text-slate-400 hover:text-white text-lg font-bold px-2 cursor-pointer">
                  &times;
                </button>
              </div>
            </div>

            {/* Modal Body: Dual Viewports (Left: Webcam, Right: Screen) + Controls */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Dual Viewports */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Viewport: Webcam Stream */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Webcam Stream
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{selectedCandidate.cameraStatus || 'ACTIVE'}</span>
                  </div>

                  <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
                    <video
                      ref={adminCameraVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover transform scale-x-[-1] ${cameraStreamActive ? 'block' : 'hidden'}`}
                    />

                    {!cameraStreamActive && remoteCameraPreviewFrame && (
                      <img src={remoteCameraPreviewFrame} alt="Webcam" className="w-full h-full object-cover transform scale-x-[-1]" />
                    )}

                    {!cameraStreamActive && !remoteCameraPreviewFrame && (
                      <div className="text-center p-4 text-slate-500 text-xs">
                        <div className="text-2xl mb-1">📹</div>
                        <span>Connecting Webcam Feed...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Viewport: Screen Share Stream */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      Screen Share Stream
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{selectedCandidate.screenStatus || 'ACTIVE'}</span>
                  </div>

                  <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
                    <video
                      ref={adminScreenVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-contain ${screenStreamActive ? 'block' : 'hidden'}`}
                    />

                    {!screenStreamActive && remoteScreenPreviewFrame && (
                      <img src={remoteScreenPreviewFrame} alt="Screen Share" className="w-full h-full object-contain" />
                    )}

                    {!screenStreamActive && !remoteScreenPreviewFrame && (
                      <div className="text-center p-4 text-slate-500 text-xs">
                        <div className="text-2xl mb-1">🖥️</div>
                        <span>Connecting Screen Share Feed...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Control Strip */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                <div className="md:col-span-2 text-xs space-y-1">
                  <div className="text-slate-400">
                    Assessment: <strong className="text-white">{selectedCandidate.quizTitle}</strong>
                  </div>
                  <div className="text-slate-400">
                    Remaining Time:{' '}
                    <strong className="text-amber-400 font-mono">
                      {formatTimeDisplay(selectedCandidate.remainingSeconds, selectedCandidate.durationMinutes)}
                    </strong>
                  </div>
                </div>

                <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsWarningModalOpen(true);
                    }}
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs transition"
                  >
                    ⚠️ Send Warning
                  </button>

                  {selectedCandidate.status === 'PAUSED' ? (
                    <button
                      onClick={() => handleAdminAction('resume-candidate', selectedCandidate.id || selectedCandidate.attemptId)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition"
                    >
                      ▶ Resume
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAdminAction('pause-candidate', selectedCandidate.id || selectedCandidate.attemptId)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs transition"
                    >
                      ⏸ Pause
                    </button>
                  )}

                  <button
                    onClick={() => handleAdminAction('extend-time', selectedCandidate.id || selectedCandidate.attemptId, { minutes: 5 })}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition"
                  >
                    +5m
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Force submit this assessment and lock response?')) {
                        handleAdminAction('force-submit', selectedCandidate.id || selectedCandidate.attemptId);
                      }
                    }}
                    className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition"
                  >
                    ⏹ Force Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WARNING DISPATCH MODAL */}
      {isWarningModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl text-slate-100 space-y-4">
            <h3 className="text-base font-bold text-white">Dispatch Proctor Warning</h3>
            <p className="text-xs text-slate-400">
              Send an authoritative warning alert to <strong>{selectedCandidate.studentName}</strong>.
            </p>

            <textarea
              rows={3}
              value={customWarningText}
              onChange={e => setCustomWarningText(e.target.value)}
              placeholder="e.g. Please ensure you remain focused on your exam screen."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setIsWarningModalOpen(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleAdminAction('send-warning', selectedCandidate.id || selectedCandidate.attemptId, {
                    message: customWarningText || 'Please ensure you remain focused on your exam screen.',
                    countViolation: true
                  });
                  setIsWarningModalOpen(false);
                  setCustomWarningText('');
                }}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition"
              >
                Send &amp; Log Violation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ACTIVITY TIMELINE MODAL */}
      {isTimelineOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#0E1726] border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Assessment Activity Timeline: {selectedCandidate.studentName}
                </h3>
                <div className="text-xs text-slate-400">{selectedCandidate.email}</div>
              </div>
              <button onClick={() => setIsTimelineOpen(false)} className="text-slate-400 hover:text-white text-lg font-bold px-2 cursor-pointer">
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {timelineLoading ? (
                <div className="text-center py-8 text-slate-400 text-xs">Loading activity timeline...</div>
              ) : timelineEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">No integrity events recorded. Session normal.</div>
              ) : (
                timelineEvents.map(ev => {
                  const timeStr = new Date(ev.timestamp).toLocaleTimeString();
                  const isWarning = ev.severity === 'WARNING';
                  const isCritical = ev.severity === 'CRITICAL';

                  return (
                    <div
                      key={ev.id}
                      className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                        isCritical
                          ? 'bg-red-950/40 border-red-800 text-red-200'
                          : isWarning
                          ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold flex items-center gap-2">
                          <span>{isCritical ? '🔴' : isWarning ? '⚠️' : '🟢'}</span>
                          <span>{ev.eventType.replace(/_/g, ' ')}</span>
                          {ev.durationSeconds && (
                            <span className="font-mono text-[11px] bg-slate-900 px-1.5 py-0.5 rounded">
                              {ev.durationSeconds}s duration
                            </span>
                          )}
                        </div>
                        {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {JSON.stringify(ev.metadata)}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">{timeStr}</span>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setIsTimelineOpen(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Close Activity Timeline
            </button>
          </div>
        </div>
      )}

      {/* 3. QUIZ CREATE / EDIT / SCHEDULE MODAL */}
      {isQuizModalOpen && editingQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-[#0E1726] border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {editingQuiz.id ? 'Edit Weekly Quiz & Schedule' : 'Create Weekly Quiz'}
                </h3>
                <p className="text-xs text-slate-400">Configure session-specific eligibility and authoritative start/end times.</p>
              </div>
              <button
                onClick={() => {
                  setIsQuizModalOpen(false);
                  setEditingQuiz(null);
                }}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-xs">
              {/* Linked Session Selector */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-amber-500/30 space-y-2">
                <label className="block font-bold text-amber-400 uppercase tracking-wide text-[11px]">
                  Associated AWS Session (Eligibility Bound) *
                </label>
                <select
                  value={editingQuiz.sessionId || ''}
                  onChange={e => {
                    const selectedId = e.target.value;
                    const match = events.find(ev => ev.id === selectedId);
                    setEditingQuiz({
                      ...editingQuiz,
                      sessionId: selectedId,
                      sessionTitle: match ? match.title : editingQuiz.sessionTitle
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Select Session --</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.eventNumber ? `Session ${ev.eventNumber}: ` : ''}{ev.title} ({ev.id})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">
                  Only candidates registered for this exact session in the system will be eligible to access this Weekly Quiz.
                </p>
              </div>

              {/* Schedule Date, Start Time, End Time, Timezone */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                <label className="block font-bold text-white uppercase tracking-wide text-[11px]">
                  Scheduled Timing &amp; Autoritative Boundaries
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Quiz Date</label>
                    <input
                      type="date"
                      value={editingQuiz.scheduledDate || ''}
                      onChange={e => setEditingQuiz({ ...editingQuiz, scheduledDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={editingQuiz.startTime || '10:00'}
                      onChange={e => setEditingQuiz({ ...editingQuiz, startTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">End Time</label>
                    <input
                      type="time"
                      value={editingQuiz.endTime || '10:30'}
                      onChange={e => setEditingQuiz({ ...editingQuiz, endTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Timezone</label>
                    <select
                      value={editingQuiz.timezone || 'Asia/Kolkata'}
                      onChange={e => setEditingQuiz({ ...editingQuiz, timezone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="UTC">UTC / GMT</option>
                    </select>
                  </div>
                </div>

                {/* Schedule Preview */}
                <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Schedule Preview:</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {editingQuiz.scheduledDate || 'Date'} • {editingQuiz.startTime || '10:00'} – {editingQuiz.endTime || '10:30'} {editingQuiz.timezone || 'IST'}
                  </span>
                </div>
              </div>

              {/* Basic Quiz Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Quiz Code</label>
                  <input
                    type="text"
                    value={editingQuiz.quizCode || ''}
                    onChange={e => setEditingQuiz({ ...editingQuiz, quizCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                    placeholder="AWS-WEEK-05"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Quiz Status</label>
                  <select
                    value={editingQuiz.status || 'Live'}
                    onChange={e => setEditingQuiz({ ...editingQuiz, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="Live">Live / Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Quiz Title</label>
                <input
                  type="text"
                  value={editingQuiz.title || ''}
                  onChange={e => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold"
                  placeholder="Weekly AWS Quiz #05: Serverless Architecture & Lambda"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Topic / Subject</label>
                <input
                  type="text"
                  value={editingQuiz.topic || ''}
                  onChange={e => setEditingQuiz({ ...editingQuiz, topic: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  placeholder="AWS Lambda, API Gateway & Step Functions"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={editingQuiz.durationMinutes || 20}
                    onChange={e => setEditingQuiz({ ...editingQuiz, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Questions to Select</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editingQuiz.totalQuestionsToSelect || 20}
                    onChange={e => setEditingQuiz({ ...editingQuiz, totalQuestionsToSelect: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Passing Percentage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editingQuiz.passingPercentage || 60}
                    onChange={e => setEditingQuiz({ ...editingQuiz, passingPercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              {/* Questions Bank Summary */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200">Question Pool: </span>
                  <span className="text-amber-400 font-mono font-bold">{editingQuiz.questionBank?.length || 0} Questions</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Questions are randomized per student attempt upon launch.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsQuizModalOpen(false);
                  setEditingQuiz(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleAdminAction('save-quiz', 'QUIZ', { quiz: editingQuiz });
                  setIsQuizModalOpen(false);
                  setEditingQuiz(null);
                  await fetchDashboardData();
                }}
                className="px-5 py-2 bg-[#FF9900] hover:bg-[#E08800] text-slate-950 font-bold rounded-lg text-xs shadow-sm cursor-pointer"
              >
                Save &amp; Schedule Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
