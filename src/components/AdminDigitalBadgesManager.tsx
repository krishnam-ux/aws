'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DigitalBadge, DigitalBadgeStats, CreateBadgeInput, DigitalBadgeEvent } from '@/types/digitalBadge';
import {
  BADGE_PRESETS,
  DEFAULT_ISSUER_NAME,
  DEFAULT_ISSUER_LOGO,
  getBadgeUrl,
  getBadgeVerificationUrl,
  formatDisplayDate,
  parseSkillsInput,
  getLinkedInAddCertUrl
} from '@/lib/digitalBadgeUtils';
import { generateBadgeSvg } from '@/lib/badgeAssets';

interface AdminDigitalBadgesManagerProps {
  token?: string | null;
}

const initialFormState: CreateBadgeInput = {
  recipientName: '',
  recipientEmail: '',
  badgeTitle: 'AWS Certified Cloud Practitioner Mastery',
  badgeDescription: 'Recognizes successful mastery of foundational AWS cloud concepts, security best practices, core services, and architectural excellence.',
  issueDate: new Date().toISOString().split('T')[0],
  earningCriteria: 'Demonstrated complete proficiency in AWS core services (EC2, S3, RDS, Lambda, IAM, VPC), achieving 85%+ on technical evaluations.',
  skills: ['AWS Cloud', 'Architecture', 'Security & IAM', 'Cloud Fundamentals'],
  badgeImage: '',
  issuerName: DEFAULT_ISSUER_NAME,
  issuerLogo: DEFAULT_ISSUER_LOGO,
  additionalInformation: ''
};

export default function AdminDigitalBadgesManager({ token }: AdminDigitalBadgesManagerProps) {
  const [items, setItems] = useState<DigitalBadge[]>([]);
  const [stats, setStats] = useState<DigitalBadgeStats>({
    total: 0,
    active: 0,
    revoked: 0,
    recentlyIssued: []
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'id'>('recent');

  // Modals & UI States
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isSuccessStateOpen, setIsSuccessStateOpen] = useState(false);

  // Active / Selected states
  const [selectedBadge, setSelectedBadge] = useState<DigitalBadge | null>(null);
  const [createdBadge, setCreatedBadge] = useState<DigitalBadge | null>(null);
  const [formData, setFormData] = useState<CreateBadgeInput>(initialFormState);
  const [skillsRawInput, setSkillsRawInput] = useState('AWS Cloud, Architecture, Security & IAM, Cloud Fundamentals');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [selectedIconName, setSelectedIconName] = useState<string>('cloud');
  const [revokeReason, setRevokeReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Email Delivery and Activity Logs for Details View
  const [badgeEvents, setBadgeEvents] = useState<DigitalBadgeEvent[]>([]);
  const [badgeEmailLogs, setBadgeEmailLogs] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Send Email Modal State
  const [sendRecipientEmail, setSendRecipientEmail] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendModalError, setSendModalError] = useState('');

  const adminAuthToken = token || 'awssbg-admin-session-token-secure-hash';

  // Fetch Items & Stats
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/digital-badges', {
        headers: {
          Authorization: `Bearer ${adminAuthToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setActionError(err.error || 'Failed to fetch Digital Badges.');
      }
    } catch (err: any) {
      console.error('Error fetching digital badges:', err);
      setActionError('Network error while loading digital badges.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch detailed badge data (activity logs & email logs)
  const fetchBadgeDetails = async (credentialId: string) => {
    try {
      setDetailsLoading(true);
      const res = await fetch(`/api/admin/digital-badges?credentialId=${encodeURIComponent(credentialId)}`, {
        headers: {
          Authorization: `Bearer ${adminAuthToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.item) {
          setSelectedBadge(data.item);
        }
        setBadgeEvents(data.events || []);
        setBadgeEmailLogs(data.emailLogs || []);
      }
    } catch (err) {
      console.error('Error fetching badge details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Filter & Sort
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const search = searchQuery.toLowerCase().trim();
        const matchSearch =
          !search ||
          (item.recipientName && item.recipientName.toLowerCase().includes(search)) ||
          (item.recipientEmail && item.recipientEmail.toLowerCase().includes(search)) ||
          (item.badgeTitle && item.badgeTitle.toLowerCase().includes(search)) ||
          (item.credentialId && item.credentialId.toLowerCase().includes(search));

        const matchStatus =
          statusFilter === 'All' ||
          (statusFilter === 'Active' && item.status === 'ACTIVE') ||
          (statusFilter === 'Revoked' && item.status === 'REVOKED');

        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.recipientName.localeCompare(b.recipientName);
        }
        if (sortBy === 'id') {
          return a.credentialId.localeCompare(b.credentialId);
        }
        return new Date(b.createdAt || b.issuedAt).getTime() - new Date(a.createdAt || a.issuedAt).getTime();
      });
  }, [items, searchQuery, statusFilter, sortBy]);

  // Handle Preset change
  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index);
    const preset = BADGE_PRESETS[index];
    if (preset) {
      setSelectedIconName(preset.iconType);
      setFormData((prev) => ({
        ...prev,
        badgeTitle: preset.title,
        badgeDescription: preset.defaultDescription,
        earningCriteria: preset.defaultCriteria,
        skills: [...preset.defaultSkills]
      }));
      setSkillsRawInput(preset.defaultSkills.join(', '));
    }
  };

  // Handle Create Badge Submit
  const handleCreateBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    const parsedSkills = parseSkillsInput(skillsRawInput);
    if (!formData.recipientName.trim()) {
      setActionError('Recipient Name is required.');
      return;
    }
    if (!formData.recipientEmail.trim()) {
      setActionError('Recipient Email is required.');
      return;
    }
    if (!formData.badgeTitle.trim()) {
      setActionError('Badge Title is required.');
      return;
    }

    try {
      setActionLoading(true);
      const payload: CreateBadgeInput = {
        ...formData,
        skills: parsedSkills,
        badgeImage: formData.badgeImage || undefined
      };

      const res = await fetch('/api/admin/digital-badges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAuthToken}`
        },
        body: JSON.stringify({ action: 'create', data: payload })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to issue digital badge.');
      }

      const newBadge: DigitalBadge = data.badge;
      setCreatedBadge(newBadge);
      setSelectedBadge(newBadge);
      setSendRecipientEmail(newBadge.recipientEmail);
      setIsIssueModalOpen(false);
      setIsSuccessStateOpen(true);
      setActionSuccess(`Badge ${newBadge.credentialId} successfully issued for ${newBadge.recipientName}!`);
      await fetchData();
    } catch (err: any) {
      console.error('Issue badge error:', err);
      setActionError(err.message || 'Failed to issue badge.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Update Badge
  const handleUpdateBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBadge) return;
    setActionError('');
    setActionSuccess('');

    try {
      setActionLoading(true);
      const parsedSkills = parseSkillsInput(skillsRawInput);
      const res = await fetch('/api/admin/digital-badges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAuthToken}`
        },
        body: JSON.stringify({
          action: 'update',
          id: selectedBadge.id,
          credentialId: selectedBadge.credentialId,
          ...formData,
          skills: parsedSkills
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update badge.');
      }

      setActionSuccess(`Badge ${selectedBadge.credentialId} updated successfully.`);
      setIsEditModalOpen(false);
      await fetchData();
      if (selectedBadge) {
        await fetchBadgeDetails(selectedBadge.credentialId);
      }
    } catch (err: any) {
      console.error('Update badge error:', err);
      setActionError(err.message || 'Failed to update badge.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Revoke Badge
  const handleRevokeBadge = async () => {
    if (!selectedBadge) return;
    if (!revokeReason.trim()) {
      setActionError('Revocation reason is required.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/digital-badges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAuthToken}`
        },
        body: JSON.stringify({
          action: 'revoke',
          id: selectedBadge.id,
          credentialId: selectedBadge.credentialId,
          reason: revokeReason.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to revoke badge.');
      }

      setActionSuccess(`Badge ${selectedBadge.credentialId} has been REVOKED and retired.`);
      setIsRevokeModalOpen(false);
      setRevokeReason('');
      await fetchData();
      if (selectedBadge) {
        await fetchBadgeDetails(selectedBadge.credentialId);
      }
    } catch (err: any) {
      console.error('Revoke badge error:', err);
      setActionError(err.message || 'Failed to revoke badge.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Hard Delete Badge
  const handleDeleteBadge = async () => {
    if (!selectedBadge) return;
    if (deleteConfirmText !== selectedBadge.credentialId) {
      setActionError(`Please type "${selectedBadge.credentialId}" to confirm deletion.`);
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/digital-badges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAuthToken}`
        },
        body: JSON.stringify({
          action: 'delete',
          id: selectedBadge.id,
          credentialId: selectedBadge.credentialId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete badge.');
      }

      setActionSuccess(`Badge ${selectedBadge.credentialId} deleted.`);
      setIsDeleteModalOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedBadge(null);
      setDeleteConfirmText('');
      await fetchData();
    } catch (err: any) {
      console.error('Delete badge error:', err);
      setActionError(err.message || 'Failed to delete badge.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Send Badge Email Modal
  const handleOpenSendEmailModal = (badge: DigitalBadge) => {
    setSelectedBadge(badge);
    setSendRecipientEmail(badge.recipientEmail || '');
    setSendModalError('');
    setIsSendModalOpen(true);
  };

  // Dispatch Badge Email with Attached PDF
  const handleSendBadgeEmail = async () => {
    const badgeToSend = selectedBadge || createdBadge;
    if (!badgeToSend) return;

    const targetEmail = sendRecipientEmail.trim() || badgeToSend.recipientEmail;
    if (!targetEmail) {
      setSendModalError('Recipient email address is required.');
      return;
    }

    try {
      setSendLoading(true);
      setSendModalError('');

      const res = await fetch('/api/admin/digital-badges/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAuthToken}`
        },
        body: JSON.stringify({
          credentialId: badgeToSend.credentialId,
          id: badgeToSend.id,
          recipientEmail: targetEmail
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send badge email.');
      }

      setActionSuccess(`Digital Badge sent successfully to ${targetEmail}`);
      setIsSendModalOpen(false);

      if (selectedBadge) {
        await fetchBadgeDetails(selectedBadge.credentialId);
      }
    } catch (err: any) {
      console.error('Send badge email error:', err);
      setSendModalError(err.message || 'Failed to send badge email.');
    } finally {
      setSendLoading(false);
    }
  };

  // Copy helper
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setActionSuccess(`${label} copied to clipboard!`);
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  // Live SVG generator for issue preview
  const previewSvg = useMemo(() => {
    const preset = BADGE_PRESETS[selectedPresetIndex];
    return generateBadgeSvg({
      title: formData.badgeTitle || 'Cloud Foundations',
      category: preset?.category || 'SESSION COMPLETION',
      series: preset?.series || 'WEEKLY AWS LEARNING SERIES',
      iconType: preset?.iconType || 'cloud',
      accentColor: preset?.accentColor || '#FF9900',
      gradientStart: preset?.primaryColor || '#07131F',
      gradientEnd: preset?.secondaryColor || '#0D2235',
      issuer: formData.issuerName || DEFAULT_ISSUER_NAME
    });
  }, [formData.badgeTitle, formData.issuerName, selectedPresetIndex]);

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {actionSuccess && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl shadow-sm text-sm font-medium animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className="text-lg">✓</span>
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-600 hover:text-emerald-900 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl shadow-sm text-sm font-medium animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className="text-lg">✕</span>
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-rose-600 hover:text-rose-900 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* DASHBOARD METRICS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-[#FF9900]/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-100/50 to-transparent rounded-bl-full pointer-events-none" />
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Badges</div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 font-mono">{stats.total}</div>
          <div className="mt-1 text-xs text-slate-400 font-medium">All issued credentials</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-emerald-400/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-100/50 to-transparent rounded-bl-full pointer-events-none" />
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Active & Verified</span>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-emerald-700 font-mono">{stats.active}</div>
          <div className="mt-1 text-xs text-emerald-600 font-medium">Live public credentials</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-rose-400/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-100/50 to-transparent rounded-bl-full pointer-events-none" />
          <div className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Revoked</span>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-rose-700 font-mono">{stats.revoked}</div>
          <div className="mt-1 text-xs text-rose-600 font-medium">Permanently retired</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-indigo-400/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-100/50 to-transparent rounded-bl-full pointer-events-none" />
          <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Recently Issued</div>
          <div className="mt-2 text-3xl font-extrabold text-indigo-700 font-mono">{stats.recentlyIssued?.length || 0}</div>
          <div className="mt-1 text-xs text-indigo-500 font-medium">Last 5 credentials</div>
        </div>
      </div>

      {/* ACTION BAR & CONTROLS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
              <span>🏅</span>
              <span>Digital Badges Registry</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Issue, manage, and verify official Credly-style digital credentials for AWS community achievements.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setFormData(initialFormState);
                setSkillsRawInput('AWS Cloud, Architecture, Security & IAM, Cloud Fundamentals');
                setIsIssueModalOpen(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-[#FF9900] to-[#E68A00] hover:from-[#E68A00] hover:to-[#CC7A00] text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Issue Digital Badge</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          <div className="sm:col-span-6 relative">
            <input
              type="text"
              placeholder="Search by student name, email, badge title, or credential ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:bg-white transition-all"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Revoked">Revoked Only</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
            >
              <option value="recent">Sort: Most Recent</option>
              <option value="name">Sort: Student Name</option>
              <option value="id">Sort: Credential ID</option>
            </select>
          </div>
        </div>
      </div>

      {/* BADGES TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-[#FF9900] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold">Loading official badge registry...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <div className="text-4xl">🏅</div>
            <p className="text-sm font-bold text-slate-600">No digital badges found</p>
            <p className="text-xs text-slate-400">
              {searchQuery || statusFilter !== 'All' ? 'Try adjusting your search filters.' : 'Click "Issue Digital Badge" above to issue your first credential.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Recipient</th>
                  <th className="py-3.5 px-4">Badge Title</th>
                  <th className="py-3.5 px-4">Credential ID</th>
                  <th className="py-3.5 px-4">Issue Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((badge) => {
                  const isRevoked = badge.status === 'REVOKED';
                  return (
                    <tr key={badge.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Recipient */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{badge.recipientName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{badge.recipientEmail}</div>
                      </td>

                      {/* Badge Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🏅</span>
                          <div>
                            <div className="font-extrabold text-slate-800">{badge.badgeTitle}</div>
                            <div className="text-[10px] text-slate-400 line-clamp-1 max-w-xs">{badge.earningCriteria}</div>
                          </div>
                        </div>
                      </td>

                      {/* Credential ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {badge.credentialId}
                          </span>
                          <button
                            onClick={() => copyToClipboard(badge.credentialId, 'Credential ID')}
                            title="Copy Credential ID"
                            className="text-slate-400 hover:text-slate-700 text-xs"
                          >
                            📋
                          </button>
                        </div>
                      </td>

                      {/* Issue Date */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {formatDisplayDate(badge.issueDate || badge.issuedAt)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isRevoked ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            ⚠ REVOKED
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ ACTIVE
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* View Details Drawer */}
                          <button
                            onClick={() => {
                              setSelectedBadge(badge);
                              setIsDetailsModalOpen(true);
                              fetchBadgeDetails(badge.credentialId);
                            }}
                            title="View Full Details & Audit"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            👁 View
                          </button>

                          {/* Send by Email */}
                          {!isRevoked && (
                            <button
                              onClick={() => handleOpenSendEmailModal(badge)}
                              title="Send Badge by Email (with attached PDF)"
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold transition-colors"
                            >
                              ✉ Send
                            </button>
                          )}

                          {/* Download PDF */}
                          <a
                            href={`/api/digital-badges/pdf/${badge.credentialId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download Official PDF"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors inline-block"
                          >
                            📄 PDF
                          </a>

                          {/* Public Page */}
                          <a
                            href={`/badge/${badge.credentialId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open Public Badge Page"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors inline-block"
                          >
                            🔗
                          </a>

                          {/* Edit (if active) */}
                          {!isRevoked && (
                            <button
                              onClick={() => {
                                setSelectedBadge(badge);
                                setFormData({
                                  recipientName: badge.recipientName,
                                  recipientEmail: badge.recipientEmail,
                                  badgeTitle: badge.badgeTitle,
                                  badgeDescription: badge.badgeDescription,
                                  issueDate: badge.issueDate || badge.issuedAt.split('T')[0],
                                  earningCriteria: badge.earningCriteria,
                                  skills: badge.skills || [],
                                  badgeImage: badge.badgeImage || '',
                                  issuerName: badge.issuerName,
                                  issuerLogo: badge.issuerLogo,
                                  additionalInformation: badge.additionalInformation || ''
                                });
                                setSkillsRawInput((badge.skills || []).join(', '));
                                setIsEditModalOpen(true);
                              }}
                              title="Edit Badge Details"
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                            >
                              ✏
                            </button>
                          )}

                          {/* Revoke (if active) */}
                          {!isRevoked && (
                            <button
                              onClick={() => {
                                setSelectedBadge(badge);
                                setRevokeReason('');
                                setIsRevokeModalOpen(true);
                              }}
                              title="Revoke Credential"
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ISSUE DIGITAL BADGE WITH LIVE PREVIEW */}
      {/* ========================================================================= */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <span>🏅</span>
                  <span>Issue Official Digital Badge</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Fill in student & competency criteria. Preview updates in real-time.
                </p>
              </div>
              <button
                onClick={() => setIsIssueModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBadge} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Input Column */}
              <div className="lg:col-span-7 space-y-4">
                {/* Preset Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Quick Preset Template:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {BADGE_PRESETS.map((preset, idx) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(idx)}
                        className={`p-2 rounded-xl text-left border text-xs transition-all ${
                          selectedPresetIndex === idx
                            ? 'border-[#FF9900] bg-amber-50/60 ring-2 ring-[#FF9900]/30 font-bold text-slate-900'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="line-clamp-1">{preset.title}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Student Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Johnson"
                      value={formData.recipientName}
                      onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Student Registered Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="student@example.com"
                      value={formData.recipientEmail}
                      onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
                    />
                  </div>
                </div>

                {/* Badge Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Badge Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AWS Solutions Architect Associate Bootcamp"
                    value={formData.badgeTitle}
                    onChange={(e) => setFormData({ ...formData, badgeTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>

                {/* Badge Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Badge Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Comprehensive description of the credential and achievement..."
                    value={formData.badgeDescription}
                    onChange={(e) => setFormData({ ...formData, badgeDescription: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>

                {/* Earning Criteria */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Earning Criteria <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Specific milestones, quiz score, or hands-on criteria required to earn this credential..."
                    value={formData.earningCriteria}
                    onChange={(e) => setFormData({ ...formData, earningCriteria: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>

                {/* Skills & Issue Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Skills &amp; Competencies (Comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. EC2, S3, IAM, Cloud Architecture"
                      value={skillsRawInput}
                      onChange={(e) => setSkillsRawInput(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Issue Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
                    />
                  </div>
                </div>

                {/* Additional Information (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Additional Information / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Issued for Outstanding Performance in Fall Hackathon 2026"
                    value={formData.additionalInformation || ''}
                    onChange={(e) => setFormData({ ...formData, additionalInformation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>
              </div>

              {/* LIVE PREVIEW COLUMN */}
              <div className="lg:col-span-5 space-y-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Live Credential Preview:
                </label>

                <div className="bg-gradient-to-b from-[#0B1E30] via-[#07131F] to-[#040C14] border border-slate-800 rounded-3xl p-6 text-white text-center shadow-xl space-y-4">
                  {/* Badge Vector Artwork */}
                  <div className="flex justify-center">
                    <div
                      className="w-52 h-52 aspect-square drop-shadow-2xl hover:scale-105 transition-transform flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: previewSvg }}
                    />
                  </div>

                  {/* Credential Status Tag */}
                  <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-[#07131F] border border-[#FF9900]/40 text-[#FFAC33] text-[11px] font-extrabold tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900]"></span>
                    <span>DIGITAL CREDENTIAL</span>
                  </div>

                  <div>
                    <h4 className="text-lg font-extrabold text-white">
                      {formData.recipientName || 'Student Name'}
                    </h4>
                    <p className="text-xs text-[#FF9900] font-bold mt-0.5">
                      {formData.badgeTitle || 'Badge Title'}
                    </p>
                  </div>

                  <div className="text-[11px] text-slate-300 space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-left">
                    <div>
                      <span className="text-slate-400 font-bold">Issuer: </span>
                      <span>{formData.issuerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold">Issue Date: </span>
                      <span>{formatDisplayDate(formData.issueDate)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold">Credential ID: </span>
                      <span className="font-mono text-[#FF9900]">BADGE-CUUP-AUTO</span>
                    </div>
                  </div>

                  {/* Skills preview */}
                  <div className="text-left">
                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1.5">Verified Skills:</div>
                    <div className="flex flex-wrap gap-1">
                      {parseSkillsInput(skillsRawInput).map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-[#0D2235] border border-[#FF9900]/30 text-[#FF9900] text-[10px] rounded-md font-semibold"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Criteria */}
                  <div className="text-left text-[11px] text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase mb-0.5">Criteria:</span>
                    <p className="line-clamp-2">{formData.earningCriteria || 'Earning criteria statement'}</p>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-3 bg-gradient-to-r from-[#FF9900] to-[#E68A00] hover:from-[#E68A00] hover:to-[#CC7A00] text-white font-extrabold text-sm rounded-xl shadow-lg transition-all disabled:opacity-50"
                  >
                    {actionLoading ? 'Creating & Issuing Badge...' : 'Create & Issue Badge 🏅'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsIssueModalOpen(false)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: IMMEDIATE POST-ISSUANCE SUCCESS SCREEN */}
      {/* ========================================================================= */}
      {isSuccessStateOpen && createdBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
              ✓
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Badge Created &amp; Issued Successfully!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                The digital credential has been registered and is permanently active on the public verification registry.
              </p>
            </div>

            {/* Credential Card Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold uppercase">Credential ID:</span>
                <span className="font-mono font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {createdBadge.credentialId}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold uppercase">Recipient:</span>
                <span className="font-bold text-slate-900">{createdBadge.recipientName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold uppercase">Email:</span>
                <span className="font-mono text-slate-700">{createdBadge.recipientEmail}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold uppercase">Badge:</span>
                <span className="font-extrabold text-[#FF9900]">{createdBadge.badgeTitle}</span>
              </div>
            </div>

            {/* 3 Key Action Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setIsSuccessStateOpen(false);
                  handleOpenSendEmailModal(createdBadge);
                }}
                className="w-full py-3 bg-gradient-to-r from-[#FF9900] to-[#E68A00] hover:from-[#E68A00] hover:to-[#CC7A00] text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <span>✉</span>
                <span>Send Badge by Email</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`/badge/${createdBadge.credentialId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1.5"
                >
                  <span>🔗</span>
                  <span>View Badge</span>
                </a>

                <a
                  href={`/api/digital-badges/pdf/${createdBadge.credentialId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1.5"
                >
                  <span>📄</span>
                  <span>Download PDF</span>
                </a>
              </div>
            </div>

            <button
              onClick={() => setIsSuccessStateOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              Done &amp; Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SEND BADGE BY EMAIL CONFIRMATION */}
      {/* ========================================================================= */}
      {isSendModalOpen && (selectedBadge || createdBadge) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center space-x-3 border-b border-slate-200 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#FF9900] flex items-center justify-center text-xl font-bold">
                ✉
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Send Digital Badge</h3>
                <p className="text-xs text-slate-500">Deliver official credential &amp; PDF certificate by email.</p>
              </div>
            </div>

            {sendModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
                {sendModalError}
              </div>
            )}

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-bold uppercase block mb-0.5">Recipient:</span>
                <input
                  type="email"
                  value={sendRecipientEmail}
                  onChange={(e) => setSendRecipientEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-2 focus:ring-[#FF9900]"
                />
              </div>

              <div>
                <span className="text-slate-500 font-bold uppercase block mb-0.5">Badge:</span>
                <span className="font-extrabold text-[#FF9900]">
                  {(selectedBadge || createdBadge)?.badgeTitle}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-bold uppercase block mb-0.5">Credential ID:</span>
                <span className="font-mono font-bold text-slate-900">
                  {(selectedBadge || createdBadge)?.credentialId}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-bold uppercase block mb-0.5">Attachment:</span>
                <div className="flex items-center space-x-1.5 text-slate-700 font-semibold bg-white p-2 rounded-lg border border-slate-200">
                  <span>📎</span>
                  <span>Digital-Badge-{(selectedBadge || createdBadge)?.credentialId}.pdf</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                disabled={sendLoading}
                onClick={() => setIsSendModalOpen(false)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={sendLoading}
                onClick={handleSendBadgeEmail}
                className="w-1/2 py-2.5 bg-gradient-to-r from-[#FF9900] to-[#E68A00] hover:from-[#E68A00] hover:to-[#CC7A00] text-white font-extrabold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                {sendLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending Badge...</span>
                  </>
                ) : (
                  <span>Send Badge ✉</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: FULL ADMIN BADGE DETAILS & AUDIT LOGS DRAWER */}
      {/* ========================================================================= */}
      {isDetailsModalOpen && selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <span>🏅</span>
                  <span>Credential Details &amp; History</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedBadge.credentialId} &bull; Issued on {formatDisplayDate(selectedBadge.issueDate)}
                </p>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Quick Action Ribbon */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <a
                href={`/badge/${selectedBadge.credentialId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
              >
                🔗 View Public Badge
              </a>

              {selectedBadge.status === 'ACTIVE' && (
                <button
                  onClick={() => handleOpenSendEmailModal(selectedBadge)}
                  className="px-3 py-1.5 bg-[#FF9900] hover:bg-[#E68A00] text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                >
                  ✉ Send Badge by Email
                </button>
              )}

              <a
                href={`/api/digital-badges/pdf/${selectedBadge.credentialId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl transition-colors"
              >
                📄 Download PDF
              </a>

              <button
                onClick={() => copyToClipboard(selectedBadge.credentialUrl || getBadgeUrl(selectedBadge.credentialId), 'Badge URL')}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                📋 Copy Credential URL
              </button>

              <button
                onClick={() => copyToClipboard(selectedBadge.verificationUrl || getBadgeVerificationUrl(selectedBadge.credentialId), 'Verification URL')}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                ✓ Copy Verify URL
              </button>

              {selectedBadge.status === 'ACTIVE' ? (
                <button
                  onClick={() => {
                    setRevokeReason('');
                    setIsRevokeModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-colors ml-auto"
                >
                  Revoke Credential
                </button>
              ) : (
                <span className="px-3 py-1.5 bg-rose-100 text-rose-800 font-bold text-xs rounded-xl ml-auto">
                  ⚠ PERMANENTLY REVOKED
                </span>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Identity Section */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Identity Details</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block">Student Name:</span>
                    <span className="font-extrabold text-slate-900 text-sm">{selectedBadge.recipientName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Registered Email:</span>
                    <span className="font-mono text-slate-800">{selectedBadge.recipientEmail}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Badge Title:</span>
                    <span className="font-extrabold text-[#FF9900]">{selectedBadge.badgeTitle}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Credential ID:</span>
                    <span className="font-mono font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {selectedBadge.credentialId}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Current Status:</span>
                    <span className={`inline-block font-bold px-2 py-0.5 rounded ${
                      selectedBadge.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedBadge.status === 'ACTIVE' ? '✓ ACTIVE & VERIFIED' : `⚠ REVOKED: ${selectedBadge.revokedReason || ''}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Credential Section */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Credential Metadata</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block">Issue Date:</span>
                    <span className="font-medium text-slate-800">{formatDisplayDate(selectedBadge.issueDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Issuing Body:</span>
                    <span className="font-medium text-slate-800">{selectedBadge.issuerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Earning Criteria:</span>
                    <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] leading-relaxed">
                      {selectedBadge.earningCriteria}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Skills &amp; Competencies:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(selectedBadge.skills || []).map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded font-semibold text-[10px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Email Delivery History Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <span>✉</span>
                <span>Email Delivery History</span>
              </h4>

              {detailsLoading ? (
                <div className="py-6 text-center text-slate-400 text-xs">Loading email logs...</div>
              ) : badgeEmailLogs.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  No email deliveries recorded yet for this badge. Click "Send Badge by Email" to send the credential.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {badgeEmailLogs.map((log: any, idx: number) => {
                    const isSuccess = log.status === 'SENT' || log.status === 'DELIVERED';
                    return (
                      <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs hover:bg-slate-50">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            isSuccess ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isSuccess ? '✓ Sent' : '✕ Failed'}
                          </span>
                          <span className="font-mono text-slate-800">{log.recipient}</span>
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          <div>{new Date(log.timestamp).toLocaleString()}</div>
                          {log.messageId && <div className="font-mono text-[9px] text-slate-300">{log.messageId}</div>}
                          {log.error && <div className="text-rose-600 font-semibold">{log.error}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Activity & Verification Audit Logs */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <span>📜</span>
                <span>Audit &amp; Activity Log</span>
              </h4>

              {badgeEvents.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  No activity events recorded yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {badgeEvents.map((evt, idx) => (
                    <div key={idx} className="p-2.5 bg-white flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-800 uppercase text-[10px] bg-slate-100 px-1.5 py-0.5 rounded mr-2">
                          {evt.eventType}
                        </span>
                        <span className="text-slate-600 text-[11px]">
                          {evt.adminIdentity ? `By Admin: ${evt.adminIdentity}` : 'Public Verification Event'}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[10px] font-mono">
                        {new Date(evt.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: REVOKE BADGE CONFIRMATION */}
      {/* ========================================================================= */}
      {isRevokeModalOpen && selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-rose-200 space-y-5">
            <div className="flex items-center space-x-3 border-b border-slate-200 pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl font-bold">
                ⚠
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Revoke Digital Badge</h3>
                <p className="text-xs text-slate-500">Permanently retire this credential ID.</p>
              </div>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1">
              <p className="font-bold">Warning: This action is permanent and irreversible.</p>
              <p>
                Credential <code className="font-bold bg-white px-1 rounded">{selectedBadge.credentialId}</code> will show as REVOKED on the public verification page and can NEVER be reused.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Revocation Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Specify the authoritative reason for revoking this credential..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setIsRevokeModalOpen(false)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !revokeReason.trim()}
                onClick={handleRevokeBadge}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md disabled:opacity-50"
              >
                {actionLoading ? 'Revoking...' : 'Confirm Revoke ⚠'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
