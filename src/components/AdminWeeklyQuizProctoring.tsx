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
    securityAlerts: 0
  });
  const [quizzes, setQuizzes] = useState<WeeklyQuiz[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [settings, setSettings] = useState<WeeklyQuizProctoringConfig>({
    requireWebcam: true,
    requireMicrophone: true,
    requireFaceDetection: true,
    detectMultipleFaces: true,
    requireFullscreen: true,
    monitorFocus: true,
    noFaceThresholdSeconds: 6,
    multipleFacesThresholdSeconds: 4,
    cameraGracePeriodSeconds: 30,
    fullscreenGracePeriodSeconds: 15
  });

  const [loading, setLoading] = useState(true);
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
  const [timelineEvents, setTimelineEvents] = useState<WeeklyQuizSecurityEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Live WebRTC Video in Admin Modal
  const adminVideoRef = useRef<HTMLVideoElement | null>(null);
  const adminPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [remotePreviewFrame, setRemotePreviewFrame] = useState<string | null>(null);

  // Quiz Editor State
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

  // Fetch Dashboard Data
  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/admin/weekly-quiz', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
        setQuizzes(data.quizzes || []);
        setAttempts(data.attempts || []);
        if (data.settings) setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to fetch proctoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh every 4 seconds
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 4000);
    return () => clearInterval(interval);
  }, [token]);

  // Handle Admin Action (Pause, Resume, Lock, Extend, Force Submit)
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

      // If live modal is open for this candidate, update state
      if (selectedCandidate && selectedCandidate.attemptId === attemptId) {
        openLiveView(selectedCandidate);
      }
    } catch (err: any) {
      setActionError(err.message || 'Action failed.');
      setTimeout(() => setActionError(null), 4000);
    }
  };

  // Open "View Live" Modal with WebRTC subscription
  const openLiveView = async (cand: any) => {
    setSelectedCandidate(cand);
    setIsLiveViewOpen(true);
    setStreamActive(false);
    setRemotePreviewFrame(null);

    // Fetch candidate details & WebRTC signaling offer
    try {
      const res = await fetch(`/api/admin/weekly-quiz/webrtc?attemptId=${encodeURIComponent(cand.id || cand.attemptId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success && data.hasStream) {
        if (data.previewFrame) {
          setRemotePreviewFrame(data.previewFrame);
        }

        if (data.offer) {
          // Initialize WebRTC Peer Connection to receive candidate stream
          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          });
          adminPeerConnectionRef.current = pc;

          pc.ontrack = event => {
            if (adminVideoRef.current && event.streams[0]) {
              adminVideoRef.current.srcObject = event.streams[0];
              adminVideoRef.current.play().catch(() => {});
              setStreamActive(true);
            }
          };

          pc.onicecandidate = async event => {
            if (event.candidate) {
              await fetch('/api/admin/weekly-quiz/webrtc', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  attemptId: cand.id || cand.attemptId,
                  iceCandidate: event.candidate
                })
              });
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          // Send answer to server
          await fetch('/api/admin/weekly-quiz/webrtc', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              attemptId: cand.id || cand.attemptId,
              answer: pc.localDescription
            })
          });

          // Add any remote ICE candidates
          if (Array.isArray(data.candidateIceCandidates)) {
            for (const c of data.candidateIceCandidates) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(c));
              } catch (e) {}
            }
          }
        }
      }
    } catch (err) {
      console.error('Error establishing admin live stream:', err);
    }
  };

  // Close Live View
  const closeLiveView = () => {
    setIsLiveViewOpen(false);
    if (adminPeerConnectionRef.current) {
      adminPeerConnectionRef.current.close();
      adminPeerConnectionRef.current = null;
    }
    setStreamActive(false);
    setRemotePreviewFrame(null);
  };

  // Periodic sync for Live View telemetry and late-arriving ICE candidates
  useEffect(() => {
    if (!isLiveViewOpen || !selectedCandidate || !token) return;

    const liveSyncInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/weekly-quiz/webrtc?attemptId=${encodeURIComponent(selectedCandidate.id || selectedCandidate.attemptId)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          if (data.previewFrame) {
            setRemotePreviewFrame(data.previewFrame);
          }
          if (adminPeerConnectionRef.current && Array.isArray(data.candidateIceCandidates)) {
            for (const c of data.candidateIceCandidates) {
              try {
                await adminPeerConnectionRef.current.addIceCandidate(new RTCIceCandidate(c));
              } catch (e) {}
            }
          }
        }
      } catch (e) {}
    }, 3000);

    return () => clearInterval(liveSyncInterval);
  }, [isLiveViewOpen, selectedCandidate, token]);

  // Open "View Activity" Timeline Modal
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

  // Open "View Report" Modal
  const openReportView = (cand: any) => {
    setSelectedCandidate(cand);
    setIsReportOpen(true);
  };

  // Save Proctoring Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/weekly-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'update-settings',
          settings
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage('Proctoring configuration updated successfully.');
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      setActionError('Failed to save settings.');
    }
  };

  // Format Elapsed Time mm:ss / mm:ss
  const formatTimeDisplay = (remainingSec: number, totalMinutes: number) => {
    const totalSec = totalMinutes * 60;
    const elapsedSec = Math.max(0, totalSec - remainingSec);
    const m1 = Math.floor(elapsedSec / 60);
    const s1 = elapsedSec % 60;
    const m2 = Math.floor(totalSec / 60);
    const s2 = totalSec % 60;
    return `${m1.toString().padStart(2, '0')}:${s1.toString().padStart(2, '0')} / ${m2.toString().padStart(2, '0')}:${s2.toString().padStart(2, '0')}`;
  };

  // Filtered Candidates Table Data
  const filteredAttempts = attempts.filter(att => {
    const matchesSearch =
      att.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Review Required'
        ? att.integrityRating === 'REVIEW_REQUIRED' || att.integrityRating === 'ATTENTION'
        : att.status === statusFilter;

    const matchesQuiz = selectedQuizId === 'All' || att.quizId === selectedQuizId;

    return matchesSearch && matchesStatus && matchesQuiz;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner & Tab Navigation */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎥</span>
              <h2 className="text-xl font-extrabold text-[#111827] font-display">
                Weekly AWS Quiz Proctoring &amp; Assessment Control
              </h2>
            </div>
            <p className="text-xs text-[#64748B]">
              Real-time WebRTC live candidate monitoring, privacy-preserving face status tracking, and assessment integrity signals.
            </p>
          </div>

          {/* Subtabs */}
          <div className="flex items-center gap-1.5 bg-[#F6F8FA] p-1 rounded-xl border border-[#E2E8F0] self-start sm:self-auto">
            <button
              onClick={() => setSubTab('live-proctoring')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                subTab === 'live-proctoring'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              Live Proctoring
            </button>
            <button
              onClick={() => setSubTab('quizzes-editor')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                subTab === 'quizzes-editor'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              Quiz Bank Editor
            </button>
            <button
              onClick={() => setSubTab('settings')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
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
            <div className="text-[10px] uppercase font-bold text-[#64748B]">Candidates</div>
            <div className="text-2xl font-extrabold text-[#111827] mt-1 font-mono">{metrics.totalCandidates}</div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80">
            <div className="text-[10px] uppercase font-bold text-amber-700">Waiting</div>
            <div className="text-2xl font-extrabold text-amber-600 mt-1 font-mono">{metrics.waiting}</div>
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
            <div className="text-[10px] uppercase font-bold text-rose-700">Camera Issues</div>
            <div className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{metrics.cameraIssues}</div>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80">
            <div className="text-[10px] uppercase font-bold text-purple-700">Security Alerts</div>
            <div className="text-2xl font-extrabold text-purple-600 mt-1 font-mono">{metrics.securityAlerts}</div>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: LIVE PROCTORING TABLE & CANDIDATE MONITORING */}
      {subTab === 'live-proctoring' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-5">
          {/* Filter and Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search candidate name, email, or roll number..."
                className="px-3.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs w-64 focus:outline-none focus:border-[#FF9900]"
              />

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#64748B] focus:outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING">Waiting / Lobby</option>
                <option value="PAUSED">Paused</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="Review Required">Needs Integrity Review</option>
              </select>

              <select
                value={selectedQuizId}
                onChange={e => setSelectedQuizId(e.target.value)}
                className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#64748B] focus:outline-none cursor-pointer"
              >
                <option value="All">All Weekly Quizzes</option>
                {quizzes.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.quizCode} - {q.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchDashboardData}
              className="px-3.5 py-1.5 bg-[#F6F8FA] border border-[#E2E8F0] hover:border-[#FF9900] text-xs font-bold rounded-lg text-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>🔄</span>
              <span>Refresh Table</span>
            </button>
          </div>

          {/* Candidates Monitoring Table */}
          <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-xs">
              <thead className="bg-[#F6F8FA] font-bold text-[#64748B] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 text-left">Candidate</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Quiz</th>
                  <th className="px-3 py-3 text-center">Camera</th>
                  <th className="px-3 py-3 text-center">Face</th>
                  <th className="px-3 py-3 text-center">Focus</th>
                  <th className="px-3 py-3 text-center">Security Events</th>
                  <th className="px-4 py-3 text-center">Time</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#111827]">
                {filteredAttempts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                      No candidate assessment attempts found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredAttempts.map(cand => (
                    <tr key={cand.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#111827]">
                        <div>{cand.studentName}</div>
                        <div className="text-[10px] text-[#64748B] font-mono">{cand.rollNumber}</div>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-[#64748B] select-all">
                        {cand.email}
                      </td>

                      <td className="px-4 py-3 text-xs font-medium max-w-[160px] truncate">
                        {cand.quizTitle}
                      </td>

                      {/* Camera Status */}
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

                      {/* Face Status */}
                      <td className="px-3 py-3 text-center">
                        {cand.faceStatus === 'ONE_FACE' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            🟢 1 Face
                          </span>
                        ) : cand.faceStatus === 'MULTIPLE_FACES' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            ⚠️ Multiple
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            ⚠️ No Face
                          </span>
                        )}
                      </td>

                      {/* Focus Status */}
                      <td className="px-3 py-3 text-center">
                        {cand.focusStatus === 'FOCUSED' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            🟢 Focused
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            ⚠️ Unfocused
                          </span>
                        )}
                      </td>

                      {/* Security Events Count Badge */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                            cand.securityEventsCount > 2 || cand.faceEventsCount > 2
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : cand.securityEventsCount > 0 || cand.faceEventsCount > 0
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-[#64748B]'
                          }`}
                        >
                          {cand.securityEventsCount + cand.faceEventsCount}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3 text-center font-mono text-[11px] text-[#64748B]">
                        {formatTimeDisplay(cand.remainingSeconds, cand.durationMinutes)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${
                            cand.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : cand.status === 'SUBMITTED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : cand.status === 'PAUSED'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {cand.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => openLiveView(cand)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[#FF9900] border border-amber-200 font-bold rounded text-xs transition-colors cursor-pointer"
                        >
                          View Live
                        </button>
                        <button
                          onClick={() => openTimelineView(cand)}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-[#64748B] border border-slate-200 font-bold rounded text-xs transition-colors cursor-pointer"
                        >
                          Activity
                        </button>
                        {cand.status === 'SUBMITTED' && (
                          <button
                            onClick={() => openReportView(cand)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded text-xs transition-colors cursor-pointer"
                          >
                            Report
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: QUIZ BANK & EDITOR */}
      {subTab === 'quizzes-editor' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#111827]">Weekly Quizzes &amp; Question Banks</h3>
              <p className="text-xs text-[#64748B]">Create and manage randomized question pools for weekly AWS learning assessments.</p>
            </div>
            <button
              onClick={() => {
                setEditingQuiz({
                  id: '',
                  quizCode: `AWS-WEEK-${String(quizzes.length + 1).padStart(2, '0')}`,
                  title: `Weekly AWS Quiz #${String(quizzes.length + 1).padStart(2, '0')}`,
                  topic: 'Amazon EC2, VPC Networking & IAM Roles',
                  description: '',
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
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {q.status}
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-[#111827] text-sm">{q.title}</h4>
                  <p className="text-xs text-[#64748B]">{q.topic}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0]">
                  <span>{q.durationMinutes} Mins</span>
                  <span>{q.questionBank?.length || 0} Questions in Bank</span>
                  <span>Selects {q.totalQuestionsToSelect}</span>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setEditingQuiz({ ...q });
                      setIsQuizModalOpen(true);
                    }}
                    className="px-3 py-1 bg-white border border-[#E2E8F0] hover:border-[#FF9900] text-xs font-bold rounded text-[#111827] cursor-pointer"
                  >
                    Edit / View Bank
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
                <div className="font-bold">Microphone Hardware Check</div>
                <div className="text-[#64748B] text-[11px]">Verify microphone detection in pre-quiz check</div>
              </div>
              <input
                type="checkbox"
                checked={settings.requireMicrophone}
                onChange={e => setSettings({ ...settings, requireMicrophone: e.target.checked })}
                className="w-4 h-4 rounded text-[#FF9900]"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#F6F8FA] rounded-xl border border-[#E2E8F0]">
              <div>
                <div className="font-bold">Face Status Detection</div>
                <div className="text-[#64748B] text-[11px]">Detect 1 Face vs No Face using privacy-preserving heuristics</div>
              </div>
              <input
                type="checkbox"
                checked={settings.requireFaceDetection}
                onChange={e => setSettings({ ...settings, requireFaceDetection: e.target.checked })}
                className="w-4 h-4 rounded text-[#FF9900]"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#F6F8FA] rounded-xl border border-[#E2E8F0]">
              <div>
                <div className="font-bold">Multiple Faces Detection</div>
                <div className="text-[#64748B] text-[11px]">Log alert when multiple faces appear in camera view</div>
              </div>
              <input
                type="checkbox"
                checked={settings.detectMultipleFaces}
                onChange={e => setSettings({ ...settings, detectMultipleFaces: e.target.checked })}
                className="w-4 h-4 rounded text-[#FF9900]"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#F6F8FA] rounded-xl border border-[#E2E8F0]">
              <div>
                <div className="font-bold">Fullscreen Enforcement</div>
                <div className="text-[#64748B] text-[11px]">Prompt candidate to stay in fullscreen mode during quiz</div>
              </div>
              <input
                type="checkbox"
                checked={settings.requireFullscreen}
                onChange={e => setSettings({ ...settings, requireFullscreen: e.target.checked })}
                className="w-4 h-4 rounded text-[#FF9900]"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#F6F8FA] rounded-xl border border-[#E2E8F0]">
              <div>
                <div className="font-bold">Focus &amp; Tab Visibility Monitoring</div>
                <div className="text-[#64748B] text-[11px]">Track window blur and tab switching events in timeline</div>
              </div>
              <input
                type="checkbox"
                checked={settings.monitorFocus}
                onChange={e => setSettings({ ...settings, monitorFocus: e.target.checked })}
                className="w-4 h-4 rounded text-[#FF9900]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block font-bold text-[#111827] mb-1">No Face Grace Threshold (Seconds)</label>
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
                <label className="block font-bold text-[#111827] mb-1">Camera Disconnect Grace (Seconds)</label>
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
                <label className="block font-bold text-[#111827] mb-1">Fullscreen Grace (Seconds)</label>
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
      {/* 1. DEDICATED LIVE WEBCAM MONITORING MODAL ("VIEW LIVE")  */}
      {/* ========================================================= */}
      {isLiveViewOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-[#0E1726] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#0B132B] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Live Proctoring Feed: {selectedCandidate.studentName}
                  </h3>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Candidate ID: {selectedCandidate.candidateId || selectedCandidate.rollNumber}
                  </div>
                </div>
              </div>
              <button
                onClick={closeLiveView}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body: Left Live Stream + Right Candidate Info & Live Controls */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
              {/* LEFT: Large Live Webcam Viewport */}
              <div className="space-y-3">
                <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
                  {/* WebRTC Video Element */}
                  <video
                    ref={adminVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${streamActive ? 'block' : 'hidden'}`}
                  />

                  {/* Instant Telemetry Snapshot Fallback */}
                  {!streamActive && remotePreviewFrame && (
                    <img
                      src={remotePreviewFrame}
                      alt="Live Candidate Feed"
                      className="w-full h-full object-cover"
                    />
                  )}

                  {!streamActive && !remotePreviewFrame && (
                    <div className="text-center p-6 space-y-2 text-slate-400">
                      <div className="text-3xl">🎥</div>
                      <div className="text-xs">Connecting to candidate WebRTC stream...</div>
                    </div>
                  )}

                  {/* Live Badge Overlay */}
                  <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>LIVE STREAM</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Stream Transport: <strong className="text-white">WebRTC P2P (TLS Encrypted)</strong></span>
                  <span className="text-emerald-400 font-bold">Encrypted in Transit</span>
                </div>
              </div>

              {/* RIGHT: Candidate Info & Integrity Status & Controls */}
              <div className="space-y-4">
                {/* Candidate Information Card */}
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">CANDIDATE</div>
                  <div className="text-sm font-extrabold text-white">{selectedCandidate.studentName}</div>
                  <div className="text-slate-400 font-mono">{selectedCandidate.email}</div>
                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                    <div>Quiz: <strong className="text-slate-200">{selectedCandidate.quizTitle}</strong></div>
                    <div>Status: <strong className="text-blue-400">{selectedCandidate.status}</strong></div>
                    <div>Time: <strong className="text-white font-mono">{formatTimeDisplay(selectedCandidate.remainingSeconds, selectedCandidate.durationMinutes)}</strong></div>
                    <div>Extended: <strong className="text-amber-400">+{selectedCandidate.extendedMinutes || 0}m</strong></div>
                  </div>
                </div>

                {/* Integrity Status */}
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                  <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">INTEGRITY STATUS</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded bg-slate-900">
                      <span>Camera:</span>
                      <strong className={selectedCandidate.cameraStatus === 'ACTIVE' ? 'text-emerald-400' : 'text-red-400'}>
                        {selectedCandidate.cameraStatus === 'ACTIVE' ? '🟢 Active' : '🔴 Disconnected'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-slate-900">
                      <span>Face:</span>
                      <strong className={selectedCandidate.faceStatus === 'ONE_FACE' ? 'text-emerald-400' : 'text-amber-400'}>
                        {selectedCandidate.faceStatus === 'ONE_FACE' ? '🟢 1 Face' : selectedCandidate.faceStatus === 'MULTIPLE_FACES' ? '⚠️ Multiple' : '⚠️ No Face'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-slate-900">
                      <span>Focus:</span>
                      <strong className={selectedCandidate.focusStatus === 'FOCUSED' ? 'text-emerald-400' : 'text-amber-400'}>
                        {selectedCandidate.focusStatus === 'FOCUSED' ? '🟢 Focused' : '⚠️ Unfocused'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-slate-900">
                      <span>Fullscreen:</span>
                      <strong className={selectedCandidate.fullscreenStatus === 'FULLSCREEN' ? 'text-emerald-400' : 'text-amber-400'}>
                        {selectedCandidate.fullscreenStatus === 'FULLSCREEN' ? '🟢 Active' : '⚠️ Exited'}
                      </strong>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                    <span>Security Events Logged:</span>
                    <strong className="text-amber-400 font-mono font-bold">
                      {selectedCandidate.securityEventsCount || 0}
                    </strong>
                  </div>
                </div>

                {/* Admin Live Controls */}
                <div className="pt-2 grid grid-cols-2 gap-2">
                  {selectedCandidate.status === 'PAUSED' ? (
                    <button
                      onClick={() => handleAdminAction('resume-candidate', selectedCandidate.id || selectedCandidate.attemptId)}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      ▶ Resume Quiz
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAdminAction('pause-candidate', selectedCandidate.id || selectedCandidate.attemptId)}
                      className="py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      ⏸ Pause Quiz
                    </button>
                  )}

                  <button
                    onClick={() => handleAdminAction('extend-time', selectedCandidate.id || selectedCandidate.attemptId, { minutes: 5 })}
                    className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    +5 Mins Extend
                  </button>

                  <button
                    onClick={() => handleAdminAction('lock-candidate', selectedCandidate.id || selectedCandidate.attemptId)}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    🔒 Lock Candidate
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to end this candidate assessment session and submit?')) {
                        handleAdminAction('force-submit', selectedCandidate.id || selectedCandidate.attemptId);
                      }
                    }}
                    className="py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    ⏹ End Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. PROCTORING ACTIVITY TIMELINE MODAL ("VIEW ACTIVITY")   */}
      {/* ========================================================= */}
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
              <button
                onClick={() => setIsTimelineOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {timelineLoading ? (
                <div className="text-center py-8 text-slate-400 text-xs">Loading activity timeline...</div>
              ) : timelineEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">No integrity events recorded. Candidate session normal.</div>
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
                          <span>
                            {isCritical ? '🔴' : isWarning ? '⚠️' : '🟢'}
                          </span>
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

      {/* ========================================================= */}
      {/* 3. POST-QUIZ ASSESSMENT INTEGRITY REPORT MODAL            */}
      {/* ========================================================= */}
      {isReportOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-[#0E1726] border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">Assessment Integrity Summary</h3>
                <div className="text-xs text-slate-400">{selectedCandidate.studentName} ({selectedCandidate.email})</div>
              </div>
              <button
                onClick={() => setIsReportOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Camera Status</div>
                <div className="text-emerald-400 font-bold">✓ Active Throughout</div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Face Signals</div>
                <div className="text-white font-bold">{selectedCandidate.faceEventsCount || 0} Events</div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Focus Events</div>
                <div className="text-white font-bold">{selectedCandidate.focusEventsCount || 0} Events</div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Score &amp; Status</div>
                <div className="text-[#FF9900] font-bold">
                  {selectedCandidate.score} / {selectedCandidate.totalMarks} ({selectedCandidate.percentage}%) • {selectedCandidate.status}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="font-bold text-white">Integrity Rating:</div>
              <div
                className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-block ${
                  selectedCandidate.integrityRating === 'NORMAL'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : selectedCandidate.integrityRating === 'ATTENTION'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {selectedCandidate.integrityRating || 'NORMAL'}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                Integrity signals are technical observations for proctor interpretation and not automated proofs of cheating.
              </p>
            </div>

            <button
              onClick={() => setIsReportOpen(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Close Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
