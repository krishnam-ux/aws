'use client';

import React, { useState, useEffect } from 'react';
import { FoundingMember, FoundingMemberFormConfig, FormQuestion, FormFieldType } from '@/types/foundingMember';

interface AdminFoundingMembersManagerProps {
  token: string | null;
}

const FIELD_TYPE_LABELS: Record<FormFieldType, { name: string; icon: string }> = {
  text: { name: 'Short Text', icon: '🔤' },
  textarea: { name: 'Long Text / Paragraph', icon: '📝' },
  email: { name: 'Email Address', icon: '✉️' },
  phone: { name: 'Phone Number', icon: '📞' },
  number: { name: 'Number', icon: '🔢' },
  dropdown: { name: 'Dropdown Select', icon: '🔽' },
  radio: { name: 'Multiple Choice (Single)', icon: '🔘' },
  checkbox: { name: 'Checkbox (Multi-Select)', icon: '☑️' },
  date: { name: 'Date', icon: '📅' },
  url: { name: 'URL / Link', icon: '🔗' },
  file: { name: 'File Upload', icon: '📁' },
  photo: { name: 'Profile Photo', icon: '📸' }
};

export default function AdminFoundingMembersManager({ token }: AdminFoundingMembersManagerProps) {
  const effectiveToken =
    token ||
    (typeof window !== 'undefined'
      ? sessionStorage.getItem('adminToken') ||
        localStorage.getItem('admin_token') ||
        sessionStorage.getItem('admin_token')
      : null) ||
    'awssbg-admin-session-token-secure-hash';

  // Active Tab: 'directory' vs 'form-builder'
  const [activeTab, setActiveTab] = useState<'directory' | 'form-builder'>('directory');

  // State: Members Directory
  const [members, setMembers] = useState<FoundingMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Submitted' | 'Pending'>('All');
  const [domainFilter, setDomainFilter] = useState<string>('All');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // State: Form Builder
  const [formConfig, setFormConfig] = useState<FoundingMemberFormConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Modals State
  const [viewMember, setViewMember] = useState<FoundingMember | null>(null);
  const [editMember, setEditMember] = useState<FoundingMember | null>(null);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<FoundingMember | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<FormQuestion | null>(null);
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);

  // Form states
  const [newMemberForm, setNewMemberForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    university: 'Chandigarh University',
    courseBranch: '',
    yearSemester: '3rd Year / 6th Sem',
    studentId: '',
    domain: 'Cloud & Infrastructure',
    role: 'Founding Member',
    notes: ''
  });

  const [newQuestionForm, setNewQuestionForm] = useState<{
    id: string;
    type: FormFieldType;
    label: string;
    placeholder: string;
    helpText: string;
    required: boolean;
    enabled: boolean;
    options: string;
    step: number;
  }>({
    id: '',
    type: 'text',
    label: '',
    placeholder: '',
    helpText: '',
    required: false,
    enabled: true,
    options: '',
    step: 4
  });

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${effectiveToken}`
  });

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // 1. Fetch Members Directory
  const loadMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/founding-members', {
        headers: getHeaders(),
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to load founding members.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading founding members', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Form Builder Configuration
  const loadFormConfig = async () => {
    try {
      setLoadingConfig(true);
      const res = await fetch('/api/admin/founding-members/form-config', {
        headers: getHeaders(),
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setFormConfig(data.config || null);
      }
    } catch (err: any) {
      console.error('Failed to load form config:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    loadMembers();
    loadFormConfig();
  }, [effectiveToken]);

  // Copy Single Shared Form Link
  const copySharedFormLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.awssbgcuup.tech';
    const sharedUrl = `${origin}/founding-members/form`;
    navigator.clipboard.writeText(sharedUrl);
    showToast('Single Shared Founding Members Form Link copied to clipboard!');
  };

  // Export CSV
  const exportToCSV = () => {
    if (members.length === 0) {
      showToast('No member records to export', 'info');
      return;
    }

    const headers = [
      'Founding Member ID',
      'Full Name',
      'Email',
      'Phone',
      'University',
      'Course/Branch',
      'Year/Semester',
      'Student ID (UID)',
      'Domain Track',
      'Role',
      'Skills',
      'Experience',
      'LinkedIn',
      'GitHub',
      'Portfolio',
      'Form Submitted',
      'Submission Date',
      'Status'
    ];

    const rows = members.map((m) => [
      `"${m.memberId || ''}"`,
      `"${(m.fullName || m.name || '').replace(/"/g, '""')}"`,
      `"${(m.email || '').replace(/"/g, '""')}"`,
      `"${(m.phone || '').replace(/"/g, '""')}"`,
      `"${(m.university || '').replace(/"/g, '""')}"`,
      `"${(m.courseBranch || '').replace(/"/g, '""')}"`,
      `"${(m.yearSemester || '').replace(/"/g, '""')}"`,
      `"${(m.studentId || '').replace(/"/g, '""')}"`,
      `"${(m.domain || '').replace(/"/g, '""')}"`,
      `"${(m.role || '').replace(/"/g, '""')}"`,
      `"${(m.skills || '').replace(/"/g, '""')}"`,
      `"${(m.experience || '').replace(/"/g, '""')}"`,
      `"${(m.linkedin || '').replace(/"/g, '""')}"`,
      `"${(m.github || '').replace(/"/g, '""')}"`,
      `"${(m.portfolio || '').replace(/"/g, '""')}"`,
      m.formSubmitted ? 'Yes' : 'No',
      m.formSubmittedAt ? `"${new Date(m.formSubmittedAt).toLocaleDateString()}"` : '""',
      `"${m.status || 'Active'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `founding-members-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download PDF Actions
  const downloadSinglePdf = (member: FoundingMember) => {
    const url = `/api/admin/founding-members/pdf?id=${encodeURIComponent(member.id)}`;
    window.open(url, '_blank');
    showToast(`Downloading PDF dossier for ${member.fullName || member.name}...`);
  };

  const downloadSelectedPdf = () => {
    if (selectedMemberIds.length === 0) {
      showToast('Please select at least one founding member to export PDF.', 'info');
      return;
    }
    const idsParam = selectedMemberIds.join(',');
    const url = `/api/admin/founding-members/pdf?ids=${encodeURIComponent(idsParam)}`;
    window.open(url, '_blank');
    showToast(`Generating combined PDF for ${selectedMemberIds.length} members...`);
  };

  const downloadAllPdf = () => {
    if (members.length === 0) {
      showToast('No founding members in directory to export.', 'info');
      return;
    }
    const url = `/api/admin/founding-members/pdf?all=true`;
    window.open(url, '_blank');
    showToast(`Generating official PDF book for all ${members.length} Founding Members...`);
  };

  // Selection handlers
  const toggleSelectMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMemberIds.length === filteredMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(filteredMembers.map((m) => m.id));
    }
  };

  // Member CRUD handlers
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.fullName.trim() || !newMemberForm.email.trim()) {
      showToast('Full Name and Email are required', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/founding-members', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action: 'create', member: newMemberForm })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Founding Member ${newMemberForm.fullName} created with permanent ID ${data.member?.memberId}!`);
        setIsAddModalOpen(false);
        setNewMemberForm({
          fullName: '',
          email: '',
          phone: '',
          university: 'Chandigarh University',
          courseBranch: '',
          yearSemester: '3rd Year / 6th Sem',
          studentId: '',
          domain: 'Cloud & Infrastructure',
          role: 'Founding Member',
          notes: ''
        });
        loadMembers();
      } else {
        showToast(data.error || 'Failed to add founding member', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error adding member', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMember) return;

    try {
      setLoading(true);
      const res = await fetch('/api/admin/founding-members', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          action: 'update',
          memberId: editMember.id,
          member: editMember
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Founding Member ${editMember.fullName || editMember.name} updated!`);
        setEditMember(null);
        loadMembers();
      } else {
        showToast(data.error || 'Failed to update member', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating member', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMemberConfirmed = async () => {
    if (!deleteConfirmMember) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/founding-members', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action: 'delete', memberId: deleteConfirmMember.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Founding Member "${deleteConfirmMember.fullName || deleteConfirmMember.name}" deleted.`);
        setDeleteConfirmMember(null);
        loadMembers();
      } else {
        showToast(data.error || 'Failed to delete member', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error deleting member', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Form Builder Handlers
  const handleToggleFormPublish = async () => {
    if (!formConfig) return;
    const newStatus = formConfig.status === 'Published' ? 'Draft' : 'Published';
    try {
      setLoadingConfig(true);
      const res = await fetch('/api/admin/founding-members/form-config', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action: 'set_status', status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Form status changed to: ${newStatus}`);
        setFormConfig(data.config);
      } else {
        showToast(data.error || 'Failed to update status', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating status', 'error');
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionForm.label.trim()) {
      showToast('Question label is required', 'error');
      return;
    }

    const optionsArray = newQuestionForm.options
      ? newQuestionForm.options.split('\n').map((o) => o.trim()).filter(Boolean)
      : [];

    const questionPayload: Partial<FormQuestion> = {
      type: newQuestionForm.type,
      label: newQuestionForm.label.trim(),
      placeholder: newQuestionForm.placeholder.trim(),
      helpText: newQuestionForm.helpText.trim(),
      required: newQuestionForm.required,
      enabled: newQuestionForm.enabled,
      options: optionsArray,
      step: newQuestionForm.step
    };

    try {
      setLoadingConfig(true);
      const res = await fetch('/api/admin/founding-members/form-config', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action: 'add_question', question: questionPayload })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Question "${newQuestionForm.label}" added to Form Builder!`);
        setIsAddQuestionModalOpen(false);
        setNewQuestionForm({
          id: '',
          type: 'text',
          label: '',
          placeholder: '',
          helpText: '',
          required: false,
          enabled: true,
          options: '',
          step: 4
        });
        setFormConfig(data.config);
      } else {
        showToast(data.error || 'Failed to add question', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error adding question', 'error');
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    try {
      setLoadingConfig(true);
      const res = await fetch('/api/admin/founding-members/form-config', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          action: 'edit_question',
          questionId: editingQuestion.id,
          question: editingQuestion
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Question "${editingQuestion.label}" updated successfully!`);
        setEditingQuestion(null);
        setFormConfig(data.config);
      } else {
        showToast(data.error || 'Failed to update question', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating question', 'error');
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleDeleteQuestion = async (q: FormQuestion) => {
    if (!confirm(`Are you sure you want to remove question "${q.label}"? Historical submitted answers will remain preserved in existing member records.`)) return;

    try {
      setLoadingConfig(true);
      const res = await fetch('/api/admin/founding-members/form-config', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action: 'delete_question', questionId: q.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Question removed.`);
        setFormConfig(data.config);
      } else {
        showToast(data.error || 'Failed to delete question', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error deleting question', 'error');
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleReorderQuestion = async (index: number, direction: 'up' | 'down') => {
    if (!formConfig || !formConfig.questions) return;
    const questions = [...formConfig.questions];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const temp = questions[index];
    questions[index] = questions[targetIdx];
    questions[targetIdx] = temp;

    const questionIds = questions.map((q) => q.id);

    try {
      setLoadingConfig(true);
      const res = await fetch('/api/admin/founding-members/form-config', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action: 'reorder', questionIds })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFormConfig(data.config);
      }
    } catch (err: any) {
      showToast(err.message || 'Error reordering questions', 'error');
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleToggleQuestionEnabled = async (q: FormQuestion) => {
    const updated = { ...q, enabled: !q.enabled };
    try {
      const res = await fetch('/api/admin/founding-members/form-config', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          action: 'edit_question',
          questionId: q.id,
          question: updated
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFormConfig(data.config);
      }
    } catch (err: any) {
      showToast(err.message || 'Error toggling question', 'error');
    }
  };

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (m.memberId && m.memberId.toLowerCase().includes(q)) ||
      (m.fullName && m.fullName.toLowerCase().includes(q)) ||
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.studentId && m.studentId.toLowerCase().includes(q)) ||
      (m.domain && m.domain.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Submitted' && m.formSubmitted) ||
      (statusFilter === 'Pending' && !m.formSubmitted);

    const matchesDomain = domainFilter === 'All' || m.domain === domainFilter;

    return matchesSearch && matchesStatus && matchesDomain;
  });

  const submittedCount = members.filter((m) => m.formSubmitted).length;
  const pendingCount = members.filter((m) => !m.formSubmitted).length;

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Top Section & Navigation Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#FF9900] text-xl font-bold shadow-xs">
              ⭐
            </div>
            <div>
              <h2 className="font-display font-extrabold text-lg text-[#111827] flex items-center gap-2">
                <span>Founding Members Management &amp; Form Builder</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Isolated Group
                </span>
              </h2>
              <p className="text-xs text-[#64748B]">
                Manage dedicated Founding Member records, customize dynamic questions in Form Builder, and export official PDF dossiers.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={copySharedFormLink}
              className="px-3.5 py-2 bg-gradient-to-r from-[#FF9900] to-orange-600 hover:from-[#E08800] hover:to-orange-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all flex items-center space-x-1.5"
            >
              <span>📋</span>
              <span>Copy ONE Form Link</span>
            </button>
            <a
              href="/founding-members/form"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center space-x-1"
            >
              <span>🔗</span>
              <span>Open Live Form</span>
            </a>
            <button
              onClick={() => {
                loadMembers();
                loadFormConfig();
              }}
              disabled={loading || loadingConfig}
              className="px-3 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-2xs transition-colors"
            >
              {loading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 border-b border-slate-100 pt-1">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'directory'
                ? 'border-[#FF9900] text-[#FF9900] bg-amber-50/40 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>👥 Founding Members Directory</span>
            <span className="bg-slate-200 text-slate-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {members.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('form-builder')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'form-builder'
                ? 'border-[#FF9900] text-[#FF9900] bg-amber-50/40 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📝 Founding Members Form (Form Builder)</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                formConfig?.status === 'Published'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {formConfig?.status || 'Published'}
            </span>
          </button>
        </div>

        {/* Quick Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="p-3 bg-[#F6F8FA] border border-[#E2E8F0] rounded-lg">
            <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">Total Members</span>
            <span className="text-2xl font-extrabold text-[#111827] mt-0.5 block">{members.length}</span>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800">
            <span className="text-[10px] uppercase font-bold tracking-wider block">Submitted Details</span>
            <span className="text-2xl font-extrabold mt-0.5 block">{submittedCount}</span>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-800">
            <span className="text-[10px] uppercase font-bold tracking-wider block">Pending Form</span>
            <span className="text-2xl font-extrabold mt-0.5 block">{pendingCount}</span>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-800">
            <span className="text-[10px] uppercase font-bold tracking-wider block">Shared Form Status</span>
            <div className="flex items-center space-x-2 mt-1">
              <span className="font-bold">{formConfig?.status || 'Published'}</span>
              <span className="text-[10px] text-blue-600 font-mono">({formConfig?.questions?.length || 0} fields)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Toast / Status Message */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold transition-all shadow-sm flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs opacity-60 hover:opacity-100 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: FOUNDING MEMBERS DIRECTORY */}
      {/* ======================================================== */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Controls, Filters & Bulk PDF Export Bar */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3 flex-grow">
              {/* Search */}
              <div className="relative min-w-[220px] max-w-sm flex-grow">
                <input
                  type="text"
                  placeholder="Search by ID, name, email, student ID, domain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-[#F6F8FA]"
                />
                <span className="absolute left-2.5 top-2 text-slate-400">🔍</span>
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg bg-white font-medium text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                >
                  <option value="All">All ({members.length})</option>
                  <option value="Submitted">Submitted ({submittedCount})</option>
                  <option value="Pending">Pending ({pendingCount})</option>
                </select>
              </div>

              {/* Domain Filter */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Domain:</span>
                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg bg-white font-medium text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                >
                  <option value="All">All Domains</option>
                  <option value="Cloud & Infrastructure">Cloud &amp; Infrastructure</option>
                  <option value="AI / ML & Data">AI / ML &amp; Data</option>
                  <option value="DevOps & SRE">DevOps &amp; SRE</option>
                  <option value="Full-Stack Web & Mobile">Full-Stack Web &amp; Mobile</option>
                  <option value="Security & Governance">Security &amp; Governance</option>
                  <option value="Community, Events & Operations">Community &amp; Events</option>
                </select>
              </div>
            </div>

            {/* Export & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3 py-1.5 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center space-x-1"
              >
                <span>+</span>
                <span>Add Member</span>
              </button>

              <button
                onClick={downloadSelectedPdf}
                disabled={selectedMemberIds.length === 0}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center space-x-1"
              >
                <span>📑</span>
                <span>Download Selected PDF ({selectedMemberIds.length})</span>
              </button>

              <button
                onClick={downloadAllPdf}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center space-x-1"
              >
                <span>📚</span>
                <span>Download All Members PDF</span>
              </button>

              <button
                onClick={exportToCSV}
                className="px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-2xs cursor-pointer"
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E2E8F0]">
                <thead className="bg-[#F6F8FA] font-bold text-[#64748B] text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left w-8">
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.length > 0 && selectedMemberIds.length === filteredMembers.length}
                        onChange={toggleSelectAll}
                        className="rounded text-[#FF9900] focus:ring-[#FF9900]"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">Permanent ID</th>
                    <th className="px-4 py-3 text-left">Founding Member</th>
                    <th className="px-4 py-3 text-left">Contact Info</th>
                    <th className="px-4 py-3 text-left">Domain Track</th>
                    <th className="px-4 py-3 text-left">Academic Record</th>
                    <th className="px-4 py-3 text-left">Form Status</th>
                    <th className="px-4 py-3 text-right">PDF &amp; Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredMembers.map((member) => {
                    const isSelected = selectedMemberIds.includes(member.id);
                    return (
                      <tr
                        key={member.id}
                        className={`transition-colors ${isSelected ? 'bg-amber-50/50' : 'hover:bg-slate-50/80'}`}
                      >
                        {/* Select checkbox */}
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectMember(member.id)}
                            className="rounded text-[#FF9900] focus:ring-[#FF9900]"
                          />
                        </td>

                        {/* Permanent Member ID */}
                        <td className="px-4 py-3 font-mono font-bold text-amber-800 whitespace-nowrap">
                          <span className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                            {member.memberId || 'FMB-CUUP-000'}
                          </span>
                        </td>

                        {/* Member Photo & Name */}
                        <td className="px-4 py-3 font-semibold text-[#111827]">
                          <div className="flex items-center space-x-2.5">
                            {member.photoUrl ? (
                              <img
                                src={member.photoUrl}
                                alt={member.fullName || member.name}
                                className="w-8 h-8 rounded-full object-cover border border-amber-300"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center font-bold text-[11px]">
                                {(member.fullName || member.name || 'F').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className="font-bold block text-slate-900">{member.fullName || member.name}</span>
                              <span className="text-[10px] text-slate-500 font-normal">{member.role || 'Founding Member'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-slate-700 block select-all">{member.email}</span>
                          <span className="text-slate-500 text-[10px] block">{member.phone || '—'}</span>
                        </td>

                        {/* Domain Track */}
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                            {member.domain || 'Cloud & Infrastructure'}
                          </span>
                        </td>

                        {/* Academic Record */}
                        <td className="px-4 py-3 max-w-xs">
                          <span className="font-medium text-slate-800 block truncate">{member.courseBranch || '—'}</span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {member.studentId ? `UID: ${member.studentId}` : member.university || 'Chandigarh University'}
                          </span>
                        </td>

                        {/* Form Status */}
                        <td className="px-4 py-3">
                          {member.formSubmitted ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              ✓ Submitted {member.formSubmittedAt ? `(${new Date(member.formSubmittedAt).toLocaleDateString()})` : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              ⏳ Pending
                            </span>
                          )}
                        </td>

                        {/* PDF & Actions */}
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => downloadSinglePdf(member)}
                            title="Download official PDF profile"
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded text-[10px] cursor-pointer"
                          >
                            📄 PDF
                          </button>
                          <button
                            onClick={() => setViewMember(member)}
                            className="text-[#FF9900] hover:text-orange-700 font-bold cursor-pointer underline text-[11px]"
                          >
                            View
                          </button>
                          <button
                            onClick={() => setEditMember({ ...member })}
                            className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer underline text-[11px]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirmMember(member)}
                            className="text-red-500 hover:text-red-700 font-bold cursor-pointer underline text-[11px]"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-[#64748B] space-y-2">
                        <p className="text-sm font-semibold">No founding members match your search criteria.</p>
                        <p className="text-xs">Try clearing filters or click "+ Add Member" to create a new record.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: DYNAMIC FORM BUILDER */}
      {/* ======================================================== */}
      {activeTab === 'form-builder' && (
        <div className="space-y-5">
          {/* Form Header & Status Bar */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <span>📝 Dynamic Founding Members Form Builder</span>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      formConfig?.status === 'Published'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    ● {formConfig?.status || 'Published'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure questions, field types, validation, and reorder steps. All published questions appear immediately on the shared form and in dynamic PDFs.
                </p>
              </div>

              {/* Form Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsAddQuestionModalOpen(true)}
                  className="px-3.5 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <span>+</span>
                  <span>Add Question</span>
                </button>

                <button
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="px-3 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-2xs cursor-pointer flex items-center space-x-1"
                >
                  <span>👁️</span>
                  <span>Preview Form</span>
                </button>

                <button
                  onClick={handleToggleFormPublish}
                  disabled={loadingConfig}
                  className={`px-3.5 py-2 text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors ${
                    formConfig?.status === 'Published'
                      ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {formConfig?.status === 'Published' ? 'Unpublish (Set to Draft)' : '🚀 Publish Form'}
                </button>
              </div>
            </div>

            {/* Published URL Link Bar */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 overflow-hidden">
                <span className="font-bold text-slate-700 whitespace-nowrap">Single Shared Form Link:</span>
                <code className="bg-white px-2.5 py-1 rounded border border-slate-200 font-mono text-slate-800 text-[11px] truncate select-all">
                  {typeof window !== 'undefined'
                    ? `${window.location.origin}/founding-members/form`
                    : 'https://www.awssbgcuup.tech/founding-members/form'}
                </code>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={copySharedFormLink}
                  className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-bold rounded cursor-pointer shadow-2xs"
                >
                  📋 Copy Link
                </button>
                <a
                  href="/founding-members/form"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-[#FF9900] hover:bg-[#E08800] text-white text-[11px] font-bold rounded cursor-pointer shadow-2xs"
                >
                  🔗 View Live
                </a>
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-display font-bold text-sm text-slate-900">
                Configured Questions ({formConfig?.questions?.length || 0})
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">
                12 Supported Types • Drag &amp; Reorder Supported
              </span>
            </div>

            <div className="space-y-2.5">
              {(formConfig?.questions || []).map((q, idx) => {
                const typeMeta = FIELD_TYPE_LABELS[q.type] || { name: q.type, icon: '❓' };
                const isCore = [
                  'fullName',
                  'email',
                  'phone',
                  'university',
                  'courseBranch',
                  'yearSemester',
                  'studentId',
                  'domain',
                  'skills',
                  'experience'
                ].includes(q.id);

                return (
                  <div
                    key={q.id}
                    className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs transition-all ${
                      q.enabled ? 'bg-white border-slate-200' : 'bg-slate-50/80 border-dashed border-slate-300 opacity-60'
                    }`}
                  >
                    {/* Left: Reorder & Info */}
                    <div className="flex items-center space-x-3">
                      {/* Move Up / Down Buttons */}
                      <div className="flex flex-col space-y-1">
                        <button
                          type="button"
                          onClick={() => handleReorderQuestion(idx, 'up')}
                          disabled={idx === 0}
                          className="text-[10px] p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorderQuestion(idx, 'down')}
                          disabled={idx === (formConfig?.questions?.length || 0) - 1}
                          className="text-[10px] p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        >
                          ▼
                        </button>
                      </div>

                      <span className="font-mono text-[10px] text-slate-400 font-bold w-4">#{idx + 1}</span>

                      {/* Type icon */}
                      <span className="text-base p-1.5 bg-slate-100 rounded-lg">{typeMeta.icon}</span>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">{q.label}</span>
                          {q.required && (
                            <span className="text-[9px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.2 rounded font-bold">
                              Required
                            </span>
                          )}
                          <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-bold">
                            {typeMeta.name}
                          </span>
                          {isCore && (
                            <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                              Standard Profile Field
                            </span>
                          )}
                        </div>
                        {q.helpText && <span className="text-[11px] text-slate-500 block mt-0.5">{q.helpText}</span>}
                        {q.options && q.options.length > 0 && (
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            Options: {q.options.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggleQuestionEnabled(q)}
                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                          q.enabled ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {q.enabled ? 'Enabled' : 'Disabled'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingQuestion({ ...q })}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold rounded text-[11px] cursor-pointer"
                      >
                        ✏️ Edit
                      </button>

                      {!isCore && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded text-[11px] cursor-pointer"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: VIEW DETAILS */}
      {/* ======================================================== */}
      {viewMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs font-sans">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                {viewMember.photoUrl ? (
                  <img src={viewMember.photoUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-[#FF9900]" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center font-bold text-base">
                    {(viewMember.fullName || viewMember.name || 'F').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-display font-extrabold text-base text-slate-900">
                    {viewMember.fullName || viewMember.name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="font-mono text-[11px] text-[#FF9900] font-bold">{viewMember.memberId}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] text-slate-600 font-semibold">{viewMember.domain}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setViewMember(null)} className="text-slate-400 hover:text-slate-600 text-base cursor-pointer">
                ✕
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-4">
              {/* Submission Status & PDF trigger */}
              <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">Permanent ID: {viewMember.memberId}</span>
                  <span className="text-[11px] text-slate-600">
                    {viewMember.formSubmitted
                      ? `Submitted on ${viewMember.formSubmittedAt ? new Date(viewMember.formSubmittedAt).toLocaleString() : 'Record'}`
                      : 'Pending form submission'}
                  </span>
                </div>
                <button
                  onClick={() => downloadSinglePdf(viewMember)}
                  className="px-3.5 py-1.5 bg-[#FF9900] hover:bg-[#E08800] text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs flex items-center space-x-1"
                >
                  <span>📄</span>
                  <span>Download Member PDF</span>
                </button>
              </div>

              {/* Personal & Academic */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Email Address</span>
                  <span className="font-mono font-semibold text-slate-900 select-all">{viewMember.email}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Phone</span>
                  <span className="font-mono font-semibold text-slate-900">{viewMember.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">University</span>
                  <span className="font-semibold text-slate-900">{viewMember.university || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Course &amp; Branch</span>
                  <span className="font-semibold text-slate-900">{viewMember.courseBranch || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Year &amp; Semester</span>
                  <span className="font-semibold text-slate-900">{viewMember.yearSemester || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Student ID / UID</span>
                  <span className="font-mono font-semibold text-slate-900">{viewMember.studentId || '—'}</span>
                </div>
              </div>

              {/* Profiles */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">LinkedIn</span>
                  {viewMember.linkedin ? (
                    <a href={viewMember.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold truncate block">
                      View Profile
                    </a>
                  ) : (
                    <span className="text-slate-400">Not provided</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">GitHub</span>
                  {viewMember.github ? (
                    <a href={viewMember.github} target="_blank" rel="noreferrer" className="text-slate-800 underline font-semibold truncate block">
                      View GitHub
                    </a>
                  ) : (
                    <span className="text-slate-400">Not provided</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Portfolio</span>
                  {viewMember.portfolio ? (
                    <a href={viewMember.portfolio} target="_blank" rel="noreferrer" className="text-amber-700 underline font-semibold truncate block">
                      View Portfolio
                    </a>
                  ) : (
                    <span className="text-slate-400">Not provided</span>
                  )}
                </div>
              </div>

              {/* Skills & Experience */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Technical Skills &amp; Tools</span>
                <p className="font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">{viewMember.skills || 'No skills recorded.'}</p>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Experience &amp; Contributions</span>
                <p className="font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">{viewMember.experience || 'No experience details recorded.'}</p>
              </div>

              {/* Dynamic Answers if present */}
              {viewMember.customAnswers && Object.keys(viewMember.customAnswers).length > 0 && (
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Dynamic Custom Question Answers</span>
                  <div className="space-y-2">
                    {Object.entries(viewMember.customAnswers).map(([k, v]) => {
                      const qObj = formConfig?.questions?.find((q) => q.id === k);
                      const qLabel = qObj?.label || k;
                      const valStr = Array.isArray(v) ? v.join(', ') : String(v);
                      return (
                        <div key={k} className="p-2 bg-slate-50 rounded-lg">
                          <span className="font-bold text-slate-700 text-[11px] block">{qLabel}</span>
                          <span className="text-slate-800 text-[11px] mt-0.5 block">{valStr || '—'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {viewMember.bio && (
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Bio &amp; Vision</span>
                  <p className="font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">{viewMember.bio}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                onClick={() => setViewMember(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ======================================================== */}
      {deleteConfirmMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs font-sans">
          <div className="bg-white rounded-2xl border border-red-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-shake">
            <div className="flex items-center space-x-3 text-red-600">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-display font-extrabold text-base text-slate-900">
                Confirm Founding Member Deletion
              </h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Are you sure you want to delete Founding Member{' '}
              <strong>"{deleteConfirmMember.fullName || deleteConfirmMember.name}"</strong> (
              <span className="font-mono font-bold text-amber-800">{deleteConfirmMember.memberId}</span>)?
            </p>
            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              🛡️ Note: Core Team records remain completely untouched and independent. This permanent ID will not be reused.
            </p>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmMember(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleDeleteMemberConfirmed}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
              >
                Delete Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD FOUNDING MEMBER */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs font-sans">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-extrabold text-base text-slate-900">
                + Add New Founding Member
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newMemberForm.fullName}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="member@culko.in"
                    value={newMemberForm.email}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newMemberForm.phone}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                    Domain Track
                  </label>
                  <select
                    value={newMemberForm.domain}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, domain: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                  >
                    <option value="Cloud & Infrastructure">Cloud &amp; Infrastructure</option>
                    <option value="AI / ML & Data">AI / ML &amp; Data</option>
                    <option value="DevOps & SRE">DevOps &amp; SRE</option>
                    <option value="Full-Stack Web & Mobile">Full-Stack Web &amp; Mobile</option>
                    <option value="Security & Governance">Security &amp; Governance</option>
                    <option value="Community, Events & Operations">Community &amp; Events</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                    Student ID / UID
                  </label>
                  <input
                    type="text"
                    placeholder="23BCS1001"
                    value={newMemberForm.studentId}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, studentId: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                💡 A unique permanent Founding Member ID (<code>FMB-CUUP-XXX</code>) will be automatically allocated upon creation.
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Create Founding Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT FOUNDING MEMBER */}
      {/* ======================================================== */}
      {editMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs font-sans">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-extrabold text-base text-slate-900">
                  Edit Founding Member ({editMember.fullName || editMember.name})
                </h3>
                <span className="text-[11px] font-mono text-amber-800 font-bold">ID: {editMember.memberId}</span>
              </div>
              <button onClick={() => setEditMember(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editMember.fullName || editMember.name || ''}
                    onChange={(e) => setEditMember({ ...editMember, fullName: e.target.value, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editMember.email || ''}
                    onChange={(e) => setEditMember({ ...editMember, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">Phone Number</label>
                  <input
                    type="text"
                    value={editMember.phone || ''}
                    onChange={(e) => setEditMember({ ...editMember, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">Domain</label>
                  <input
                    type="text"
                    value={editMember.domain || ''}
                    onChange={(e) => setEditMember({ ...editMember, domain: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">Role Title</label>
                  <input
                    type="text"
                    value={editMember.role || ''}
                    onChange={(e) => setEditMember({ ...editMember, role: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">University</label>
                  <input
                    type="text"
                    value={editMember.university || ''}
                    onChange={(e) => setEditMember({ ...editMember, university: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">Course / Branch</label>
                  <input
                    type="text"
                    value={editMember.courseBranch || ''}
                    onChange={(e) => setEditMember({ ...editMember, courseBranch: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">Student ID / UID</label>
                  <input
                    type="text"
                    value={editMember.studentId || ''}
                    onChange={(e) => setEditMember({ ...editMember, studentId: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">Technical Skills</label>
                <textarea
                  rows={2}
                  value={editMember.skills || ''}
                  onChange={(e) => setEditMember({ ...editMember, skills: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">Experience &amp; Contributions</label>
                <textarea
                  rows={3}
                  value={editMember.experience || ''}
                  onChange={(e) => setEditMember({ ...editMember, experience: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditMember(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD QUESTION (FORM BUILDER) */}
      {/* ======================================================== */}
      {isAddQuestionModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs font-sans">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-extrabold text-base text-slate-900">
                + Add Dynamic Question to Form
              </h3>
              <button onClick={() => setIsAddQuestionModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-3.5">
              {/* Field Type */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                  Field Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={newQuestionForm.type}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, type: e.target.value as FormFieldType })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white font-medium text-xs focus:ring-1 focus:ring-[#FF9900]"
                >
                  {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.icon} {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Label */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                  Question Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Certification Status"
                  value={newQuestionForm.label}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, label: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs"
                />
              </div>

              {/* Placeholder */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                  Placeholder Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. Select your certification readiness"
                  value={newQuestionForm.placeholder}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, placeholder: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs"
                />
              </div>

              {/* Help Text */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                  Help / Description Text
                </label>
                <input
                  type="text"
                  placeholder="Brief guidance for the member filling this question..."
                  value={newQuestionForm.helpText}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, helpText: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs"
                />
              </div>

              {/* Options for Dropdown / Radio / Checkbox */}
              {(newQuestionForm.type === 'dropdown' ||
                newQuestionForm.type === 'radio' ||
                newQuestionForm.type === 'checkbox') && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                    Options (One per line) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder={`AWS Certified Cloud Practitioner\nAWS Certified Solutions Architect\nPreparing for Certification\nNot yet certified`}
                    value={newQuestionForm.options}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, options: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs font-mono"
                  />
                </div>
              )}

              {/* Required & Enabled Toggles */}
              <div className="flex items-center space-x-4 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newQuestionForm.required}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, required: e.target.checked })}
                    className="rounded text-[#FF9900] focus:ring-[#FF9900]"
                  />
                  <span className="font-bold text-slate-700 text-[11px]">Required Field</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newQuestionForm.enabled}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, enabled: e.target.checked })}
                    className="rounded text-[#FF9900] focus:ring-[#FF9900]"
                  />
                  <span className="font-bold text-slate-700 text-[11px]">Active in Form</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddQuestionModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingConfig}
                  className="px-5 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Add Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT QUESTION (FORM BUILDER) */}
      {/* ======================================================== */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs font-sans">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-extrabold text-base text-slate-900">
                Edit Question ({editingQuestion.label})
              </h3>
              <button onClick={() => setEditingQuestion(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateQuestion} className="space-y-3.5">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                  Question Label
                </label>
                <input
                  type="text"
                  required
                  value={editingQuestion.label}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, label: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                  Placeholder Text
                </label>
                <input
                  type="text"
                  value={editingQuestion.placeholder || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, placeholder: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                  Help / Description Text
                </label>
                <input
                  type="text"
                  value={editingQuestion.helpText || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, helpText: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg"
                />
              </div>

              {(editingQuestion.type === 'dropdown' ||
                editingQuestion.type === 'radio' ||
                editingQuestion.type === 'checkbox') && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                    Options (One per line)
                  </label>
                  <textarea
                    rows={4}
                    value={(editingQuestion.options || []).join('\n')}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        options: e.target.value.split('\n').map((o) => o.trim()).filter(Boolean)
                      })
                    }
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs font-mono"
                  />
                </div>
              )}

              <div className="flex items-center space-x-4 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingQuestion.required}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, required: e.target.checked })}
                    className="rounded text-[#FF9900] focus:ring-[#FF9900]"
                  />
                  <span className="font-bold text-slate-700 text-[11px]">Required Field</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingQuestion.enabled}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, enabled: e.target.checked })}
                    className="rounded text-[#FF9900] focus:ring-[#FF9900]"
                  />
                  <span className="font-bold text-slate-700 text-[11px]">Active in Form</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingConfig}
                  className="px-5 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: FORM PREVIEW */}
      {/* ======================================================== */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm text-xs font-sans">
          <div className="bg-[#07131F] text-slate-100 rounded-3xl border border-white/10 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-fadeIn relative">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#FF9900] uppercase tracking-wider font-bold">
                  Interactive Preview Mode
                </span>
                <h3 className="font-display font-extrabold text-lg text-white">
                  Founding Member Form Preview
                </h3>
              </div>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Simulated Form Body */}
            <div className="space-y-4">
              {(formConfig?.questions || [])
                .filter((q) => q.enabled)
                .map((q) => {
                  return (
                    <div key={q.id} className="space-y-1.5 p-3.5 bg-[#0D2235]/90 border border-white/10 rounded-xl">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-200 text-xs">
                          {q.label} {q.required && <span className="text-[#FF9900]">*</span>}
                        </label>
                        <span className="text-[9px] text-slate-400 font-mono">({q.type})</span>
                      </div>
                      {q.helpText && <p className="text-[10px] text-slate-400">{q.helpText}</p>}

                      {q.type === 'textarea' ? (
                        <textarea
                          rows={2}
                          disabled
                          placeholder={q.placeholder || ''}
                          className="w-full px-3 py-2 bg-[#07131F] border border-white/10 rounded text-slate-400 text-xs"
                        />
                      ) : q.type === 'dropdown' ? (
                        <select disabled className="w-full px-3 py-2 bg-[#07131F] border border-white/10 rounded text-slate-400 text-xs">
                          <option>{q.placeholder || 'Select...'}</option>
                          {(q.options || []).map((opt) => (
                            <option key={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : q.type === 'radio' ? (
                        <div className="space-y-1 pt-1">
                          {(q.options || []).map((opt) => (
                            <div key={opt} className="flex items-center space-x-2 text-slate-400 text-xs">
                              <input type="radio" disabled />
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>
                      ) : q.type === 'checkbox' ? (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {(q.options || []).map((opt) => (
                            <div key={opt} className="flex items-center space-x-2 text-slate-400 text-xs">
                              <input type="checkbox" disabled />
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="text"
                          disabled
                          placeholder={q.placeholder || ''}
                          className="w-full px-3 py-2 bg-[#07131F] border border-white/10 rounded text-slate-400 text-xs"
                        />
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
