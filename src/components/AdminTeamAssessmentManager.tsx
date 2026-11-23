'use client';

import React, { useState, useEffect } from 'react';
import {
  TeamWorkAssessment,
  TeamAssessmentPeriod,
  TeamAssessmentSummaryStats,
  EvidenceVerificationStatus,
  MemberFinalStatus
} from '@/types/teamAssessment';

interface AdminTeamAssessmentManagerProps {
  token?: string | null;
}

export default function AdminTeamAssessmentManager({ token }: AdminTeamAssessmentManagerProps) {
  const activeToken =
    token ||
    (typeof window !== 'undefined'
      ? sessionStorage.getItem('adminToken') ||
        sessionStorage.getItem('admin_token') ||
        localStorage.getItem('adminToken') ||
        localStorage.getItem('admin_token')
      : '') ||
    '';
  const [subTab, setSubTab] = useState<'assessments' | 'periods'>('assessments');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Data State
  const [metrics, setMetrics] = useState<TeamAssessmentSummaryStats>({
    totalAssessed: 0,
    completedReviews: 0,
    pendingReviews: 0,
    activeContributors: 0,
    strongPerformers: 0,
    needsImprovement: 0,
    inactiveMembers: 0,
    averageContributionScore: 0,
    averageCompletionRate: 0
  });
  const [periods, setPeriods] = useState<TeamAssessmentPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('All');
  const [assessments, setAssessments] = useState<TeamWorkAssessment[]>([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Detail / Review Modal State
  const [selectedAssessment, setSelectedAssessment] = useState<TeamWorkAssessment | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [adminScores, setAdminScores] = useState({
    workCompletionScore: 8,
    qualityScore: 8,
    ownershipScore: 8,
    consistencyScore: 8,
    communicationScore: 8,
    initiativeScore: 8,
    overallScore: 8,
    adminFeedback: '',
    finalStatus: 'Active' as MemberFinalStatus,
    isPublishedToMember: false
  });
  const [savingReview, setSavingReview] = useState(false);
  const [evidenceNotes, setEvidenceNotes] = useState<Record<string, string>>({});

  // Delete Assessment Modal State
  const [assessmentToDelete, setAssessmentToDelete] = useState<TeamWorkAssessment | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [requiresTypedConfirmation, setRequiresTypedConfirmation] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  // Period Edit Modal
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<any>({
    title: '',
    description: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    deadline: new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10),
    status: 'Active',
    eligibleMembers: []
  });
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Technical Contributor');
  const [newMemberDomain, setNewMemberDomain] = useState('Cloud Architecture');

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedPeriodId && selectedPeriodId !== 'All') params.set('periodId', selectedPeriodId);
      if (domainFilter && domainFilter !== 'All') params.set('domain', domainFilter);
      if (roleFilter && roleFilter !== 'All') params.set('role', roleFilter);
      if (statusFilter && statusFilter !== 'All') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/team-assessment?${params.toString()}`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
        setPeriods(data.periods || []);
        setAssessments(data.assessments || []);
      }
    } catch (err) {
      console.error('Failed to fetch team assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPeriodId, domainFilter, roleFilter, statusFilter]);

  // Open Detail / Review Modal
  const openDetailModal = (ass: TeamWorkAssessment) => {
    setSelectedAssessment(ass);
    setIsDetailModalOpen(true);
    const existing = ass.adminReview;
    setAdminScores({
      workCompletionScore: existing?.workCompletionScore ?? 8,
      qualityScore: existing?.qualityScore ?? 8,
      ownershipScore: existing?.ownershipScore ?? 8,
      consistencyScore: existing?.consistencyScore ?? 8,
      communicationScore: existing?.communicationScore ?? 8,
      initiativeScore: existing?.initiativeScore ?? 8,
      overallScore: existing?.overallScore ?? 8,
      adminFeedback: existing?.adminFeedback || '',
      finalStatus: existing?.finalStatus || 'Active',
      isPublishedToMember: existing?.isPublishedToMember || false
    });
  };

  // Save Admin Review
  const handleSaveReview = async () => {
    if (!selectedAssessment) return;
    try {
      setSavingReview(true);
      const res = await fetch('/api/admin/team-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          action: 'save-review',
          assessmentId: selectedAssessment.id,
          review: adminScores
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save review.');
      }

      setActionMessage('Admin evaluation scores and feedback saved successfully.');
      setTimeout(() => setActionMessage(null), 3500);
      setIsDetailModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Error saving review.');
      setTimeout(() => setActionError(null), 4000);
    } finally {
      setSavingReview(false);
    }
  };

  // Verify Evidence Item
  const handleVerifyEvidence = async (evidenceItemId: string, verificationStatus: EvidenceVerificationStatus) => {
    if (!selectedAssessment) return;
    try {
      const notes = evidenceNotes[evidenceItemId] || '';
      const res = await fetch('/api/admin/team-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          action: 'verify-evidence',
          assessmentId: selectedAssessment.id,
          evidenceItemId,
          verificationStatus,
          adminNotes: notes
        })
      });

      const data = await res.json();
      if (data.success && selectedAssessment.completedTasks) {
        const updated = selectedAssessment.completedTasks.map(t =>
          t.id === evidenceItemId ? { ...t, verificationStatus, adminNotes: notes } : t
        );
        setSelectedAssessment({ ...selectedAssessment, completedTasks: updated });
      }
    } catch (err) {
      console.error('Evidence verification error:', err);
    }
  };

  // Open Delete Confirmation Modal
  const openDeleteModal = (ass: TeamWorkAssessment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAssessmentToDelete(ass);
    setDeleteConfirmInput('');
    setDeleteReason('');
    setIsDeleteModalOpen(true);
  };

  // Permanently Delete Assessment
  const handleDeleteAssessment = async () => {
    if (!assessmentToDelete) return;

    if (requiresTypedConfirmation) {
      const expected = assessmentToDelete.memberName.trim().toLowerCase();
      const actual = deleteConfirmInput.trim().toLowerCase();
      if (actual !== expected) {
        setActionError(`Please type "${assessmentToDelete.memberName}" exactly to confirm deletion.`);
        setTimeout(() => setActionError(null), 4000);
        return;
      }
    }

    try {
      setIsDeleting(true);
      const res = await fetch('/api/admin/team-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          action: 'delete-assessment',
          assessmentId: assessmentToDelete.id,
          reason: deleteReason.trim() || 'Admin deleted from management dashboard'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete assessment.');
      }

      setActionMessage(`Assessment for "${assessmentToDelete.memberName}" was permanently deleted.`);
      setTimeout(() => setActionMessage(null), 4000);
      setIsDeleteModalOpen(false);
      setAssessmentToDelete(null);
      if (selectedAssessment?.id === assessmentToDelete.id) {
        setIsDetailModalOpen(false);
        setSelectedAssessment(null);
      }
      await fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Error deleting assessment.');
      setTimeout(() => setActionError(null), 4500);
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const params = new URLSearchParams();
    params.set('action', 'export-csv');
    if (selectedPeriodId && selectedPeriodId !== 'All') params.set('periodId', selectedPeriodId);
    if (domainFilter && domainFilter !== 'All') params.set('domain', domainFilter);
    if (statusFilter && statusFilter !== 'All') params.set('status', statusFilter);

    window.open(`/api/admin/team-assessment?${params.toString()}`, '_blank');
  };

  // Period Save
  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/team-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          action: 'save-period',
          period: editingPeriod
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsPeriodModalOpen(false);
        setActionMessage('Assessment period saved.');
        setTimeout(() => setActionMessage(null), 3000);
        await fetchData();
      }
    } catch (err: any) {
      setActionError(err.message || 'Error saving period.');
    }
  };

  const addEligibleMember = () => {
    if (!newMemberEmail.trim()) return;
    const current = editingPeriod.eligibleMembers || [];
    setEditingPeriod({
      ...editingPeriod,
      eligibleMembers: [
        ...current,
        {
          email: newMemberEmail.trim().toLowerCase(),
          name: newMemberName.trim() || newMemberEmail.split('@')[0],
          role: newMemberRole,
          domain: newMemberDomain,
          isActive: true
        }
      ]
    });
    setNewMemberEmail('');
    setNewMemberName('');
  };

  const removeEligibleMember = (emailToRemove: string) => {
    const current = editingPeriod.eligibleMembers || [];
    setEditingPeriod({
      ...editingPeriod,
      eligibleMembers: current.filter((m: any) => m.email !== emailToRemove)
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Tab Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF9900]"></span>
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">AWS SBG CU-UP</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Team Work & Contribution Review
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate team members based on actual work completed, deadlines, ownership, and deliverable evidence.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            <button
              onClick={() => setSubTab('assessments')}
              className={`px-3 py-1.5 font-bold rounded-lg transition cursor-pointer ${
                subTab === 'assessments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Assessments ({assessments.length})
            </button>
            <button
              onClick={() => setSubTab('periods')}
              className={`px-3 py-1.5 font-bold rounded-lg transition cursor-pointer ${
                subTab === 'periods' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Review Periods ({periods.length})
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <span>✓</span> {actionMessage}
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
          <span>⚠️</span> {actionError}
        </div>
      )}

      {/* SUBTAB 1: ASSESSMENTS LIST & DASHBOARD */}
      {subTab === 'assessments' && (
        <div className="space-y-6">
          {/* Summary Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Total Assessed</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.totalAssessed}</div>
              <span className="text-[11px] text-slate-400 font-mono">Members in active review</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-emerald-600">Active / Strong</span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">{metrics.activeContributors}</div>
              <span className="text-[11px] text-slate-400 font-mono">{metrics.strongPerformers} strong performers</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-amber-600">Pending Review</span>
              <div className="text-2xl font-extrabold text-amber-600 mt-1">{metrics.pendingReviews}</div>
              <span className="text-[11px] text-slate-400 font-mono">{metrics.completedReviews} already scored</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-[#FF9900]">Avg Completion Rate</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.averageCompletionRate}%</div>
              <span className="text-[11px] text-slate-400 font-mono">Avg Score: {metrics.averageContributionScore}/10</span>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Period Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Period</label>
                <select
                  value={selectedPeriodId}
                  onChange={e => setSelectedPeriodId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#FF9900]"
                >
                  <option value="All">All Review Periods</option>
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              {/* Domain Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Domain</label>
                <select
                  value={domainFilter}
                  onChange={e => setDomainFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#FF9900]"
                >
                  <option value="All">All Domains</option>
                  <option value="Cloud Architecture & Backend">Cloud Architecture & Backend</option>
                  <option value="DevOps & SRE">DevOps & SRE</option>
                  <option value="Leadership & Architecture">Leadership & Architecture</option>
                  <option value="Web & Community Platforms">Web & Community Platforms</option>
                  <option value="AI/ML & Generative AI">AI/ML & Generative AI</option>
                  <option value="Events & Operations">Events & Operations</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#FF9900]"
                >
                  <option value="All">All Statuses</option>
                  <option value="Outstanding">Outstanding</option>
                  <option value="Strong Contributor">Strong Contributor</option>
                  <option value="Active">Active</option>
                  <option value="Needs Improvement">Needs Improvement</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Review Required">Review Required</option>
                  <option value="SUBMITTED">SUBMITTED (Unreviewed)</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>

              {/* Search */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Search</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchData()}
                    placeholder="Search by member name, email, or domain..."
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#FF9900]"
                  />
                  <button
                    onClick={fetchData}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Member Assessments Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Domain & Role</th>
                    <th className="py-3 px-4 text-center">Assigned</th>
                    <th className="py-3 px-4 text-center">Completed</th>
                    <th className="py-3 px-4 text-center">Pending</th>
                    <th className="py-3 px-4 text-center">Completion %</th>
                    <th className="py-3 px-4 text-center">Ownership</th>
                    <th className="py-3 px-4 text-center">Overall Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assessments.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 font-medium">
                        No team member assessments found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    assessments.map(a => {
                      const finalStatus = a.adminReview?.finalStatus || (a.status === 'DRAFT' ? 'DRAFT' : 'Review Required');
                      const statusColor = {
                        Outstanding: 'bg-purple-50 text-purple-700 border-purple-200 font-bold',
                        'Strong Contributor': 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
                        Active: 'bg-blue-50 text-blue-700 border-blue-200 font-semibold',
                        'Needs Improvement': 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
                        Inactive: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
                        'Review Required': 'bg-slate-100 text-slate-700 border-slate-300 font-semibold',
                        DRAFT: 'bg-slate-50 text-slate-500 border-slate-200'
                      }[finalStatus] || 'bg-slate-100 text-slate-700 border-slate-200';

                      return (
                        <tr key={a.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{a.memberName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{a.memberEmail}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-800 font-medium">{a.memberDomain}</div>
                            <div className="text-[11px] text-slate-500">{a.memberRole}</div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-slate-700">{a.assignedTasks?.length || 0}</td>
                          <td className="py-3.5 px-4 text-center font-mono text-emerald-600 font-bold">{a.completedTasks?.length || 0}</td>
                          <td className="py-3.5 px-4 text-center font-mono text-amber-600 font-bold">{a.pendingTasks?.length || 0}</td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <div className="w-12 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                                <div
                                  className="bg-emerald-500 h-full rounded-full"
                                  style={{ width: `${Math.min(100, a.completionPercentage || 0)}%` }}
                                ></div>
                              </div>
                              <span className="font-mono font-bold text-slate-800">{a.completionPercentage || 0}%</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="text-[11px] text-slate-600 font-medium">
                              {a.contribution?.ownership || '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {a.adminReview?.overallScore !== undefined ? (
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {a.adminReview.overallScore}/10
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Unscored</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] border ${statusColor}`}>
                              {finalStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openDetailModal(a)}
                                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#FF9900] border border-amber-200 rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                Review & Evaluate →
                              </button>
                              <button
                                onClick={(e) => openDeleteModal(a, e)}
                                title={`Delete assessment for ${a.memberName}`}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                🗑️
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
        </div>
      )}

      {/* SUBTAB 2: REVIEW PERIODS MANAGER */}
      {subTab === 'periods' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Active Review Periods</h3>
              <p className="text-xs text-slate-500">Configure review cycles and manage eligible team rosters.</p>
            </div>
            <button
              onClick={() => {
                setEditingPeriod({
                  id: '',
                  title: '',
                  description: '',
                  startDate: new Date().toISOString().slice(0, 10),
                  endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
                  deadline: new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10),
                  status: 'Active',
                  eligibleMembers: []
                });
                setIsPeriodModalOpen(true);
              }}
              className="px-3.5 py-2 bg-[#FF9900] hover:bg-[#e08800] text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              + Create New Period
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {periods.map(p => (
              <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                      {p.status}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">{p.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Start Date:</span>
                    <span className="font-mono font-medium">{p.startDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Submission Deadline:</span>
                    <span className="font-mono font-medium text-amber-600 font-bold">{p.deadline}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    {p.eligibleMembers?.length || 0} Eligible Members Configured
                  </span>
                  <button
                    onClick={() => {
                      setEditingPeriod(p);
                      setIsPeriodModalOpen(true);
                    }}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    Edit Roster & Dates →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MEMBER DETAIL & REVIEW MODAL */}
      {isDetailModalOpen && selectedAssessment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-start justify-between gap-4 z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold font-mono">
                    {selectedAssessment.status}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ID: {selectedAssessment.id}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedAssessment.memberName}</h3>
                <p className="text-xs text-slate-500">
                  {selectedAssessment.memberRole} • {selectedAssessment.memberDomain} • {selectedAssessment.memberEmail}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openDeleteModal(selectedAssessment)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>🗑️</span> Delete Assessment
                </button>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-slate-800 text-xs">
              {/* SECTION 1: ASSIGNED WORK */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF9900]"></span>
                  1. Assigned Work & Responsibilities ({selectedAssessment.assignedTasks?.length || 0})
                </h4>
                <div className="space-y-2">
                  {selectedAssessment.assignedTasks?.map((t, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap justify-between items-start gap-2">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 text-xs">{t.title}</div>
                        <p className="text-slate-600 text-[11px]">{t.description || 'No description provided.'}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>Role: {t.role}</span>
                          <span>•</span>
                          <span>Deadline: {t.deadline}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-800">
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 2: COMPLETED WORK & EVIDENCE VERIFICATION */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  2. Completed Work & Evidence Verification ({selectedAssessment.completedTasks?.length || 0})
                </h4>
                <div className="space-y-3">
                  {selectedAssessment.completedTasks?.map((c, i) => (
                    <div key={c.id || i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900">{c.taskName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Completed: {c.completionDate}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          c.verificationStatus === 'Verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          c.verificationStatus === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          c.verificationStatus === 'Needs Clarification' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {c.verificationStatus || 'Pending Verification'}
                        </span>
                      </div>

                      <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                        {c.whatWasDone}
                      </p>

                      {c.evidenceUrl && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{c.evidenceType || 'Link'}:</span>
                          <a
                            href={c.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#FF9900] hover:underline font-mono truncate max-w-md inline-block font-semibold"
                          >
                            🔗 {c.evidenceUrl}
                          </a>
                        </div>
                      )}

                      {/* Admin Verification Controls */}
                      <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {(['Verified', 'Needs Clarification', 'Rejected', 'Pending Verification'] as EvidenceVerificationStatus[]).map(st => (
                            <button
                              key={st}
                              onClick={() => handleVerifyEvidence(c.id, st)}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                                c.verificationStatus === st
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {st === 'Verified' ? '✓ Verify' : st === 'Rejected' ? '✕ Reject' : st}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Admin verification notes..."
                          value={evidenceNotes[c.id] !== undefined ? evidenceNotes[c.id] : (c.adminNotes || '')}
                          onChange={e => setEvidenceNotes({ ...evidenceNotes, [c.id]: e.target.value })}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#FF9900]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: PENDING / MISSED WORK */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  3. Pending & Missed Work
                </h4>
                {selectedAssessment.pendingTasks?.map((p, i) => (
                  <div key={i} className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 space-y-1">
                    <div className="font-bold text-slate-900">{p.taskName}</div>
                    <div className="text-slate-600"><span className="font-semibold">Reason:</span> {p.reasonForDelay}</div>
                    <div className="text-slate-600"><span className="font-semibold">Support Needed:</span> {p.supportRequired || 'None'}</div>
                    <div className="text-[10px] text-slate-500 font-mono">New Target: {p.newExpectedCompletionDate}</div>
                  </div>
                ))}
                {selectedAssessment.missedResponsibilities && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-700 block">Reported Missed Responsibilities:</span>
                    <p className="text-slate-600 italic">"{selectedAssessment.missedResponsibilities}"</p>
                  </div>
                )}
              </div>

              {/* SECTION 4: CONTRIBUTION & OWNERSHIP */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  4. Self-Reported Contribution & Ownership
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px]">
                  <div><span className="text-slate-400 block text-[10px]">Independence:</span><span className="font-bold text-slate-800">{selectedAssessment.contribution?.independence}</span></div>
                  <div><span className="text-slate-400 block text-[10px]">Communication:</span><span className="font-bold text-slate-800">{selectedAssessment.contribution?.communication}</span></div>
                  <div><span className="text-slate-400 block text-[10px]">Deadlines:</span><span className="font-bold text-slate-800">{selectedAssessment.contribution?.deadlineConsistency}</span></div>
                  <div><span className="text-slate-400 block text-[10px]">Ownership:</span><span className="font-bold text-slate-800">{selectedAssessment.contribution?.ownership}</span></div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-700 block">Most Valuable Contribution:</span>
                  <p className="text-slate-800">{selectedAssessment.contribution?.mostValuableContribution || 'None reported'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-700 block">Self-Identified Area for Improvement:</span>
                  <p className="text-slate-800">{selectedAssessment.contribution?.areaForImprovement || 'None reported'}</p>
                </div>
              </div>

              {/* SECTION 5: NEXT COMMITMENTS */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  5. Next Commitments
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-1">7-Day Deliverable:</span>
                    <p className="text-slate-700">{selectedAssessment.commitments?.sevenDayCommitment}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-1">30-Day Milestone:</span>
                    <p className="text-slate-700">{selectedAssessment.commitments?.thirtyDayCommitment}</p>
                  </div>
                </div>
              </div>

              {/* ADMIN EVALUATION & SCORING PANEL */}
              <div className="mt-6 p-5 bg-slate-900 text-white rounded-2xl space-y-4 border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="font-extrabold text-base text-[#FF9900]">Administrative Evaluation & Scores (0–10)</h4>
                    <p className="text-xs text-slate-400">Score each dimension objectively based on verified deliverables and evidence.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Calculated Average:</span>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      {(
                        (Number(adminScores.workCompletionScore) +
                          Number(adminScores.qualityScore) +
                          Number(adminScores.ownershipScore) +
                          Number(adminScores.consistencyScore) +
                          Number(adminScores.communicationScore) +
                          Number(adminScores.initiativeScore) +
                          Number(adminScores.overallScore)) /
                        7
                      ).toFixed(1)} / 10
                    </div>
                  </div>
                </div>

                {/* 7 Scoring Dimensions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: 'workCompletionScore', label: '1. Work Completion Rate' },
                    { key: 'qualityScore', label: '2. Quality & Technical Rigor' },
                    { key: 'ownershipScore', label: '3. Ownership & Autonomy' },
                    { key: 'consistencyScore', label: '4. Deadline & Reliability' },
                    { key: 'communicationScore', label: '5. Team Communication' },
                    { key: 'initiativeScore', label: '6. Initiative & Extra Impact' },
                    { key: 'overallScore', label: '7. Overall Working Contribution' }
                  ].map(dim => (
                    <div key={dim.key} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-300">{dim.label}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="1"
                          value={(adminScores as any)[dim.key]}
                          onChange={e => setAdminScores({ ...adminScores, [dim.key]: Number(e.target.value) })}
                          className="w-24 accent-[#FF9900]"
                        />
                        <span className="w-8 text-center font-mono font-bold text-xs bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 text-[#FF9900]">
                          {(adminScores as any)[dim.key]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Final Status Override */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Final Performance Status *</label>
                    <select
                      value={adminScores.finalStatus}
                      onChange={e => setAdminScores({ ...adminScores, finalStatus: e.target.value as MemberFinalStatus })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#FF9900]"
                    >
                      <option value="Outstanding">Outstanding (Top Performer)</option>
                      <option value="Strong Contributor">Strong Contributor</option>
                      <option value="Active">Active (Meeting Expectations)</option>
                      <option value="Needs Improvement">Needs Improvement</option>
                      <option value="Inactive">Inactive / Low Contribution</option>
                      <option value="Review Required">Review Required / Pending</option>
                    </select>
                  </div>

                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adminScores.isPublishedToMember}
                        onChange={e => setAdminScores({ ...adminScores, isPublishedToMember: e.target.checked })}
                        className="rounded border-slate-700 text-[#FF9900] focus:ring-0"
                      />
                      <span>Publish scores and feedback to team member portal</span>
                    </label>
                  </div>
                </div>

                {/* Admin Feedback */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Admin Feedback / Review Comments</label>
                  <textarea
                    value={adminScores.adminFeedback}
                    onChange={e => setAdminScores({ ...adminScores, adminFeedback: e.target.value })}
                    placeholder="Provide constructive feedback, key accomplishments, or required corrections..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF9900]"
                  />
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-800">
                  <button
                    onClick={handleSaveReview}
                    disabled={savingReview}
                    className="px-6 py-2.5 bg-[#FF9900] hover:bg-[#e08800] text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {savingReview ? 'Saving Scores...' : 'Save & Finalize Admin Review ✓'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PERIOD MODAL */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingPeriod.id ? 'Edit Assessment Review Period' : 'Create New Assessment Period'}
              </h3>
              <button
                onClick={() => setIsPeriodModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePeriod} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Period Title *</label>
                <input
                  type="text"
                  value={editingPeriod.title}
                  onChange={e => setEditingPeriod({ ...editingPeriod, title: e.target.value })}
                  placeholder="e.g., Q3/Q4 2026 Milestone & Contribution Review"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#FF9900]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  value={editingPeriod.description}
                  onChange={e => setEditingPeriod({ ...editingPeriod, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#FF9900]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editingPeriod.startDate}
                    onChange={e => setEditingPeriod({ ...editingPeriod, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={editingPeriod.endDate}
                    onChange={e => setEditingPeriod({ ...editingPeriod, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Submission Deadline</label>
                  <input
                    type="date"
                    value={editingPeriod.deadline}
                    onChange={e => setEditingPeriod({ ...editingPeriod, deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Eligible Members List */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <label className="block font-bold text-slate-800">
                  Configured Eligible Team Members ({editingPeriod.eligibleMembers?.length || 0})
                </label>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {editingPeriod.eligibleMembers?.map((m: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{m.name}</span>{' '}
                        <span className="text-slate-500 font-mono">({m.email})</span> —{' '}
                        <span className="text-[#FF9900] font-semibold">{m.domain}</span> ({m.role})
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEligibleMember(m.email)}
                        className="text-rose-500 hover:text-rose-700 font-bold text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add member row */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-700 block text-[11px]">+ Add Member to Review Roster:</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <input
                      type="email"
                      placeholder="Email"
                      value={newMemberEmail}
                      onChange={e => setNewMemberEmail(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={newMemberName}
                      onChange={e => setNewMemberName(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Role (e.g. Lead)"
                      value={newMemberRole}
                      onChange={e => setNewMemberRole(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Domain"
                      value={newMemberDomain}
                      onChange={e => setNewMemberDomain(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addEligibleMember}
                    className="px-3 py-1 bg-slate-900 text-white rounded-lg font-bold text-xs cursor-pointer"
                  >
                    + Add to Roster
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF9900] hover:bg-[#e08800] text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Save Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && assessmentToDelete && (
        <div className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-rose-200 max-w-lg w-full shadow-2xl overflow-hidden">
            {/* Modal Top Banner */}
            <div className="bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent p-6 border-b border-rose-100 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-2xl shrink-0 text-rose-600 shadow-sm">
                ⚠️
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-mono font-bold uppercase tracking-wider">
                    Permanent Deletion
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">ID: {assessmentToDelete.id}</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                  Delete Assessment Record?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This action is permanent and cannot be undone.
                </p>
              </div>
              <button
                onClick={() => {
                  if (!isDeleting) {
                    setIsDeleteModalOpen(false);
                    setAssessmentToDelete(null);
                  }
                }}
                disabled={isDeleting}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm p-1 cursor-pointer disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Target Candidate Summary Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Candidate</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-800">
                    Status: {assessmentToDelete.status}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{assessmentToDelete.memberName}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{assessmentToDelete.memberEmail}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5 font-medium">
                    {assessmentToDelete.memberRole} • {assessmentToDelete.memberDomain}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Assigned Tasks</span>
                    <span className="font-bold text-slate-800 font-mono">{assessmentToDelete.assignedTasks?.length || 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Completed Tasks</span>
                    <span className="font-bold text-emerald-600 font-mono">{assessmentToDelete.completedTasks?.length || 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Completion</span>
                    <span className="font-bold text-slate-800 font-mono">{assessmentToDelete.completionPercentage || 0}%</span>
                  </div>
                </div>
              </div>

              {/* Data Policy & Impact Warning */}
              <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-2xl space-y-1.5 text-rose-900">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <span>🛡️</span> Data & Audit Impact Policy:
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-800/90 leading-relaxed">
                  <li>
                    All submitted tasks, deliverables, evidence links, verification notes, and draft state will be <strong>permanently purged</strong>.
                  </li>
                  <li>
                    Any recorded administrative evaluation scores (0–10) and feedback for this cycle will be <strong>permanently deleted</strong>.
                  </li>
                  <li>
                    An immutable <strong>audit log event</strong> will be recorded with timestamp, IP address, and administrator credentials.
                  </li>
                </ul>
              </div>

              {/* Optional Safeguard Toggle & Input */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">
                    Confirmation Safeguard:
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresTypedConfirmation}
                      onChange={e => setRequiresTypedConfirmation(e.target.checked)}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Require typing candidate name</span>
                  </label>
                </div>

                {requiresTypedConfirmation && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-500">
                      To prevent accidental deletion, type{' '}
                      <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono select-all">
                        {assessmentToDelete.memberName}
                      </span>{' '}
                      below:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmInput}
                      onChange={e => setDeleteConfirmInput(e.target.value)}
                      placeholder={`Type "${assessmentToDelete.memberName}" to confirm`}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-medium placeholder-slate-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Reason for Deletion (Optional Audit Note):
                  </label>
                  <input
                    type="text"
                    value={deleteReason}
                    onChange={e => setDeleteReason(e.target.value)}
                    placeholder="e.g., Duplicate submission reset, Candidate roster change..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-slate-400 placeholder-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setAssessmentToDelete(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 transition cursor-pointer disabled:opacity-50"
              >
                Cancel / Keep Record
              </button>
              <button
                type="button"
                onClick={handleDeleteAssessment}
                disabled={
                  isDeleting ||
                  (requiresTypedConfirmation &&
                    deleteConfirmInput.trim().toLowerCase() !== assessmentToDelete.memberName.trim().toLowerCase())
                }
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Deleting Assessment...</span>
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>Permanently Delete Assessment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
