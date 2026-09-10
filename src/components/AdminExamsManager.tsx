'use client';

import { useState, useEffect, useCallback } from 'react';
import { Exam, ExamAttempt, Question } from '@/types/exam';

interface AdminExamsManagerProps {
  token: string | null;
}

export default function AdminExamsManager({ token }: AdminExamsManagerProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [liveData, setLiveData] = useState<{
    exam: Exam | null;
    stats: any;
    candidates: any[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal States
  const [inspectAttemptId, setInspectAttemptId] = useState<string | null>(null);
  const [inspectData, setInspectData] = useState<any>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Partial<Exam> | null>(null);
  const [isExtendingTimeId, setIsExtendingTimeId] = useState<string | null>(null);
  const [extendMinutes, setExtendMinutes] = useState(5);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Exams List
  const fetchExams = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/exams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.exams) {
        setExams(data.exams);
        if (!selectedExamId && data.exams.length > 0) {
          setSelectedExamId(data.exams[0].id);
        }
      }
    } catch (e) {
      console.error('Fetch exams error:', e);
    }
  }, [token, selectedExamId]);

  // Fetch Live Exam Control Feed
  const fetchLiveData = useCallback(async () => {
    if (!token) return;
    try {
      const url = selectedExamId
        ? `/api/admin/exams/live?examId=${encodeURIComponent(selectedExamId)}`
        : '/api/admin/exams/live';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setLiveData(data);
      }
    } catch (e) {
      console.error('Fetch live exam data error:', e);
    } finally {
      setLoading(false);
    }
  }, [token, selectedExamId]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    fetchLiveData();
  }, [fetchLiveData]);

  // Live polling interval
  useEffect(() => {
    if (!autoRefresh || !token) return;
    const interval = setInterval(() => {
      fetchLiveData();
    }, 2500);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLiveData, token]);

  // Execute Control Action
  const handleControlAction = async (
    action: string,
    payload: { candidateId?: string; candidateIds?: string[]; minutes?: number; notes?: string } = {}
  ) => {
    if (!token) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/exams/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          examId: selectedExamId,
          ...payload
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed.');

      showToast(`Action "${action}" completed successfully.`, 'success');
      await fetchLiveData();
      setSelectedCandidateIds([]);
    } catch (err: any) {
      showToast(err.message || 'Action execution failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Inspect Attempt Details
  const handleInspectAttempt = async (attemptId: string) => {
    if (!token) return;
    setInspectAttemptId(attemptId);
    setInspectLoading(true);

    try {
      const res = await fetch(`/api/admin/exams/attempt-details?attemptId=${encodeURIComponent(attemptId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setInspectData(data);
      }
    } catch (e) {
      console.error('Inspect attempt failed:', e);
    } finally {
      setInspectLoading(false);
    }
  };

  // Save Exam (Create / Update)
  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingExam) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: editingExam.id ? 'update' : 'create',
          exam: editingExam
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save exam.');

      showToast('Exam saved successfully.', 'success');
      setIsExamModalOpen(false);
      setEditingExam(null);
      await fetchExams();
      await fetchLiveData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save exam.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Exam
  const handleDeleteExam = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam? All associated questions will be removed.')) return;
    if (!token) return;

    try {
      const res = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'delete', examId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed.');

      showToast('Exam deleted.', 'success');
      setSelectedExamId('');
      await fetchExams();
      await fetchLiveData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete exam.', 'error');
    }
  };

  // Format Time Helper
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Filter candidates
  const candidates = liveData?.candidates || [];
  const filteredCandidates = candidates.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.studentName?.toLowerCase().includes(q) ||
      c.rollNumber?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'All') return true;
    if (statusFilter === 'Locked') return c.status === 'LOCKED';
    if (statusFilter === 'Verified') return c.status === 'VERIFIED';
    if (statusFilter === 'Unlocked') return c.status === 'UNLOCKED';
    if (statusFilter === 'In Exam') return c.status === 'IN_EXAM';
    if (statusFilter === 'Submitted') return c.status === 'SUBMITTED' || c.status === 'REVIEW_REQUIRED';
    if (statusFilter === 'Passed') return c.passed;
    if (statusFilter === 'Failed') return (c.status === 'SUBMITTED' || c.status === 'REVIEW_REQUIRED') && !c.passed;
    if (statusFilter === 'Review Required') return c.status === 'REVIEW_REQUIRED';
    if (statusFilter === 'Violations') return (c.securityViolationsCount || 0) > 0;
    return true;
  });

  const currentExam = exams.find((e) => e.id === selectedExamId) || exams[0];
  const stats = liveData?.stats || {
    totalCandidates: 0,
    waiting: 0,
    verified: 0,
    unlocked: 0,
    inExam: 0,
    submitted: 0,
    passed: 0,
    failed: 0,
    securityViolations: 0,
    reviewRequired: 0
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold text-white flex items-center space-x-2 animate-slide-in ${
            toastMessage.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          <span>{toastMessage.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header & Exam Switcher */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-lg font-bold text-[#111827] font-display">Live Exam Control Center</h2>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded border border-indigo-200">
                PROCTOR ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time candidate verification, unlock control, authoritative timer monitoring, and results.
            </p>
          </div>

          {/* Exam Selector & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-[#FF9900]"
            >
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.examCode})
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                if (currentExam) {
                  setEditingExam(JSON.parse(JSON.stringify(currentExam)));
                  setIsExamModalOpen(true);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition"
            >
              ✏️ Edit Questions
            </button>

            <button
              onClick={() => {
                setEditingExam({
                  title: 'New AWS Certification Mock',
                  examCode: 'AWS-MOCK-02',
                  password: 'aws-exam-pass',
                  description: 'Assessment description',
                  category: 'Cloud Architecture',
                  durationMinutes: 30,
                  passingPercentage: 70,
                  maxAttempts: 1,
                  status: 'Live',
                  requireSecureBrowser: true,
                  maxSecurityViolations: 3,
                  questions: [
                    {
                      id: 'q-1',
                      question: 'Sample question text?',
                      options: ['Option A', 'Option B', 'Option C', 'Option D'],
                      correctOptionIndex: 0,
                      marks: 10,
                      explanation: 'Explanation for correct answer.'
                    }
                  ]
                });
                setIsExamModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold transition shadow-sm"
            >
              ➕ Create Exam
            </button>

            {currentExam && (
              <a
                href={`/api/exam/seb-config?examId=${encodeURIComponent(currentExam.id)}`}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition"
                title="Download Safe Exam Browser (.seb) config"
              >
                🔒 SEB Config
              </a>
            )}

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                autoRefresh
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
            >
              {autoRefresh ? '⚡ Live Sync ON' : '⏸ Paused'}
            </button>
          </div>
        </div>

        {/* Selected Exam Meta Banner */}
        {currentExam && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-600">
            <div className="flex items-center space-x-4">
              <div>
                <span className="text-slate-400">Exam Password: </span>
                <span className="font-mono font-bold text-slate-800">{currentExam.password || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-400">Duration: </span>
                <span className="font-bold text-slate-800">{currentExam.durationMinutes} mins</span>
              </div>
              <div>
                <span className="text-slate-400">Passing: </span>
                <span className="font-bold text-slate-800">{currentExam.passingPercentage}%</span>
              </div>
              <div>
                <span className="text-slate-400">Questions: </span>
                <span className="font-bold text-slate-800">{currentExam.questions?.length || 0}</span>
              </div>
            </div>
            <div>
              <span className="text-slate-400">Direct Student Link: </span>
              <a
                href={`/exam/${currentExam.id}`}
                target="_blank"
                className="text-indigo-600 font-mono hover:underline font-medium"
              >
                /exam/{currentExam.id} ↗
              </a>
            </div>
          </div>
        )}
      </div>

      {/* 2. STATS BAR (9 Cards) */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
        <div
          onClick={() => setStatusFilter('All')}
          className={`bg-white border rounded-xl p-3 text-center cursor-pointer transition ${
            statusFilter === 'All' ? 'ring-2 ring-[#FF9900] border-[#FF9900]' : 'border-[#E2E8F0] hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-slate-400">Total</div>
          <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">{stats.totalCandidates}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Locked')}
          className={`bg-white border rounded-xl p-3 text-center cursor-pointer transition ${
            statusFilter === 'Locked' ? 'ring-2 ring-amber-500 border-amber-500' : 'border-[#E2E8F0] hover:border-amber-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-amber-600">Waiting</div>
          <div className="text-lg font-bold text-amber-600 font-mono mt-0.5">{stats.waiting}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Verified')}
          className={`bg-white border rounded-xl p-3 text-center cursor-pointer transition ${
            statusFilter === 'Verified' ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-[#E2E8F0] hover:border-indigo-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-indigo-600">Verified</div>
          <div className="text-lg font-bold text-indigo-600 font-mono mt-0.5">{stats.verified}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Unlocked')}
          className={`bg-white border rounded-xl p-3 text-center cursor-pointer transition ${
            statusFilter === 'Unlocked' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-[#E2E8F0] hover:border-emerald-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-emerald-600">Unlocked</div>
          <div className="text-lg font-bold text-emerald-600 font-mono mt-0.5">{stats.unlocked}</div>
        </div>

        <div
          onClick={() => setStatusFilter('In Exam')}
          className={`bg-white border rounded-xl p-3 text-center cursor-pointer transition ${
            statusFilter === 'In Exam' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-[#E2E8F0] hover:border-blue-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-blue-600">In Exam</div>
          <div className="text-lg font-bold text-blue-600 font-mono mt-0.5">{stats.inExam}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Submitted')}
          className={`bg-white border rounded-xl p-3 text-center cursor-pointer transition ${
            statusFilter === 'Submitted' ? 'ring-2 ring-purple-500 border-purple-500' : 'border-[#E2E8F0] hover:border-purple-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-purple-600">Submitted</div>
          <div className="text-lg font-bold text-purple-600 font-mono mt-0.5">{stats.submitted}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Passed')}
          className={`bg-white border rounded-xl p-3 text-center cursor-pointer transition ${
            statusFilter === 'Passed' ? 'ring-2 ring-emerald-600 border-emerald-600' : 'border-[#E2E8F0] hover:border-emerald-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-emerald-700">Passed</div>
          <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">{stats.passed}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Failed')}
          className={`bg-white border rounded-xl p-3 text-center cursor-pointer transition ${
            statusFilter === 'Failed' ? 'ring-2 ring-rose-500 border-rose-500' : 'border-[#E2E8F0] hover:border-rose-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-rose-600">Failed</div>
          <div className="text-lg font-bold text-rose-600 font-mono mt-0.5">{stats.failed}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Violations')}
          className={`bg-white border rounded-xl p-3 text-center cursor-pointer transition ${
            statusFilter === 'Violations' ? 'ring-2 ring-rose-600 border-rose-600' : 'border-[#E2E8F0] hover:border-rose-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-rose-600">Violations</div>
          <div className="text-lg font-bold text-rose-600 font-mono mt-0.5">{stats.securityViolations}</div>
        </div>
      </div>

      {/* 3. BULK ACTIONS & SEARCH TOOLBAR */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search & Filter */}
          <div className="flex items-center space-x-2 flex-grow max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, roll no, email..."
              className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-slate-50 focus:ring-1 focus:ring-[#FF9900]"
            />
          </div>

          {/* Bulk Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleControlAction('unlock-all')}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-50"
            >
              🔓 Unlock All in Lobby ({stats.waiting + stats.verified})
            </button>

            <button
              onClick={() => handleControlAction('start-all')}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-50"
            >
              🚀 Start All Unlocked ({stats.unlocked})
            </button>

            {selectedCandidateIds.length > 0 && (
              <>
                <button
                  onClick={() => handleControlAction('bulk-unlock', { candidateIds: selectedCandidateIds })}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition"
                >
                  Unlock Selected ({selectedCandidateIds.length})
                </button>

                <button
                  onClick={() => handleControlAction('start-selected', { candidateIds: selectedCandidateIds })}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
                >
                  Start Selected ({selectedCandidateIds.length})
                </button>
              </>
            )}

            <a
              href={`/api/admin/exams/export?examId=${encodeURIComponent(selectedExamId)}`}
              download
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition"
            >
              📥 Export CSV
            </a>
          </div>
        </div>
      </div>

      {/* 4. CANDIDATES TABLE */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-[#E2E8F0] text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={
                      filteredCandidates.length > 0 &&
                      selectedCandidateIds.length === filteredCandidates.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCandidateIds(filteredCandidates.map((c) => c.id));
                      } else {
                        setSelectedCandidateIds([]);
                      }
                    }}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="p-3">Candidate</th>
                <th className="p-3">Roll / Student ID</th>
                <th className="p-3">Status</th>
                <th className="p-3">Remaining Time</th>
                <th className="p-3">Score / Result</th>
                <th className="p-3">Security Logs</th>
                <th className="p-3">Submission</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No candidates found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((candidate) => {
                  const isSelected = selectedCandidateIds.includes(candidate.id);
                  const isLocked = candidate.status === 'LOCKED';
                  const isVerified = candidate.status === 'VERIFIED';
                  const isUnlocked = candidate.status === 'UNLOCKED';
                  const isInExam = candidate.status === 'IN_EXAM';
                  const isSubmitted = candidate.status === 'SUBMITTED';
                  const isReviewRequired = candidate.status === 'REVIEW_REQUIRED';

                  let statusBadgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
                  if (isLocked) statusBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
                  if (isVerified) statusBadgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold';
                  if (isUnlocked) statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
                  if (isInExam) statusBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200 font-bold animate-pulse';
                  if (isSubmitted) statusBadgeClass = candidate.passed ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' : 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
                  if (isReviewRequired) statusBadgeClass = 'bg-rose-600 text-white border-rose-700 font-bold';

                  return (
                    <tr key={candidate.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCandidateIds([...selectedCandidateIds, candidate.id]);
                            } else {
                              setSelectedCandidateIds(selectedCandidateIds.filter((id) => id !== candidate.id));
                            }
                          }}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="p-3 font-medium text-slate-900">
                        <div>{candidate.studentName}</div>
                        <div className="text-[10px] text-slate-400">{candidate.email}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-800 font-semibold uppercase">
                        {candidate.rollNumber}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] border ${statusBadgeClass}`}>
                          {candidate.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700">
                        {isInExam ? (
                          <span
                            className={
                              candidate.remainingSeconds < 180
                                ? 'text-rose-600 animate-pulse'
                                : candidate.remainingSeconds < 600
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }
                          >
                            ⏱ {formatTime(candidate.remainingSeconds)}
                          </span>
                        ) : isSubmitted || isReviewRequired ? (
                          <span className="text-slate-400 font-normal">Completed</span>
                        ) : (
                          <span className="text-slate-400 font-normal">Not Started</span>
                        )}
                      </td>
                      <td className="p-3">
                        {isSubmitted || isReviewRequired ? (
                          <div>
                            <span className={`font-bold font-mono ${candidate.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {candidate.score} / {candidate.totalMarks} ({candidate.percentage}%)
                            </span>
                            <div className="text-[10px]">
                              {candidate.passed ? (
                                <span className="text-emerald-700 font-semibold">✓ PASSED</span>
                              ) : (
                                <span className="text-rose-600 font-semibold">✕ FAILED</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">
                            {candidate.answeredCount || 0} / {candidate.totalQuestions || 0} ans
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {(candidate.securityViolationsCount || 0) > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px]">
                            ⚠️ {candidate.securityViolationsCount} violations
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-[10px]">✓ Clean</span>
                        )}
                      </td>
                      <td className="p-3 text-[10px] text-slate-500 uppercase">
                        {candidate.submissionReason || '—'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {isLocked && (
                            <>
                              <button
                                onClick={() => handleControlAction('verify', { candidateId: candidate.id })}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-semibold border border-indigo-200"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => handleControlAction('unlock', { candidateId: candidate.id })}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-semibold border border-emerald-200"
                              >
                                Unlock
                              </button>
                            </>
                          )}

                          {isVerified && (
                            <button
                              onClick={() => handleControlAction('unlock', { candidateId: candidate.id })}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold"
                            >
                              Unlock
                            </button>
                          )}

                          {isUnlocked && (
                            <>
                              <button
                                onClick={() => handleControlAction('start', { candidateId: candidate.id })}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold"
                              >
                                Start
                              </button>
                              <button
                                onClick={() => handleControlAction('lock', { candidateId: candidate.id })}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold border border-slate-300"
                              >
                                Lock
                              </button>
                            </>
                          )}

                          {isInExam && (
                            <>
                              <button
                                onClick={() => {
                                  setIsExtendingTimeId(candidate.id);
                                }}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-[11px] font-semibold border border-amber-200"
                              >
                                +Time
                              </button>
                              <button
                                onClick={() => handleControlAction('force-submit', { candidateId: candidate.id })}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold"
                              >
                                Force Submit
                              </button>
                            </>
                          )}

                          {(isSubmitted || isReviewRequired) && (
                            <button
                              onClick={() => {
                                const note = prompt('Enter selection notes (optional):', 'Selected & Qualified by Proctor');
                                if (note !== null) {
                                  handleControlAction('mark-selected', { candidateId: candidate.id, notes: note });
                                }
                              }}
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[11px] font-semibold border border-purple-200"
                              title="Mark candidate as Selected/Qualified and send selection email"
                            >
                              Select & Notify
                            </button>
                          )}

                          <button
                            onClick={() => handleInspectAttempt(candidate.id)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold border border-slate-300"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EXTEND TIME MODAL */}
      {isExtendingTimeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Extend Candidate Exam Time</h3>
            <p className="text-xs text-slate-500">
              Add extra minutes to the authoritative server-side timer for this candidate.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Minutes to add:</label>
              <select
                value={extendMinutes}
                onChange={(e) => setExtendMinutes(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
              >
                <option value={2}>+2 minutes</option>
                <option value={5}>+5 minutes</option>
                <option value={10}>+10 minutes</option>
                <option value={15}>+15 minutes</option>
                <option value={30}>+30 minutes</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsExtendingTimeId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleControlAction('extend-time', {
                    candidateId: isExtendingTimeId,
                    minutes: extendMinutes
                  });
                  setIsExtendingTimeId(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                Apply Extension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANDIDATE INSPECT MODAL */}
      {inspectAttemptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Candidate Examination Report
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectData?.attempt?.studentName} • {inspectData?.attempt?.rollNumber}
                </p>
              </div>
              <button
                onClick={() => {
                  setInspectAttemptId(null);
                  setInspectData(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {inspectLoading ? (
              <div className="p-8 text-center text-slate-400">Loading audit data…</div>
            ) : inspectData ? (
              <div className="space-y-6 text-xs">
                {/* Score & Metadata Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <div>
                    <div className="text-slate-400 uppercase text-[10px]">Status</div>
                    <div className="font-bold text-slate-800 mt-0.5">{inspectData.attempt.status}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase text-[10px]">Score</div>
                    <div className="font-bold font-mono text-slate-800 mt-0.5">
                      {inspectData.attempt.score} / {inspectData.attempt.totalMarks} ({inspectData.attempt.percentage}%)
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase text-[10px]">Result</div>
                    <div
                      className={`font-bold mt-0.5 ${
                        inspectData.attempt.passed ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {inspectData.attempt.passed ? 'PASSED' : 'FAILED'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase text-[10px]">Violations</div>
                    <div
                      className={`font-bold mt-0.5 ${
                        (inspectData.attempt.securityViolationsCount || 0) > 0
                          ? 'text-rose-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {inspectData.attempt.securityViolationsCount || 0}
                    </div>
                  </div>
                </div>

                {/* Candidate Selection & Qualification Notification Action */}
                {(inspectData.attempt.status === 'SUBMITTED' || inspectData.attempt.status === 'REVIEW_REQUIRED') && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-purple-50 border border-purple-200">
                    <div>
                      <div className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                        <span>🌟</span> Candidate Qualification & Selection Email
                      </div>
                      <div className="text-[11px] text-purple-700 mt-0.5">
                        {inspectData.attempt.adminNotes
                          ? `Recorded Note: "${inspectData.attempt.adminNotes}"`
                          : 'Candidate has completed server-side evaluation. Send an official qualification email.'}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const note = prompt(
                          'Enter selection notes or next steps for candidate email:',
                          inspectData.attempt.adminNotes || 'Selected & Qualified by AWS SBG Evaluation Committee'
                        );
                        if (note !== null) {
                          await handleControlAction('mark-selected', {
                            candidateId: inspectData.attempt.id,
                            notes: note
                          });
                          await handleInspectAttempt(inspectData.attempt.id);
                        }
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-sm transition whitespace-nowrap"
                    >
                      ✉️ Send Selection Email
                    </button>
                  </div>
                )}

                {/* Question-by-Question Breakdown */}
                <div className="space-y-3">
                  <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Questions & Responses Breakdown:
                  </div>

                  <div className="space-y-3">
                    {inspectData.questionsBreakdown?.map((q: any) => (
                      <div
                        key={q.id}
                        className={`p-4 rounded-xl border ${
                          !q.isAnswered
                            ? 'bg-slate-50 border-slate-200'
                            : q.isCorrect
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : 'bg-rose-50/50 border-rose-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-bold text-slate-900">
                            Q{q.number}: {q.question}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              !q.isAnswered
                                ? 'bg-slate-200 text-slate-600'
                                : q.isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            {!q.isAnswered ? 'Unanswered' : q.isCorrect ? 'Correct (+10)' : 'Incorrect (0)'}
                          </span>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {q.options?.map((optText: string, oIdx: number) => {
                            const isCorrectOpt = oIdx === q.correctOptionIndex;
                            const isStudentSelected = oIdx === q.studentSelectedOptionIndex;

                            let optClass = 'bg-white border-slate-200 text-slate-600';
                            if (isCorrectOpt && isStudentSelected) {
                              optClass = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold';
                            } else if (isCorrectOpt) {
                              optClass = 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold';
                            } else if (isStudentSelected) {
                              optClass = 'bg-rose-100 border-rose-400 text-rose-900 font-bold';
                            }

                            return (
                              <div key={oIdx} className={`p-2 rounded-lg border text-[11px] flex items-center space-x-2 ${optClass}`}>
                                <span className="font-mono font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                                <span>{optText}</span>
                                {isStudentSelected && <span className="ml-auto text-[10px] uppercase font-bold">(Selected)</span>}
                                {isCorrectOpt && !isStudentSelected && <span className="ml-auto text-[10px] text-emerald-600 font-bold">(Key)</span>}
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <div className="mt-2 text-[10px] text-slate-500 italic">
                            Explanation: {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Security Event Timeline */}
                <div className="space-y-2 border-t border-slate-200 pt-4">
                  <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Security Events Timeline ({inspectData.securityEvents?.length || 0}):
                  </div>
                  {inspectData.securityEvents?.length === 0 ? (
                    <div className="text-slate-400 italic">No security events logged for this attempt.</div>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {inspectData.securityEvents?.map((ev: any) => (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px]"
                        >
                          <span className="font-semibold">{ev.eventType}</span>
                          <span className="text-slate-500 font-mono text-[10px]">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* EXAM CREATOR / EDITOR MODAL */}
      {isExamModalOpen && editingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-base font-bold text-slate-900 font-display">
                {editingExam.id ? 'Edit Examination & Questions' : 'Create New Examination'}
              </h3>
              <button
                onClick={() => {
                  setIsExamModalOpen(false);
                  setEditingExam(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Exam Title</label>
                  <input
                    type="text"
                    required
                    value={editingExam.title || ''}
                    onChange={(e) => setEditingExam({ ...editingExam, title: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Exam Code</label>
                  <input
                    type="text"
                    required
                    value={editingExam.examCode || ''}
                    onChange={(e) => setEditingExam({ ...editingExam, examCode: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Exam Password</label>
                  <input
                    type="text"
                    required
                    value={editingExam.password || ''}
                    onChange={(e) => setEditingExam({ ...editingExam, password: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    min={5}
                    value={editingExam.durationMinutes || 30}
                    onChange={(e) => setEditingExam({ ...editingExam, durationMinutes: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Passing Percentage (%)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={editingExam.passingPercentage || 70}
                    onChange={(e) => setEditingExam({ ...editingExam, passingPercentage: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    Questions ({editingExam.questions?.length || 0})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newQ: Question = {
                        id: `q-${Date.now()}`,
                        question: 'Enter new question text...',
                        options: ['Option A', 'Option B', 'Option C', 'Option D'],
                        correctOptionIndex: 0,
                        marks: 10,
                        explanation: ''
                      };
                      setEditingExam({
                        ...editingExam,
                        questions: [...(editingExam.questions || []), newQ]
                      });
                    }}
                    className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200"
                  >
                    ➕ Add Question
                  </button>
                </div>

                <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                  {editingExam.questions?.map((q, qIdx) => (
                    <div key={q.id || qIdx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">Question #{qIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (editingExam.questions || []).filter((_, idx) => idx !== qIdx);
                            setEditingExam({ ...editingExam, questions: updated });
                          }}
                          className="text-rose-600 hover:text-rose-800 text-xs font-semibold"
                        >
                          Remove
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Question prompt..."
                        value={q.question}
                        onChange={(e) => {
                          const updated = [...(editingExam.questions || [])];
                          updated[qIdx].question = e.target.value;
                          setEditingExam({ ...editingExam, questions: updated });
                        }}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options?.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`correct_${qIdx}`}
                              checked={q.correctOptionIndex === oIdx}
                              onChange={() => {
                                const updated = [...(editingExam.questions || [])];
                                updated[qIdx].correctOptionIndex = oIdx;
                                setEditingExam({ ...editingExam, questions: updated });
                              }}
                              className="text-emerald-600"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const updated = [...(editingExam.questions || [])];
                                updated[qIdx].options[oIdx] = e.target.value;
                                setEditingExam({ ...editingExam, questions: updated });
                              }}
                              className="w-full p-1.5 border border-slate-300 rounded-lg text-xs"
                            />
                          </div>
                        ))}
                      </div>

                      <input
                        type="text"
                        placeholder="Answer explanation / reference note..."
                        value={q.explanation || ''}
                        onChange={(e) => {
                          const updated = [...(editingExam.questions || [])];
                          updated[qIdx].explanation = e.target.value;
                          setEditingExam({ ...editingExam, questions: updated });
                        }}
                        className="w-full p-1.5 border border-slate-200 rounded-lg text-xs italic text-slate-600"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                {editingExam.id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteExam(editingExam.id!)}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg border border-rose-200"
                  >
                    Delete Exam
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExamModalOpen(false);
                      setEditingExam(null);
                    }}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white font-bold rounded-lg shadow-sm"
                  >
                    {actionLoading ? 'Saving…' : 'Save Examination'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
