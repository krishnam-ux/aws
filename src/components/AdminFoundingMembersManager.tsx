'use client';

import React, { useState, useEffect } from 'react';
import { FoundingMember } from '@/types/foundingMember';

interface AdminFoundingMembersManagerProps {
  token: string | null;
}

export default function AdminFoundingMembersManager({ token }: AdminFoundingMembersManagerProps) {
  const effectiveToken =
    token ||
    (typeof window !== 'undefined'
      ? sessionStorage.getItem('adminToken') ||
        localStorage.getItem('admin_token') ||
        sessionStorage.getItem('admin_token')
      : null) ||
    'awssbg-admin-session-token-secure-hash';

  const [members, setMembers] = useState<FoundingMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Submitted' | 'Pending'>('All');
  const [domainFilter, setDomainFilter] = useState<string>('All');

  // Modal States
  const [viewMember, setViewMember] = useState<FoundingMember | null>(null);
  const [editMember, setEditMember] = useState<FoundingMember | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    university: 'Chandigarh University',
    courseBranch: '',
    studentId: '',
    domain: 'Cloud & Infrastructure',
    role: 'Founding Member',
    notes: ''
  });

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${effectiveToken}`
  });

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
        setStatusMessage({ type: 'error', text: err.error || 'Failed to load founding members.' });
      }
    } catch (err: any) {
      console.error('Failed to load founding members:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Error loading founding members' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [effectiveToken]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const copyFormLink = (member: FoundingMember) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.awssbgcuup.tech';
    const formUrl = `${origin}/founding-members/form/${member.formToken}`;
    navigator.clipboard.writeText(formUrl);
    showToast(`Form Link copied to clipboard for ${member.fullName || member.name}!`);
  };

  const handleGenerateNewToken = async (memberId: string) => {
    if (!confirm('Are you sure you want to generate a new form link? The previous link will no longer work.')) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/founding-members', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action: 'generate_token', memberId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('New secure token generated successfully!');
        loadMembers();
      } else {
        showToast(data.error || 'Failed to generate token', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error generating token', 'error');
    } finally {
      setLoading(false);
    }
  };

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
        body: JSON.stringify({
          action: 'create',
          member: newMemberForm
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Founding Member ${newMemberForm.fullName} created with secure form token!`);
        setIsAddModalOpen(false);
        setNewMemberForm({
          fullName: '',
          email: '',
          phone: '',
          university: 'Chandigarh University',
          courseBranch: '',
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

  const handleDeleteMember = async (member: FoundingMember) => {
    if (!confirm(`Are you sure you want to delete Founding Member "${member.fullName || member.name}"? This action cannot be undone.`)) return;

    try {
      setLoading(true);
      const res = await fetch('/api/admin/founding-members', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          action: 'delete',
          memberId: member.id
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Founding Member deleted successfully.');
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

  const exportToCSV = () => {
    if (members.length === 0) {
      showToast('No member records to export', 'info');
      return;
    }

    const headers = [
      'Full Name',
      'Email',
      'Phone',
      'University',
      'Course/Branch',
      'Year/Semester',
      'Student ID',
      'Domain',
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

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
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
      {/* 1. Header & Metrics Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-[#FF9900] text-xl font-bold">
              ⭐
            </div>
            <div>
              <h2 className="font-display font-extrabold text-lg text-[#111827] flex items-center gap-2">
                <span>Founding Members Management</span>
                <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  Independent Group
                </span>
              </h2>
              <p className="text-xs text-[#64748B]">
                Manage dedicated Founding Member records, generate secure unique form links, and view submitted profile details.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold rounded shadow-xs cursor-pointer transition-colors flex items-center space-x-1.5"
            >
              <span>+</span>
              <span>Add Founding Member</span>
            </button>
            <button
              onClick={exportToCSV}
              className="px-3 py-2 bg-white border border-[#E2E8F0] hover:border-slate-300 text-slate-700 text-xs font-bold rounded shadow-2xs cursor-pointer transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={loadMembers}
              disabled={loading}
              className="px-3 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-bold rounded shadow-2xs cursor-pointer transition-colors"
            >
              {loading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>

        {/* Quick Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-[#F6F8FA] border border-[#E2E8F0] rounded">
            <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">Total Founding Members</span>
            <span className="text-2xl font-extrabold text-[#111827] mt-0.5 block">{members.length}</span>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded text-emerald-800">
            <span className="text-[10px] uppercase font-bold tracking-wider block">Form Submitted</span>
            <span className="text-2xl font-extrabold mt-0.5 block">{submittedCount}</span>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded text-amber-800">
            <span className="text-[10px] uppercase font-bold tracking-wider block">Pending Submission</span>
            <span className="text-2xl font-extrabold mt-0.5 block">{pendingCount}</span>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded text-blue-800">
            <span className="text-[10px] uppercase font-bold tracking-wider block">Architecture</span>
            <span className="text-xs font-bold mt-1.5 block">Isolated Data Store (≠ Core Team)</span>
          </div>
        </div>
      </div>

      {/* Global Status Message */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-bold transition-all shadow-sm flex items-center justify-between ${
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

      {/* 2. Filters & Search */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-grow">
          {/* Search */}
          <div className="relative min-w-[220px] max-w-sm flex-grow">
            <input
              type="text"
              placeholder="Search by name, email, roll no, domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-[#E2E8F0] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-[#F6F8FA]"
            />
            <span className="absolute left-2.5 top-2 text-slate-400">🔍</span>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Form Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white font-medium text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
            >
              <option value="All">All Members ({members.length})</option>
              <option value="Submitted">Form Submitted ({submittedCount})</option>
              <option value="Pending">Pending Submission ({pendingCount})</option>
            </select>
          </div>

          {/* Domain Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Domain:</span>
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white font-medium text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
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

        <div className="text-[10px] text-slate-500 font-mono">
          Showing {filteredMembers.length} of {members.length} records
        </div>
      </div>

      {/* 3. Members Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E2E8F0]">
            <thead className="bg-[#F6F8FA] font-bold text-[#64748B] text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Domain &amp; Role</th>
                <th className="px-4 py-3 text-left">Academic Info</th>
                <th className="px-4 py-3 text-left">Form Status</th>
                <th className="px-4 py-3 text-left">Form Link Action</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-750">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Member Name & Photo */}
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
                        <span className="text-[10px] text-amber-700 font-mono">ID: {member.id}</span>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-slate-700 block select-all">{member.email}</span>
                    <span className="text-slate-500 text-[10px] block">{member.phone || '—'}</span>
                  </td>

                  {/* Domain & Role */}
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                      {member.domain || 'Cloud & Infrastructure'}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{member.role || 'Founding Member'}</span>
                  </td>

                  {/* Academic Info */}
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
                        ⏳ Pending Form
                      </span>
                    )}
                  </td>

                  {/* Form Link Action */}
                  <td className="px-4 py-3 space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => copyFormLink(member)}
                      title="Copy public form link to clipboard"
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded text-[11px] cursor-pointer shadow-2xs transition-colors"
                    >
                      📋 Copy Form Link
                    </button>
                    <button
                      onClick={() => handleGenerateNewToken(member.id)}
                      title="Generate / refresh secure token"
                      className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium rounded text-[10px] cursor-pointer"
                    >
                      🔄 Reset
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setViewMember(member)}
                      className="text-[#FF9900] hover:text-orange-700 font-bold cursor-pointer underline"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => setEditMember({ ...member })}
                      className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member)}
                      className="text-red-500 hover:text-red-700 font-bold cursor-pointer underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#64748B] space-y-2">
                    <p className="text-sm font-semibold">No founding members found.</p>
                    <p className="text-xs">Try clearing your search query or add a new founding member record.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: VIEW DETAILS */}
      {viewMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs font-sans">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                {viewMember.photoUrl ? (
                  <img src={viewMember.photoUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover border border-amber-300" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center font-bold text-base">
                    {(viewMember.fullName || viewMember.name || 'F').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-display font-extrabold text-base text-slate-900">
                    {viewMember.fullName || viewMember.name}
                  </h3>
                  <span className="text-[11px] text-amber-800 font-semibold">{viewMember.domain} • {viewMember.role || 'Founding Member'}</span>
                </div>
              </div>
              <button onClick={() => setViewMember(null)} className="text-slate-400 hover:text-slate-600 text-base cursor-pointer">
                ✕
              </button>
            </div>

            {/* Content Breakdown */}
            <div className="space-y-4">
              {/* Status Banner */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">Form Submission Status:</span>
                  <span className="text-[11px] text-slate-600">
                    {viewMember.formSubmitted
                      ? `Submitted on ${viewMember.formSubmittedAt ? new Date(viewMember.formSubmittedAt).toLocaleString() : 'Record'}`
                      : 'Pending submission by member'}
                  </span>
                </div>
                <button
                  onClick={() => copyFormLink(viewMember)}
                  className="px-3 py-1.5 bg-[#FF9900] hover:bg-[#E08800] text-white font-bold rounded text-xs cursor-pointer shadow-2xs"
                >
                  📋 Copy Form Link
                </button>
              </div>

              {/* Grid 1: Personal & Contact */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Email Address</span>
                  <span className="font-mono font-semibold text-slate-900 select-all">{viewMember.email}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Phone Number</span>
                  <span className="font-mono font-semibold text-slate-900">{viewMember.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">University / Institute</span>
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
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Student ID / Roll No</span>
                  <span className="font-mono font-semibold text-slate-900">{viewMember.studentId || '—'}</span>
                </div>
              </div>

              {/* Profiles */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
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
              <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Technical Skills &amp; Certifications</span>
                <p className="font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">{viewMember.skills || 'No skills added yet.'}</p>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Experience &amp; Community Contributions</span>
                <p className="font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">{viewMember.experience || 'No experience details recorded yet.'}</p>
              </div>

              {viewMember.bio && (
                <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Bio &amp; Other Notes</span>
                  <p className="font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">{viewMember.bio}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                onClick={() => setViewMember(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD MEMBER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs font-sans">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-extrabold text-sm text-slate-900">
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
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
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
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
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
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                    Primary Domain / Area
                  </label>
                  <select
                    value={newMemberForm.domain}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, domain: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                  >
                    <option value="Cloud & Infrastructure">Cloud &amp; Infrastructure</option>
                    <option value="AI / ML & Data">AI / ML &amp; Data</option>
                    <option value="DevOps & SRE">DevOps &amp; SRE</option>
                    <option value="Full-Stack Web & Mobile">Full-Stack Web &amp; Mobile</option>
                    <option value="Security & Governance">Security &amp; Governance</option>
                    <option value="Community, Events & Operations">Community &amp; Events</option>
                    <option value="Content & Technical Documentation">Content &amp; Docs</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                    Role Title
                  </label>
                  <input
                    type="text"
                    value={newMemberForm.role}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, role: e.target.value })}
                    placeholder="Founding Member"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px]">
                💡 A unique secure link (<code>/founding-members/form/[token]</code>) will be automatically generated upon creation.
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white font-bold rounded shadow-xs cursor-pointer"
                >
                  Create Member &amp; Generate Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MEMBER */}
      {editMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs font-sans">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-extrabold text-sm text-slate-900">
                Edit Founding Member ({editMember.fullName || editMember.name})
              </h3>
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
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editMember.email || ''}
                    onChange={(e) => setEditMember({ ...editMember, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded font-mono text-xs"
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
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">Domain</label>
                  <input
                    type="text"
                    value={editMember.domain || ''}
                    onChange={(e) => setEditMember({ ...editMember, domain: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">Role Title</label>
                  <input
                    type="text"
                    value={editMember.role || ''}
                    onChange={(e) => setEditMember({ ...editMember, role: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded"
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
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">Course / Branch</label>
                  <input
                    type="text"
                    value={editMember.courseBranch || ''}
                    onChange={(e) => setEditMember({ ...editMember, courseBranch: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">Roll No / Student ID</label>
                  <input
                    type="text"
                    value={editMember.studentId || ''}
                    onChange={(e) => setEditMember({ ...editMember, studentId: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">Technical Skills</label>
                <textarea
                  rows={2}
                  value={editMember.skills || ''}
                  onChange={(e) => setEditMember({ ...editMember, skills: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">Experience &amp; Contributions</label>
                <textarea
                  rows={3}
                  value={editMember.experience || ''}
                  onChange={(e) => setEditMember({ ...editMember, experience: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditMember(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white font-bold rounded shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
